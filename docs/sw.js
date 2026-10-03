/* PWA service worker — нужен только чтобы браузер разрешил
 * «Установить приложение» на домашний экран.
 * Намеренно БЕЗ кэширования: сеть и хранилище работают как раньше. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
