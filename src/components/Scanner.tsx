import { useCallback, useEffect, useRef, useState } from "react";
import { createNativeDetector, decodePixels, pickProductCode } from "../lib/scannerDetector";
import { Btn, noSuggest } from "./ui";

/** Кадр для JS-декодера уменьшаем: так ZXing успевает разбирать каждый кадр. */
const LIVE_WIDTH = 800;
/** Фото с телефона большое — перед разбором ужимаем до разумного размера. */
const PHOTO_MAX = 1600;
/** Раз в ~1.2 с разбираем кадр ещё и по областям: код может быть не по центру. */
const DEEP_SCAN_EVERY = 1200;

export default function Scanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const done = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [slow, setSlow] = useState(false);

  /** Код найден: вибрируем, глушим камеру и отдаём номер продукта наверх. */
  const finish = useCallback(
    (code: string) => {
      if (done.current) return true;
      done.current = true;
      try {
        navigator.vibrate?.(60);
      } catch {
        /* noop */
      }
      stopRef.current?.();
      onDetect(code);
      return true;
    },
    [onDetect],
  );

  /** Ниже — уже разобранный код (GTIN), повторно фильтровать его не нужно. */
  const accept = useCallback(
    (code: string, rawForWarning = code) => {
      if (!code) {
        setWarn(`В коде «${rawForWarning.slice(0, 36)}${rawForWarning.length > 36 ? "…" : ""}» нет номера товара. Наведи на штрихкод или QR с кодом продукта.`);
        return false;
      }
      setWarn(null);
      return finish(code);
    },
    [finish],
  );
  // Callback обновляется при ререндерах формы продукта. Читаем его через ref,
  // чтобы это не перезапускало поток камеры и не сбрасывало авто-сканирование.
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  /* ---------- живое видео: нативный BarcodeDetector + ZXing на каждом кадре ---------- */
  useEffect(() => {
    done.current = false;
    let cancelled = false;
    let frameTimer = 0;
    let stream: MediaStream | null = null;
    setSlow(false);
    setTorchOn(false);
    setHasTorch(false);
    // Если за 8 секунд активного сканирования код так и не найден — скорее
    // всего дело в плохом свете/фокусе/отражении, и дальше ждать смысла
    // немного: подсказываем более надёжный путь — снять фото и разобрать его.
    const slowTimer = window.setTimeout(() => {
      if (!cancelled && !done.current) setSlow(true);
    }, 8000);

    async function start() {
      setStarting(true);
      setError(null);
      try {
        if (!window.isSecureContext) throw new Error("insecure-context");
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera-unavailable");
        // Полный HD тут не нужен: 720p хватает с обычной дистанции, а кадры
        // обрабатываются заметно быстрее.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setHasTorch(!!caps.torch);

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStarting(false);

        const detector = await createNativeDetector();
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        let lastDeepScan = 0;
        const tick = async () => {
          if (cancelled || done.current) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth) {
            let frameCodes: Array<{ rawValue: string; format?: string | number }> = [];
            if (detector) {
              try {
                frameCodes = await detector.detect(video);
              } catch {
                // Сломанный нативный детектор не должен выключать сканер —
                // кадр ниже разберёт ZXing.
                frameCodes = [];
              }
            }
            if (cancelled || done.current) return;
            const nativeCode = pickProductCode(frameCodes);
            if (nativeCode) return void acceptRef.current(nativeCode);

            if (context) {
              const scale = Math.min(1, LIVE_WIDTH / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frame = context.getImageData(0, 0, canvas.width, canvas.height);
              const now = performance.now();
              const deep = now - lastDeepScan >= DEEP_SCAN_EVERY;
              if (deep) lastDeepScan = now;
              const results = decodePixels(frame.data, canvas.width, canvas.height, deep ? { multiple: true } : {});
              if (cancelled || done.current) return;
              const zxingCode = pickProductCode(results.map((r) => ({ rawValue: r.getText(), format: r.getBarcodeFormat() })));
              if (zxingCode) return void acceptRef.current(zxingCode);
            }

            // В кадре что-то было (например, рекламный QR без номера товара) —
            // подсказываем, что именно не так, но продолжаем сканировать.
            if (frameCodes.length) acceptRef.current("", frameCodes[0].rawValue);
          }
          if (!cancelled && !done.current) frameTimer = window.setTimeout(tick, 150);
        };
        void tick();
      } catch (e: any) {
        if (cancelled) return;
        setStarting(false);
        setError(
          e?.message === "insecure-context"
            ? "Живое сканирование требует HTTPS. Открой защищённую ссылку приложения."
            : e?.name === "NotAllowedError"
              ? "Нет доступа к камере. Разреши его в настройках браузера и снова открой сканер."
              : "Живая камера недоступна в этом окне. Открой приложение в Safari или Chrome.",
        );
      }
    }

    start();
    const stop = () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(frameTimer);
      stream?.getTracks().forEach((t) => t.stop());
      if (streamRef.current === stream) streamRef.current = null;
    };
    stopRef.current = stop;
    return stop;
  }, [facing]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn((v) => !v);
    } catch {
      setHasTorch(false);
    }
  }

  /* ---------- фото с камеры телефона / из галереи ---------- */
  async function decodeFile(file: File) {
    setBusy(true);
    setWarn(null);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        // По фото скорость не важна, а точность важнее: TRY_HARDER и разбор
        // по областям — штрихкод может быть в углу снимка.
        const results = decodePixels(pixels.data, canvas.width, canvas.height, { tryHarder: true, multiple: true });
        const code = pickProductCode(results.map((r) => ({ rawValue: r.getText(), format: r.getBarcodeFormat() })));
        if (code) {
          accept(code);
          return;
        }
      }

      // Второй шанс — нативный детектор: он декодирует иначе и иногда видит
      // то, что пропустил ZXing.
      const detector = await createNativeDetector();
      if (detector) {
        const codes = await detector.detect(img).catch(() => []);
        const code = pickProductCode(codes ?? []);
        if (code) {
          accept(code);
          return;
        }
      }
      setWarn("На фото не нашёлся штрихкод. Сними ближе, ровно и без бликов — или введи цифры под кодом вручную.");
    } catch {
      setWarn("Не получилось прочитать фото. Попробуй другой снимок или введи цифры под кодом вручную.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />
        {!error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-24 w-[80%] rounded-xl border-2 border-acc/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]">
              {!starting && <span className="scan-beam absolute inset-x-2 top-2 h-px bg-acc2 shadow-[0_0_8px_2px_rgba(45,212,191,0.8)]" />}
            </div>
          </div>
        )}
        {!error && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`grid size-9 place-items-center rounded-full border border-white/20 text-sm backdrop-blur ${
                  torchOn ? "bg-warn/80 text-ink" : "bg-black/50"
                }`}
              >
                🔦
              </button>
            )}
            <button
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/50 text-sm backdrop-blur"
            >
              🔄
            </button>
          </div>
        )}
        {!error && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center px-2">
            <span className="rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-center text-[11px] text-white/90">
              {starting ? "Подключаем камеру…" : "Автосканирование · наведите код"}
            </span>
          </div>
        )}
        {error && <div className="absolute inset-0 grid place-items-center bg-ink/90 p-5 text-center text-xs text-mute">{error}</div>}
      </div>

      <p className="text-center text-[11px] leading-snug text-mute">
        Сканирование идёт прямо по видео — фото делать не нужно. Наведи на штрихкод или QR с номером товара (GTIN); ссылки и чеки товарного номера не содержат.
      </p>

      {slow && !warn && !error && (
        <div className="rounded-xl border border-acc2/30 bg-acc2/10 px-3 py-2 text-[11px] leading-snug text-acc2">
          Код пока не распознан? Проверь резкость и освещение или используй фото как запасной вариант.
        </div>
      )}
      {warn && <div className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] leading-snug text-warn">{warn}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && decodeFile(e.target.files[0])}
      />
      {(error || slow) && (
        <Btn variant="soft" size="sm" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Распознаём фото…" : "Резерв: сделать снимок или выбрать фото"}
        </Btn>
      )}

      <div className="flex gap-2">
        <input
          className="field compact min-w-0 flex-1"
          {...noSuggest}
          aria-label="Штрихкод или содержимое QR"
          placeholder="Штрихкод или текст QR"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Btn size="sm" className="shrink-0 px-4" disabled={!manual.trim() || busy} onClick={() => accept(pickProductCode([{ rawValue: manual }]) ?? "", manual)}>
          Найти
        </Btn>
      </div>

      <Btn variant="ghost" size="sm" className="w-full" onClick={onClose}>
        Отмена
      </Btn>
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
