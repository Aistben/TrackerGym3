import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Btn } from "./ui";

export default function Scanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
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
              done.current = true;
              try {
                navigator.vibrate?.(60);
              } catch {
                /* noop */
              }
              controls?.stop();
              onDetect(result.getText());
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
      <p className="text-center text-xs text-mute">Наведи камеру на штрихкод продукта</p>
      <div className="flex gap-2">
        <input
          className="field"
          inputMode="numeric"
          placeholder="Штрихкод вручную, напр. 4600494561238"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
        />
        <Btn disabled={manual.length < 6} onClick={() => onDetect(manual)}>
          Найти
        </Btn>
      </div>
      <Btn variant="ghost" className="w-full" onClick={onClose}>
        Отмена
      </Btn>
    </div>
  );
}
