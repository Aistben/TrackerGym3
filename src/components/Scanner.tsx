import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { extractBarcode } from "../lib/barcode";
import { Btn } from "./ui";

export default function Scanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [warn, setWarn] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

    (async () => {
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } },
          videoRef.current!,
          (result) => {
            if (result && !done.current) {
              const raw = result.getText();
              const code = extractBarcode(raw);
              if (!code) {
                // QR со ссылкой на сайт/промо — товара в нём нет
                setWarn(
                  `Считан код «${raw.slice(0, 40)}${raw.length > 40 ? "…" : ""}» — в нём нет номера товара. Наведи на полосатый штрихкод (EAN-13).`,
                );
                return;
              }
              done.current = true;
              try {
                navigator.vibrate?.(60);
              } catch {
                /* noop */
              }
              controls?.stop();
              onDetect(code);
            }
          },
        );
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "Доступ к камере запрещён. Разреши камеру в браузере или введи штрихкод вручную."
            : "Камера недоступна на этом устройстве. Введи штрихкод вручную.",
        );
      }
    })();

    return () => controls?.stop();
  }, [onDetect]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-28 w-[78%] rounded-xl border-2 border-acc/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {error && (
          <div className="absolute inset-0 grid place-items-center bg-ink/85 p-6 text-center text-sm text-mute">{error}</div>
        )}
      </div>
      {warn && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{warn}</div>}
      <p className="text-center text-xs text-mute">
        Наведи камеру на штрихкод продукта (EAN-13 / EAN-8 / UPC). QR распознаётся, если в нём зашит номер товара.
      </p>
      <div className="flex gap-2">
        <input
          className="field"
          inputMode="numeric"
          placeholder="Штрихкод вручную, напр. 4600494561238"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
        />
        <Btn disabled={manual.length < 6} onClick={() => onDetect(extractBarcode(manual) ?? manual)}>
          Найти
        </Btn>
      </div>
      <Btn variant="ghost" className="w-full" onClick={onClose}>
        Отмена
      </Btn>
    </div>
  );
}
