import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProfileView from "../src/components/ProfileView";
import { emptyState } from "../src/lib/storage";
import { computeTargets } from "../src/lib/nutrition";
import type { Profile } from "../src/lib/types";

const profile: Profile = { name: "", sex: "male", age: 30, height: 180, startWeight: 80,
  activity: "moderate", goal: "gain", startDate: "2026-01-01", profileSettingsLocked: false };
function render(p: Profile) {
  return renderToStaticMarkup(React.createElement(ProfileView, {
    state: { ...emptyState, profile: p }, setState: () => undefined,
    targets: computeTargets(p, 80), currentWeight: 80,
  }));
}
test("профиль: единая сетка параметров и все основные действия доступны", () => {
  const html = render(profile);
  for (const text of ["profile-parameters", "Возраст", "Рост", "Вес", "Активность", "Цель питания", "Белки", "Жиры", "Углеводы", "Сохранить копию", "Загрузить копию", "Скопировать мои продукты", "Сбросить все данные"]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/type="number"/g) ?? []).length, 3);
  assert.ok(html.includes("Как считается норма"));
});
test("замок скрывает редактирование, но оставляет читаемую норму и резервные копии", () => {
  const html = render({ ...profile, profileSettingsLocked: true });
  assert.ok(html.includes("Норма на день"));
  assert.ok(html.includes("По формуле"));
  assert.ok(html.includes("Сохранить копию"));
  assert.ok(!html.includes("profile-parameters"));
  assert.ok(!html.includes("Настроить БЖУ"));
});
test("ручной режим явно подписан и имеет возврат к формуле", () => {
  const html = render({ ...profile, macroTargets: { protein: 160, fat: 70, carbs: 300 } });
  assert.ok(html.includes("Вручную"));
  assert.ok(html.includes("По цели"));
  assert.ok(html.includes("БЖУ фиксированы"));
});

test("цели содержат прежние значки и отдельные подписи без смешивания текста", () => {
  const html = render(profile);
  assert.equal((html.match(/class="profile-goal-icon"/g) ?? []).length, 3);
  assert.equal((html.match(/class="profile-goal-label"/g) ?? []).length, 3);
  for (const icon of ["🔥", "⚖️", "🍚"]) assert.ok(html.includes(icon));
  for (const label of ["Похудение", "Поддержание", "Набор массы"]) assert.ok(html.includes(label));
  assert.ok(html.includes('class="profile-goal is-selected"'));
});
