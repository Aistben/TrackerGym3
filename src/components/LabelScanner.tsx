import { useRef, useState } from "react";
import { Btn } from "./ui";
import { parseNutritionLabel, type LabelValues } from "../lib/nutritionLabel";

/**
 * Фото с телефона легко весит 10-12+ мегапикселей — Tesseract разбирает его
 * целую вечность (и точность от лишних пикселей не растёт, только от шума и
 * смаза). Уменьшаем длинную сторону до разумного предела и слегка повышаем
 * контраст/ч-б — распознаётся заметно быстрее и как минимум не хуже.
 */
async function prepareForOcr(file: File, maxSide = 1600): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = "grayscale(1) contrast(1.35)";
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function LabelScanner({ onRead }: { onRead: (values: LabelValues) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function recognize(file: File) {
    setBusy(true);
    setProgress(0);
    setMessage("Уменьшаем фото…");
    try {
      const image = await prepareForOcr(file);
      setMessage("Подготавливаем распознавание…");
      const { createWorker } = await import("tesseract.js");
      let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
      try {
        worker = await createWorker("rus+eng", 1, {
          logger: (event) => {
            if (event.status === "recognizing text") {
              setProgress(Math.round((event.progress || 0) * 100));
              setMessage("Читаем таблицу на упаковке…");
            }
          },
        });
        const result = await worker.recognize(image);
        const values = parseNutritionLabel(result.data.text);
        const count = Object.keys(values).length;
        if (!count) {
          setMessage("Не удалось разобрать БЖУ. Сними таблицу ровно, крупно и без бликов.");
        } else {
          onRead(values);
          setMessage(`Распознано полей: ${count}. Обязательно проверь цифры перед сохранением.`);
        }
      } finally {
        await worker?.terminate().catch(() => undefined);
      }
    } catch {
      setMessage("Распознавание не загрузилось. Проверь интернет и попробуй ещё раз.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-acc2/25 bg-acc2/8 px-3 py-2.5">
      <div className="text-[13px] font-semibold">📷 БЖУ по фото этикетки</div>
      <p className="mt-0.5 mb-2 text-[11px] leading-snug text-mute">
        Сними крупно таблицу «на 100 г» — поля заполнятся сами (рус/англ).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => event.target.files?.[0] && recognize(event.target.files[0])}
      />
      <Btn variant="soft" size="sm" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? `${message} ${progress ? progress + "%" : ""}` : "Снять этикетку / выбрать фото"}
      </Btn>
      {message && !busy && <div className="mt-1.5 text-[11px] leading-snug text-acc2">{message}</div>}
    </div>
  );
}
