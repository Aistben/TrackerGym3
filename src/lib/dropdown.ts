/**
 * Геометрия выпадающего списка (см. Select в components/ui.tsx).
 *
 * Список раскрывается только ВНИЗ от своего поля: вверх он не
 * «переворачивается», иначе непонятно, к какому полю относится выбор.
 * Место под полем считаем до нижней навигации; если поле прижато к самому
 * низу экрана — списку разрешено зайти на навигацию (z-index списка выше),
 * но не дальше нижнего края экрана.
 */

export const DROPDOWN_GAP = 6;
export const DROPDOWN_GUTTER = 8;
export const DROPDOWN_MAX_HEIGHT = 320;
/** Минимальная высота списка: ниже показываем хотя бы пару пунктов с прокруткой. */
export const DROPDOWN_MIN_HEIGHT = 72;
/** Меньше этого места под полем — списку разрешаем зайти на футер. */
export const DROPDOWN_MIN_ROOM = 140;
/** Высота пункта с подписью-подсказкой — по ней оцениваем желаемую высоту меню. */
export const OPTION_HEIGHT = 62;

export type DropRect = { top: number; left: number; width: number; maxHeight: number };
type Trigger = { top: number; bottom: number; left: number; width: number };

/** Высота, при которой все пункты видны без внутренней прокрутки. */
export function dropdownWantedHeight(optionsCount: number) {
  return Math.min(DROPDOWN_MAX_HEIGHT, optionsCount * OPTION_HEIGHT + 10);
}

export function dropdownPlacement({
  trigger,
  viewport,
  navTop,
}: {
  trigger: Trigger;
  viewport: { width: number; height: number };
  /** Верх футера-навигации (document.querySelector("[data-bottom-nav]")). */
  navTop: number;
}): DropRect {
  const belowNav = navTop - trigger.bottom - DROPDOWN_GAP;
  const belowScreen = viewport.height - trigger.bottom - DROPDOWN_GAP;
  const room = belowNav >= DROPDOWN_MIN_ROOM ? belowNav : Math.max(belowNav, belowScreen);
  const width = Math.min(trigger.width, viewport.width - DROPDOWN_GUTTER * 2);
  const left = Math.max(DROPDOWN_GUTTER, Math.min(trigger.left, viewport.width - width - DROPDOWN_GUTTER));
  return {
    top: trigger.bottom + DROPDOWN_GAP,
    left,
    width,
    maxHeight: Math.max(DROPDOWN_MIN_HEIGHT, Math.min(DROPDOWN_MAX_HEIGHT, room)),
  };
}

/**
 * Сколько пикселей подкрутить страницу вверх (scrollBy), чтобы список
 * раскрылся вниз целиком. 0 — места хватает и так.
 */
export function dropdownScrollDelta({
  trigger,
  navTop,
  optionsCount,
}: {
  trigger: Trigger;
  navTop: number;
  optionsCount: number;
}) {
  const wanted = dropdownWantedHeight(optionsCount) - (navTop - trigger.bottom - DROPDOWN_GAP);
  return Math.max(0, Math.round(wanted));
}
