/**
 * Копирование текста в буфер обмена и сохранение его файлом.
 *
 * Основной путь — Clipboard API, но у него не всегда есть доступ: в приватном
 * режиме браузера, во встроенных браузерах мессенджеров и при запрете
 * разрешения он либо отсутствует, либо бросает ошибку. Поэтому ниже есть
 * запасной путь через скрытое поле ввода и `document.execCommand("copy")`,
 * а если и он не сработал — вызывающий код предложит скачать файл.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* нет разрешения или нет защищённого контекста — пробуем запасной путь */
  }
  return legacyCopy(text);
}

/** Запасной путь: выделяем текст в невидимом поле и просим браузер скопировать. */
export function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);

  const selection = typeof document.getSelection === "function" ? document.getSelection() : null;
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  let copied = false;
  try {
    area.select();
    area.setSelectionRange(0, area.value.length);
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  area.remove();
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return copied;
}

/**
 * Сохранение текста файлом .txt — на случай, когда браузер не дал скопировать
 * в буфер (тогда рацион всё равно можно забрать себе и отправить кому нужно).
 */
export function downloadTextFile(fileName: string, text: string): boolean {
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return false;

  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
