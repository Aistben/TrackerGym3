import assert from "node:assert/strict";
import test from "node:test";
import {
  DROPDOWN_MAX_HEIGHT,
  dropdownPlacement,
  dropdownScrollDelta,
  dropdownWantedHeight,
} from "../src/lib/dropdown";

// Экран телефона: 390×780, нижняя навигация занимает последние 76 px.
const viewport = { width: 390, height: 780 };
const navTop = 780 - 76;

function trigger(top: number, height = 56, left = 16, width = 358) {
  return { top, bottom: top + height, left, width };
}

test("список всегда раскрывается вниз от поля, а не вверх", () => {
  // Поле у самого низа экрана — раньше список «переворачивался» вверх.
  const nearBottom = dropdownPlacement({ trigger: trigger(690), viewport, navTop });
  assert.equal(nearBottom.top, 690 + 56 + 6, "верх списка — сразу под полем");
  assert.ok(nearBottom.top > 690, "список ниже поля");

  const inMiddle = dropdownPlacement({ trigger: trigger(400), viewport, navTop });
  assert.equal(inMiddle.top, 400 + 56 + 6);

  const nearTop = dropdownPlacement({ trigger: trigger(60), viewport, navTop });
  assert.equal(nearTop.top, 60 + 56 + 6);
});

test("ширина списка — на всю ширину поля, без выхода за экран", () => {
  const full = dropdownPlacement({ trigger: trigger(300), viewport, navTop });
  assert.equal(full.width, 358, "ширина меню равна ширине поля");
  assert.equal(full.left, 16);

  // Поле шире экрана — список подрезается по краям, но не уезжает.
  const wide = dropdownPlacement({ trigger: trigger(300, 56, -20, 460), viewport, navTop });
  assert.equal(wide.width, 390 - 16);
  assert.equal(wide.left, 8);
});

test("высота списка ограничена местом до футера, но пункты видны", () => {
  const roomy = dropdownPlacement({ trigger: trigger(200), viewport, navTop });
  assert.equal(roomy.maxHeight, DROPDOWN_MAX_HEIGHT, "на большом экране — до 320 px");

  // Поле вплотную к футеру: над ним остаётся всего 30 px, список получает
  // больше места за счёт того, что рисуется поверх навигации.
  const tight = dropdownPlacement({ trigger: trigger(navTop - 30), viewport, navTop });
  assert.ok(tight.maxHeight > 30, "список не схлопывается в полоску");
  assert.ok(tight.maxHeight <= viewport.height - (navTop - 30 + 6) + 1, "но не выходит за нижний край экрана");
});

test("прокрутка освобождает место под списком и не дёргает страницу зря", () => {
  const optionsCount = 5; // «Активность»: 5 пунктов с подписями
  const wanted = dropdownWantedHeight(optionsCount);
  assert.ok(wanted > 0 && wanted <= DROPDOWN_MAX_HEIGHT);

  // Поле сверху — места хватает, прокрутка не нужна.
  assert.equal(dropdownScrollDelta({ trigger: trigger(60), navTop, optionsCount }), 0);

  // Поле у футера — прокручиваем ровно столько, сколько не хватает.
  const low = trigger(navTop - 40);
  const missing = wanted - (navTop - low.bottom - 6);
  assert.equal(dropdownScrollDelta({ trigger: low, navTop, optionsCount }), Math.max(0, Math.round(missing)));
  assert.ok(missing > 0);
});
