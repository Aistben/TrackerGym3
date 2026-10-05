import assert from "node:assert/strict";
import test from "node:test";
import { copyText } from "../src/lib/clipboard";

/**
 * Подменяем navigator/document так, как это выглядит в браузере.
 * Через defineProperty: в Node `navigator` объявлен только геттером,
 * обычное присваивание в строгом режиме упало бы.
 */
async function withBrowser<T>(
  browser: { navigator?: unknown; document?: unknown },
  run: () => T | Promise<T>,
): Promise<Awaited<T>> {
  const before = {
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
  };
  const define = (key: "navigator" | "document", value: unknown) =>
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const restore = (key: "navigator" | "document") => {
    const descriptor = before[key];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as any)[key];
  };

  try {
    if ("navigator" in browser) define("navigator", browser.navigator);
    if ("document" in browser) define("document", browser.document);
    return await run();
  } finally {
    restore("navigator");
    restore("document");
  }
}

/** Минимальная заглушка страницы: поле ввода и «execCommand». */
function documentStub(command: (() => boolean) | undefined) {
  const area: any = {
    value: "",
    style: {},
    setAttribute() {},
    select() {},
    setSelectionRange() {},
    remove() {},
  };
  const commands: string[] = [];
  const document = {
    createElement: () => area,
    body: { appendChild() {} },
    getSelection: () => null,
    execCommand: command
      ? (name: string) => {
          commands.push(name);
          return command();
        }
      : undefined,
  };
  return { area, commands, document };
}

test("текст уходит в буфер обмена через Clipboard API", async () => {
  const written: string[] = [];
  const ok = await withBrowser(
    { navigator: { clipboard: { writeText: async (text: string) => void written.push(text) } }, document: undefined },
    () => copyText("Рацион за день"),
  );

  assert.equal(ok, true);
  assert.deepEqual(written, ["Рацион за день"]);
});

test("если браузер запретил Clipboard API, работает запасной путь через поле ввода", async () => {
  const { area, commands, document } = documentStub(() => true);
  const ok = await withBrowser(
    {
      navigator: {
        clipboard: {
          writeText: async () => {
            throw new Error("NotAllowedError");
          },
        },
      },
      document,
    },
    () => copyText("Рацион за день"),
  );

  assert.equal(ok, true);
  assert.deepEqual(commands, ["copy"]);
  assert.equal(area.value, "Рацион за день", "в поле для копирования должен лежать весь текст");
});

test("без Clipboard API копирует всё тот же запасной путь", async () => {
  const { area, commands, document } = documentStub(() => true);
  const ok = await withBrowser({ navigator: {}, document }, () => copyText("Норма в день"));

  assert.equal(ok, true);
  assert.deepEqual(commands, ["copy"]);
  assert.equal(area.value, "Норма в день");
});

test("если и запасной путь не сработал, честно сообщаем о неудаче", async () => {
  const { document } = documentStub(undefined);
  const ok = await withBrowser({ navigator: {}, document }, () => copyText("текст"));
  assert.equal(ok, false);
});
