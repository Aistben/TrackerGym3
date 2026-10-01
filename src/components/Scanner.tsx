import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { extractBarcode } from "../lib/barcode";
import { Btn } from "./ui";

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code", "data_matrix"];

function makeReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
}

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

  const accept = useCallback(
    (raw: string) => {
      const code = extractBarcode(raw);
      if (!code) {
        setWarn(`В коде «${raw.slice(0, 36)}${raw.length > 36 ? "…" : ""}» нет номера товара. Наведи на полосатый штрихкод.`);
        return false;
      }
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

  /* ---------- живое видео: нативный BarcodeDetector, иначе ZXing ---------- */
  useEffect(() => {
    done.current = false;
    let cancelled = false;
    let raf = 0;
    let zxControls: { stop: () => void } | undefined;

    async function start() {
      setStarting(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
        await video.play().catch(() => undefined);
        setStarting(false);

        const Native = (window as any).BarcodeDetector;
        if (Native) {
          const detector = new Native({ formats: NATIVE_FORMATS });
          const tick = async () => {
            if (cancelled || done.current) return;
            try {
              const codes = await detector.detect(video);
              if (codes?.length) accept(codes[0].rawValue);
            } catch {
              /* кадр не разобрали — пробуем следующий */
            }
            raf = requestAnimationFrame(() => setTimeout(tick, 120) as unknown as number);
          };
          tick();
        } else {
          const reader = makeReader();
          zxControls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) accept(result.getText());
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setStarting(false);
        setError(
          e?.name === "NotAllowedError"
            ? "Браузер не дал доступ к камере. Разреши камеру для сайта — или сними штрихкод камерой телефона кнопкой ниже."
            : "Живое видео недоступно (часто так во встроенном окне). Сними штрихкод камерой телефона кнопкой ниже.",
        );
      }
    }

    start();
    stopRef.current = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      zxControls?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    return () => stopRef.current?.();
  }, [facing, accept]);

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
      const Native = (window as any).BarcodeDetector;
      if (Native) {
        const img = await loadImage(url);
        const codes = await new Native({ formats: NATIVE_FORMATS }).detect(img).catch(() => []);
        if (codes?.length && accept(codes[0].rawValue)) return;
      }
      const result = await makeReader().decodeFromImageUrl(url);
      accept(result.getText());
    } catch {
      setWarn("На фото не нашёлся штрихкод. Сними ближе, ровно и без бликов — или введи цифры под кодом вручную.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-black sm:aspect-[4/3]">
        <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />
        {!error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-32 w-[82%] rounded-xl border-2 border-acc/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]" />
          </div>
        )}
        {!error && (
          <div className="absolute top-2 right-2 flex gap-2">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`grid size-10 place-items-center rounded-full border border-white/20 backdrop-blur ${
                  torchOn ? "bg-warn/80 text-ink" : "bg-black/50"
                }`}
              >
                🔦
              </button>
            )}
            <button
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/50 backdrop-blur"
            >
              🔄
            </button>
          </div>
        )}
        {starting && !error && (
          <div className="absolute inset-x-0 bottom-3 text-center text-xs text-white/70">включаем камеру…</div>
        )}
        {error && <div className="absolute inset-0 grid place-items-center bg-ink/90 p-6 text-center text-sm text-mute">{error}</div>}
      </div>

      <p className="text-center text-xs text-mute">
        Наведи на полосатый штрихкод (EAN-13 / EAN-8 / UPC). QR тоже читается, если в нём зашит номер товара.
      </p>

      {warn && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{warn}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && decodeFile(e.target.files[0])}
      />
      <Btn variant="soft" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Распознаём фото…" : "📸 Снять камерой телефона / выбрать фото"}
      </Btn>

      <div className="flex gap-2">
        <input
          className="field"
          inputMode="numeric"
          placeholder="Или цифры под кодом: 4600494561238"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
        />
        <Btn disabled={manual.length < 6} onClick={() => accept(manual)}>
          Найти
        </Btn>
      </div>

      <Btn variant="ghost" className="w-full" onClick={onClose}>
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
