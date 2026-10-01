import { useRef, useState } from "react";
import { Btn } from "./ui";
import { parseNutritionLabel, type LabelValues } from "../lib/nutritionLabel";

export default function LabelScanner({ onRead }: { onRead: (values: LabelValues) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function recognize(file: File) {
    setBusy(true);
    setProgress(0);
    setMessage("Подготавливаем распознавание…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("rus+eng", 1, {
        logger: (event) => {
          if (event.status === "recognizing text") {
            setProgress(Math.round((event.progress || 0) * 100));
            setMessage("Читаем таблицу на упаковке…");
          }
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      const values = parseNutritionLabel(result.data.text);
      const count = Object.keys(values).length;
      if (!count) {
        setMessage("Не удалось разобрать БЖУ. Сними таблицу ровно, крупно и без бликов.");
      } else {
        onRead(values);
        setMessage(`Распознано полей: ${count}. Обязательно проверь цифры перед сохранением.`);
      }
    } catch {
      setMessage("Распознавание не загрузилось. Проверь интернет и попробуй ещё раз.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-acc2/25 bg-acc2/8 p-3">
      <div className="mb-1 text-sm font-semibold">📷 Заполнить БЖУ по фотографии</div>
      <p className="mb-3 text-xs leading-relaxed text-mute">
        Сфотографируй крупно таблицу пищевой ценности «на 100 г». Распознавание работает на русском и английском.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => event.target.files?.[0] && recognize(event.target.files[0])}
      />
      <Btn variant="soft" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? `${message} ${progress ? progress + "%" : ""}` : "Снять этикетку / выбрать фото"}
      </Btn>
      {message && !busy && <div className="mt-2 text-xs leading-relaxed text-acc2">{message}</div>}
    </div>
  );
}
