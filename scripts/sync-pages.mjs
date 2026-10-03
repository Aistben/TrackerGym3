/**
 * Сборка docs/ для GitHub Pages: single-file index.html плюс манифест, иконки
 * и service worker. Без этих файлов установленное с Pages приложение остаётся
 * без своего манифеста и иконки на домашнем экране.
 *
 * Запуск: npm run build:pages
 */
import { copyFileSync, cpSync, mkdirSync } from "node:fs";

mkdirSync("docs", { recursive: true });
copyFileSync("dist/index.html", "docs/index.html");
cpSync("dist/icons", "docs/icons", { recursive: true });
copyFileSync("dist/manifest.webmanifest", "docs/manifest.webmanifest");
copyFileSync("dist/sw.js", "docs/sw.js");
console.log("docs/ обновлён из dist/");
