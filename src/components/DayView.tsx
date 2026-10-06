import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Meal, MealEntry, Product, Targets } from "../lib/types";
import { dayTotals, entryTotals, humanDate, round, shiftDate, sumTotals, today } from "../lib/nutrition";
import { uid } from "../lib/storage";
import {
  addBasketItem,
  basketEntryForMeal,
  basketForDate,
  makeBasketItem,
  removeBasketItem,
} from "../lib/basket";
import type { BasketItem } from "../lib/types";
import { sameBarcode } from "../lib/barcode";
import { buildDayRationText, dayTextFileName } from "../lib/dayText";
import { copyText, downloadTextFile } from "../lib/clipboard";
import { Bar, Btn, Empty, Field, IconBtn, Ring, Sheet, noSuggest, numField } from "./ui";
import AddFood from "./AddFood";

type EntryAction = { mealId: string; mealTitle: string; entry: MealEntry };

export default function DayView({
  state,
  setState,
  targets,
  date,
  setDate,
  scanRequest,
  onScanRequestHandled,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  targets: Targets;
  date: string;
  setDate: (d: string) => void;
  /** счётчик: кнопка «Сканировать» на главном экране поднимает его на 1 */
  scanRequest: number;
  onScanRequestHandled: () => void;
}) {
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [addMode, setAddMode] = useState<"search" | "scan">("search");
  const [newMeal, setNewMeal] = useState(false);
  const [timePick, setTimePick] = useState<Meal | null>(null);
  const [editEntry, setEditEntry] = useState<EntryAction | null>(null);
  const [moveEntry, setMoveEntry] = useState<EntryAction | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null);
  /** Меню «⋮» на карточке приёма: дублирование и удаление */
  const [mealMenu, setMealMenu] = useState<Meal | null>(null);
  /** Продукт, который свайпом попросили удалить — ждём подтверждения */
  const [pendingDelete, setPendingDelete] = useState<EntryAction | null>(null);
  /** Корзина дня открыта: продукты, перенесённые на этот день, ждут раскладки */
  const [basketOpen, setBasketOpen] = useState(false);
  /** Продукт, который сейчас тащат пальцем из корзины (и где палец) */
  const [carry, setCarry] = useState<{ item: BasketItem; x: number; y: number } | null>(null);
  /** Карточка приёма под пальцем — подсвечиваем её как цель переноса */
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const carryRef = useRef<{ item: BasketItem; x: number; y: number } | null>(null);
  carryRef.current = carry;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ mealId: string; entryId: string; grams: number } | null>(null);
  /** Открытая свайпом строка продукта: id и сторона */
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null);
  const [tempMealId, setTempMealId] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<{ product: Product; grams: number } | null>(null);
  const [addStep, setAddStep] = useState<"search" | "scan" | "form" | "portion">("search");
  const noticeTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const meals = useMemo(
    () => state.meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [state.meals, date],
  );
  const visibleMeals = useMemo(() => {
    if (!preview) return meals;
    return meals.map((meal) =>
      meal.id === preview.mealId
        ? { ...meal, entries: meal.entries.map((entry) => (entry.id === preview.entryId ? { ...entry, grams: preview.grams } : entry)) }
        : meal,
    );
  }, [meals, preview]);
  const baseTotals = dayTotals(visibleMeals);
  const totals = useMemo(() => {
    if (!draftPreview) return baseTotals;
    const k = draftPreview.grams / 100;
    const p = draftPreview.product;
    return {
      kcal: baseTotals.kcal + p.kcal * k,
      protein: baseTotals.protein + p.protein * k,
      fat: baseTotals.fat + p.fat * k,
      carbs: baseTotals.carbs + p.carbs * k,
    };
  }, [baseTotals, draftPreview]);
  const left = Math.max(0, targets.calories - totals.kcal);
  const hasOverlay = !!(
    addTo ||
    newMeal ||
    timePick ||
    editEntry ||
    moveEntry ||
    deleteMeal ||
    calendarOpen ||
    mealMenu ||
    pendingDelete ||
    basketOpen ||
    carry
  );

  const handlePortionPreview = useCallback(
    (preview: { product: Product; grams: number } | null) => setDraftPreview(preview),
    [],
  );
  const handleAddModeChange = useCallback(
    (step: "search" | "scan" | "form" | "portion") => setAddStep(step),
    [],
  );

  const update = (fn: (ms: Meal[]) => Meal[]) => setState((s) => ({ ...s, meals: fn(s.meals) }));

  function notify(message: string) {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1200);
  }

  /** Рацион дня текстом: норму берём ту, что стоит в настройках профиля. */
  function dayRationText() {
    return buildDayRationText({ date, meals: visibleMeals, targets, name: state.profile?.name });
  }

  async function copyDayRation() {
    const text = dayRationText();
    if (await copyText(text)) {
      notify("Рацион скопирован — можно вставлять");
      return;
    }
    // Буфера нет (приватный режим, встроенный браузер мессенджера) — отдаём файлом,
    // чтобы рацион всё равно можно было забрать себе и отправить.
    if (downloadTextFile(dayTextFileName(date), text)) notify("Буфер недоступен — сохранили файл .txt");
    else notify("Не получилось скопировать рацион");
  }

  function downloadDayRation() {
    downloadTextFile(dayTextFileName(date), dayRationText());
    notify("Рацион сохранён файлом .txt");
  }

  useEffect(() => {
    return () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  // Плавающая кнопка сразу включает сканер. Создаём временный приём на сегодня
  // и на время нажатия; при отмене пустая карточка удаляется, после добавления
  // продукта она остаётся в дневнике.
  useEffect(() => {
    if (!scanRequest) return;
    onScanRequestHandled();
    startQuickScan();
  }, [scanRequest, onScanRequestHandled]);

  function addMeal(title: string, time: string, day = date): Meal {
    const meal = { id: uid(), date: day, title: title.trim(), time, entries: [] };
    update((ms) => [...ms, meal]);
    return meal;
  }

  function startQuickScan() {
    const scanDate = today();
    const meal = addMeal("", nowTime(), scanDate);
    setDate(scanDate);
    setTempMealId(meal.id);
    setAddMode("scan");
    setAddTo(meal);
  }

  function addEntry(mealId: string, e: MealEntry) {
    setTempMealId(null);
    update((ms) => ms.map((m) => (m.id === mealId ? { ...m, entries: [...m.entries, e] } : m)));
  }

  function closeAddFood() {
    setDraftPreview(null);
    setAddStep("search");
    const temporaryId = tempMealId;
    if (temporaryId) {
      update((ms) => ms.filter((meal) => meal.id !== temporaryId || meal.entries.length > 0));
      setTempMealId(null);
    }
    setAddTo(null);
    setAddMode("search");
  }

  function removeEntry(mealId: string, entryId: string) {
    update((ms) => ms.map((m) => (m.id === mealId ? { ...m, entries: m.entries.filter((e) => e.id !== entryId) } : m)));
  }

  function updateEntry(mealId: string, entryId: string, grams: number) {
    update((ms) =>
      ms.map((m) =>
        m.id === mealId ? { ...m, entries: m.entries.map((e) => (e.id === entryId ? { ...e, grams } : e)) } : m,
      ),
    );
  }

  function moveEntryTo(action: EntryAction, targetMealId: string) {
    if (action.mealId === targetMealId) return;
    setState((s) => {
      const source = s.meals.find((meal) => meal.id === action.mealId);
      const entry = source?.entries.find((item) => item.id === action.entry.id);
      if (!entry) return s;
      return {
        ...s,
        meals: s.meals.map((meal) => {
          if (meal.id === action.mealId) return { ...meal, entries: meal.entries.filter((item) => item.id !== entry.id) };
          if (meal.id === targetMealId) return { ...meal, entries: [...meal.entries, entry] };
          return meal;
        }),
      };
    });
    setMoveEntry(null);
    const targetMeal = meals.find((meal) => meal.id === targetMealId);
    notify(`Продукт перенесён в ${targetMeal ? mealTitle(targetMeal.title) : "другой приём"}`);
  }

  /** Продукты, перенесённые на просматриваемый день и ещё не разложенные */
  const basketItems = useMemo(() => basketForDate(state.basket, date), [state.basket, date]);

  /** Свайп вправо по продукту — копия уходит в корзину следующего дня. */
  function copyEntryToNextDay(action: EntryAction) {
    const target = shiftDate(date, 1);
    setState((s) => ({
      ...s,
      basket: addBasketItem(s.basket, makeBasketItem(action.entry, target, uid(), Date.now())),
    }));
    notify(`Копия — в корзине на ${humanDate(target).toLowerCase()}`);
  }

  /** Продукт из корзины перетащили в карточку приёма. */
  function dropBasketItem(item: BasketItem, mealId: string) {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    update((ms) =>
      ms.map((m) => (m.id === mealId ? { ...m, entries: [...m.entries, basketEntryForMeal(item, uid())] } : m)),
    );
    setState((s) => ({ ...s, basket: removeBasketItem(s.basket, item.id) }));
    notify(`Добавлено в «${mealTitle(meal.title)}»`);
  }

  const carryEntry = carry?.item.entry ?? null;

  function copyMeal(meal: Meal, targetDate: string) {
    update((ms) => {
      const clone: Meal = {
        ...meal,
        id: uid(),
        date: targetDate,
        entries: meal.entries.map((e) => ({ ...e, id: uid() })),
      };
      return [...ms, clone];
    });
    notify(targetDate === meal.date ? "Приём продублирован" : `Копия сохранена на ${humanDate(targetDate).toLowerCase()}`);
  }

  // Перетаскивание из корзины в приём. Слушаем окно целиком: палец ведёт
  // продукт, а мы ищем карточку приёма под ним. Скролл на время переноса
  // гасим — иначе на телефоне жест уходит в прокрутку и перенос обрывается.
  useEffect(() => {
    if (!carry) return;
    const mealUnder = (x: number, y: number) =>
      document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-meal-id]")?.dataset.mealId ?? null;
    const move = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      setCarry((current) => (current ? { ...current, x, y } : current));
      setDropTarget(mealUnder(x, y));
      // Автопрокрутка у краёв экрана: длинный день можно «долистать» пальцем
      if (y < 150) window.scrollBy(0, -14);
      else if (y > window.innerHeight - 170) window.scrollBy(0, 14);
    };
    const finish = (event: PointerEvent) => {
      const item = carryRef.current?.item;
      const mealId = mealUnder(event.clientX, event.clientY);
      if (item && mealId) dropBasketItem(item, mealId);
      setCarry(null);
      setDropTarget(null);
    };
    const cancel = () => {
      setCarry(null);
      setDropTarget(null);
    };
    const blockScroll = (event: TouchEvent) => event.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", blockScroll);
    };
  }, [!!carry]);

  // При смене дня корзина закрывается: у нового дня свои продукты
  useEffect(() => {
    setBasketOpen(false);
  }, [date]);

  function openCalendar() {
    setCalendarOpen(true);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (hasOverlay) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select, [data-no-swipe]")) return;
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || hasOverlay) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    setDate(shiftDate(date, dx < 0 ? 1 : -1));
  }

  function openEntry(action: EntryAction) {
    setSwiped(null);
    setEditEntry(action);
  }

  return (
    <div className="space-y-4 pb-32" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
      <div className="mb-2 flex items-center gap-2">
        <IconBtn onClick={() => setDate(shiftDate(date, -1))} title="Предыдущий день" size={40}>
          ‹
        </IconBtn>
        <div
          role="button"
          tabIndex={0}
          onClick={openCalendar}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCalendar()}
          className="card relative flex-1 cursor-pointer py-2.5 text-center transition active:scale-[0.99]"
        >
          <div className="truncate text-sm font-semibold">{humanDate(date)}</div>
          <div className="truncate text-[11px] text-mute">{date.split("-").reverse().join(".")} · календарь</div>
        </div>
        <IconBtn onClick={() => setDate(shiftDate(date, 1))} title="Следующий день" size={40}>
          ›
        </IconBtn>
        {date !== today() && (
          <Btn variant="soft" size="sm" className="shrink-0" onClick={() => setDate(today())}>
            сегодня
          </Btn>
        )}
      </div>

      <div className="sticky top-0 z-40 mb-2 pt-1 pb-2">
      <div
        className="card flex items-center gap-4 p-4"
        style={{ background: "linear-gradient(145deg, #30235a, #241a40)" }}
      >
        <Ring
          value={totals.kcal}
          max={targets.calories}
          label={round(totals.kcal)}
          sub={`из ${targets.calories} ккал`}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="text-xs text-mute">
            {totals.kcal > targets.calories ? (
              <span className="font-medium text-warn">перебор {round(totals.kcal - targets.calories)} ккал</span>
            ) : (
              <>
                осталось <b className="text-ink">{round(left)}</b> ккал
              </>
            )}
          </div>
          <MacroLine label="Белки" value={totals.protein} max={targets.protein} color="var(--color-acc2)" />
          <MacroLine label="Жиры" value={totals.fat} max={targets.fat} color="var(--color-warn)" />
          <MacroLine label="Углеводы" value={totals.carbs} max={targets.carbs} color="var(--color-acc)" />
        </div>
      </div>

      {editEntry && (
        <div className="rise mt-2 rounded-2xl border border-line p-3 shadow-xl shadow-black/40" style={{ background: "#241a40" }} data-no-swipe>
          <EntryEditor
            action={editEntry}
            onPreview={(grams) => setPreview({ mealId: editEntry.mealId, entryId: editEntry.entry.id, grams })}
            onSave={(grams) => {
              updateEntry(editEntry.mealId, editEntry.entry.id, grams);
              setPreview(null);
              setEditEntry(null);
              notify("Количество продукта изменено");
            }}
            onCancel={() => {
              setPreview(null);
              setEditEntry(null);
            }}
          />
        </div>
      )}
      </div>

      {/* Рацион дня одним текстом: норма в нём — та же, что стоит в настройках
          профиля, поэтому копию удобно сразу отправить тренеру или в заметки. */}
      <div className="flex gap-2" data-no-swipe>
        <Btn
          variant="soft"
          size="sm"
          className="min-w-0 flex-1"
          onClick={copyDayRation}
          title="Скопировать рацион за день текстом вместе с нормой БЖУ"
        >
          <span className="truncate">📋 Скопировать рацион</span>
        </Btn>
        <Btn
          variant="soft"
          size="sm"
          className="shrink-0"
          onClick={downloadDayRation}
          title="Скачать рацион за день файлом .txt"
        >
          Скачать .txt
        </Btn>
      </div>

      {visibleMeals.map((meal) => {
        const t = sumTotals(meal.entries);
        return (
          <div
            key={meal.id}
            data-meal-id={meal.id}
            className={`card rise overflow-hidden transition ${
              dropTarget === meal.id ? "ring-2 ring-acc2 shadow-[0_0_0_4px_rgb(45_212_191_/_0.18)]" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-line px-3 py-2.5">
              <button
                type="button"
                onClick={() => setTimePick(meal)}
                title="Выбрать время"
                className="shrink-0 rounded-lg bg-acc/12 px-2 py-1.5 font-mono text-xs font-semibold whitespace-nowrap text-acc2 transition hover:bg-acc/20"
              >
                {meal.time}
              </button>
              <div className="min-w-0 flex-1">
                {meal.title?.trim() && meal.title.trim() !== "Приём" && (
                  <div className="break-words text-sm leading-snug font-semibold">{meal.title.trim()}</div>
                )}
                <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-[10px] leading-snug font-semibold">
                  <span className="whitespace-nowrap text-ink">{round(t.kcal)} ккал</span>
                  <span className="whitespace-nowrap text-acc2">· Б {round(t.protein)}</span>
                  <span className="whitespace-nowrap text-warn">· Ж {round(t.fat)}</span>
                  <span className="whitespace-nowrap text-acc">· У {round(t.carbs)}</span>
                </div>
              </div>
              {/* Одна кнопка «⋮» вместо трёх значков: дублирование и удаление
                  приёма живут в меню действий, копирования всей карточки на
                  завтра здесь больше нет. */}
              <IconBtn onClick={() => setMealMenu(meal)} title="Действия с приёмом" size={28}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </IconBtn>
            </div>

            <div className="divide-y divide-line">
              {meal.entries.map((entry) => {
                const action = { mealId: meal.id, mealTitle: mealTitle(meal.title), entry };
                return (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    swiped={swiped?.id === entry.id ? swiped.side : null}
                    onSwipe={(side) => setSwiped(side ? { id: entry.id, side } : null)}
                    onTap={() => openEntry(action)}
                    onLongPress={() => {
                      setSwiped(null);
                      setMoveEntry(action);
                    }}
                    onDelete={() => {
                      setSwiped(null);
                      setPendingDelete(action);
                    }}
                    onTomorrow={() => {
                      setSwiped(null);
                      copyEntryToNextDay(action);
                    }}
                  />
                );
              })}
              {!meal.entries.length && <div className="px-4 py-3 text-xs text-mute">Пока пусто</div>}
            </div>

            <button
              type="button"
              onClick={() => {
                setAddMode("search");
                setAddTo(meal);
              }}
              className="w-full border-t border-line py-2.5 text-sm font-semibold text-acc transition hover:bg-acc/5 active:bg-acc/10"
            >
              + Добавить продукт
            </button>
          </div>
        );
      })}

      {!meals.length && <Empty icon="🍽" text="Добавь первый приём пищи на этот день" />}

      <Btn variant="soft" className="w-full" onClick={() => setNewMeal(true)}>
        + Новый приём пищи
      </Btn>

      <Sheet
        open={!!addTo}
        onClose={closeAddFood}
        title={
          addStep === "portion"
            ? "Количество"
            : addStep === "scan"
              ? "Сканер штрихкода"
              : addStep === "form"
                ? "Карточка продукта"
                : "Добавить продукт"
        }
        placement="bottom"
        compact={false}
        solid
        noBackdrop
        full
      >
        {addTo && (
          <AddFood
            key={addTo.id + addMode}
            products={state.products}
            recentProductIds={state.recentProductIds}
            mealTitle={mealTitle(addTo.title)}
            startMode={addMode}
            onSaveProduct={(p: Product) =>
              setState((s) => ({
                ...s,
                // Штрихкод уникален: если онлайн-поиск исправил карточку,
                // не оставляем в базе две версии одного продукта.
                products: [
                  p,
                  ...s.products.filter((x) => x.id !== p.id && !(p.barcode && sameBarcode(x.barcode, p.barcode))),
                ],
              }))
            }
            onDeleteProduct={(id) =>
              setState((s) => ({
                ...s,
                products: s.products.filter((x) => x.id !== id),
                recentProductIds: s.recentProductIds.filter((x) => x !== id),
              }))
            }
            onUsed={(id) =>
              setState((s) => ({ ...s, recentProductIds: [id, ...s.recentProductIds.filter((x) => x !== id)].slice(0, 40) }))
            }
            onAdd={(entry) => addEntry(addTo.id, entry)}
            onClose={closeAddFood}
            onNotice={notify}
            onPortionPreview={handlePortionPreview}
            onModeChange={handleAddModeChange}
          />
        )}
      </Sheet>

      <Sheet open={newMeal} onClose={() => setNewMeal(false)} title="Новый приём пищи" center>
        <NewMealForm
          onCreate={(title, time) => {
            addMeal(title, time);
            setNewMeal(false);
          }}
        />
      </Sheet>

      <Sheet open={!!timePick} onClose={() => setTimePick(null)} title="Время" center compact>
        {timePick && (
          <TimePicker
            value={timePick.time}
            title={timePick.title}
            onChange={(time, title) => {
              update((ms) => ms.map((m) => (m.id === timePick.id ? { ...m, title, time } : m)));
              setTimePick(null);
              notify("Приём изменён");
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!moveEntry} onClose={() => setMoveEntry(null)} title="Перенести продукт" center>
        {moveEntry && (
          <EntryMoveSheet
            action={moveEntry}
            meals={meals}
            onMove={(targetId) => moveEntryTo(moveEntry, targetId)}
          />
        )}
      </Sheet>

      {/* Меню «⋮» на карточке приёма: пункты вместо трёх значков в шапке */}
      <Sheet open={!!mealMenu} onClose={() => setMealMenu(null)} title="Приём пищи" center compact>
        {mealMenu && (
          <div className="space-y-2">
            <div className="rounded-xl border border-line bg-panel2/60 px-3 py-2 text-xs leading-snug text-mute">
              {mealMenu.time} · {mealTitle(mealMenu.title)} · продуктов: {mealMenu.entries.length} · {round(sumTotals(mealMenu.entries).kcal)} ккал
            </div>
            <button
              type="button"
              onClick={() => {
                copyMeal(mealMenu, date);
                setMealMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left text-sm font-medium transition hover:border-acc2/50 active:scale-[0.99]"
            >
              <span className="shrink-0 text-base leading-none">↗</span>
              Дублировать приём
            </button>
            <button
              type="button"
              onClick={() => {
                copyMeal(mealMenu, shiftDate(date, 1));
                setMealMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left text-sm font-medium transition hover:border-acc2/50 active:scale-[0.99]"
            >
              <span className="shrink-0 text-base leading-none">→</span>
              Скопировать приём на завтра
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteMeal(mealMenu);
                setMealMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-bad/35 bg-bad/10 px-3 py-3 text-left text-sm font-medium text-bad transition hover:bg-bad/20 active:scale-[0.99]"
            >
              <span className="shrink-0 text-base leading-none">🗑</span>
              Удалить приём
            </button>
          </div>
        )}
      </Sheet>

      {/* Подтверждение удаления продукта: свайп влево открывает «Удалить»,
          но продукт уходит только после подтверждения — свайп случайный. */}
      <Sheet open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Удалить продукт?" center>
        {pendingDelete && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              Убрать «{pendingDelete.entry.name}» ({round(pendingDelete.entry.grams)} г) из приёма «
              {mealTitle(pendingDelete.mealTitle)}»?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="soft" onClick={() => setPendingDelete(null)}>
                Нет
              </Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  try {
                    navigator.vibrate?.(40);
                  } catch {
                    /* noop */
                  }
                  removeEntry(pendingDelete.mealId, pendingDelete.entry.id);
                  setPendingDelete(null);
                  setSwiped(null);
                  notify("Продукт удалён");
                }}
              >
                Да, удалить
              </Btn>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!deleteMeal} onClose={() => setDeleteMeal(null)} title="Удалить приём?" center>
        {deleteMeal && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              {mealTitle(deleteMeal.title)
                ? `Удалить «${mealTitle(deleteMeal.title)}» вместе со всеми продуктами? Это действие нельзя отменить.`
                : "Удалить этот приём вместе со всеми продуктами? Это действие нельзя отменить."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="soft" onClick={() => setDeleteMeal(null)}>
                Нет
              </Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  update((ms) => ms.filter((meal) => meal.id !== deleteMeal.id));
                  setDeleteMeal(null);
                  notify("Приём удалён");
                }}
              >
                Да, удалить
              </Btn>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title="Календарь питания" center>
        <CalendarView
          state={state}
          targets={targets}
          selectedDate={date}
          onSelect={(selectedDate) => {
            setDate(selectedDate);
            setCalendarOpen(false);
          }}
        />
      </Sheet>

      {/* Корзина дня: продукты, перенесённые на этот день свайпом. Появляется
          только когда в ней что-то есть; кнопка — над «Сканировать». */}
      {basketItems.length > 0 && (
        <button
          type="button"
          onClick={() => setBasketOpen((open) => !open)}
          title="Корзина дня: перенесённые продукты"
          aria-label={`Корзина дня: продуктов ${basketItems.length}`}
          aria-expanded={basketOpen}
          className={`fixed z-[45] grid size-12 place-items-center rounded-full border bg-[rgb(24_16_44/.95)] text-xl shadow-xl shadow-black/50 backdrop-blur-xl transition active:scale-95 ${
            basketOpen ? "border-acc2 text-acc2" : "border-acc2/40"
          }`}
          style={{
            right: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
            bottom: "calc(5.75rem + var(--safe-bottom) + 3.75rem)",
          }}
        >
          🧺
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-acc2 px-1 text-[10px] font-bold text-[#0b2b28]">
            {basketItems.length}
          </span>
        </button>
      )}

      {basketOpen && basketItems.length > 0 && (
        <div
          data-no-swipe
          className="fixed z-[46] overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/70"
          style={{
            right: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
            bottom: "calc(5.75rem + var(--safe-bottom) + 6.5rem)",
            width: "min(21rem, calc(100vw - 2rem))",
            background: "#241a40",
            // На время переноса прячем панель: палец должен «видеть» все карточки
            opacity: carry ? 0 : 1,
            pointerEvents: carry ? "none" : undefined,
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="text-base leading-none">🧺</span>
            <span className="min-w-0 flex-1 text-xs font-semibold">
              Корзина на {humanDate(date).toLowerCase()}
            </span>
            <button
              type="button"
              onClick={() => setBasketOpen(false)}
              aria-label="Закрыть корзину"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-panel2 text-mute transition hover:text-ink active:scale-90"
            >
              ✕
            </button>
          </div>
          <p className="px-3 pt-2 text-[11px] leading-snug text-mute">
            Зажми продукт пальцем и перетащи в нужную карточку приёма. В калории дня они попадут, только когда окажутся
            в приёме.
          </p>
          <div className="max-h-[38vh] overflow-y-auto overscroll-contain p-2">
            {basketItems.map((item) => (
              <BasketCard key={item.id} item={item} onPickUp={(picked, x, y) => setCarry({ item: picked, x, y })} />
            ))}
          </div>
        </div>
      )}

      {/* «Призрак» продукта под пальцем при переносе из корзины */}
      {carry && carryEntry && (
        <div
          className="pointer-events-none fixed z-[85] flex max-w-[16rem] -translate-x-1/2 -translate-y-[135%] items-center gap-2 rounded-xl border border-acc2/70 bg-[#241a40] px-3 py-2 shadow-2xl shadow-black/70"
          style={{ left: carry.x, top: carry.y }}
        >
          <span className="shrink-0 text-base leading-none">📥</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{carryEntry.name}</span>
            <span className="block text-[10px] whitespace-nowrap text-mute">
              {round(carryEntry.grams)} г · {round(entryTotals(carryEntry).kcal)} ккал
            </span>
          </span>
        </div>
      )}

      {carry && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[44] flex justify-center px-4"
          style={{ bottom: "calc(5.75rem + var(--safe-bottom))" }}
        >
          <span className="rounded-full border border-acc2/50 bg-[rgb(24_16_44/.95)] px-3 py-1.5 text-[11px] font-semibold text-acc2 shadow-lg shadow-black/40 backdrop-blur-xl">
            {dropTarget ? "Отпусти — продукт встанет в этот приём" : "Веди продукт к карточке приёма"}
          </span>
        </div>
      )}

      {notice && <CenterNotice message={notice} />}
    </div>
  );
}

function MacroLine({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="shrink-0 text-mute">{label}</span>
        <span className="shrink-0 whitespace-nowrap">
          {round(value)} / {max} г
        </span>
      </div>
      <Bar value={value} max={max} color={color} />
    </div>
  );
}

function EntryEditor({
  action,
  onPreview,
  onSave,
  onCancel,
}: {
  action: EntryAction;
  onPreview: (grams: number) => void;
  onSave: (grams: number) => void;
  onCancel: () => void;
}) {
  const [grams, setGrams] = useState(String(action.entry.grams));
  const value = Math.max(0, Number(grams.replace(",", ".")) || 0);
  const changeGrams = (next: number | string) => {
    const text = String(next).replace(",", ".");
    const numeric = Math.max(0, Number(text) || 0);
    setGrams(text);
    onPreview(numeric);
  };
  const quickValues = [50, 100, 150, 200, 250, 300];

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 text-sm leading-snug font-semibold break-words">{action.entry.name}</div>
        <div className="shrink-0 text-[11px] whitespace-nowrap text-mute">{action.entry.kcal} ккал/100 г</div>
      </div>
      <Field label="Количество, г / мл">
        <div className="flex items-center gap-1.5">
          <IconBtn onClick={() => changeGrams(Math.max(0, value - 10))} title="Уменьшить на 10 г" size={36}>
            <span className="block -translate-y-px text-base leading-none font-bold">−</span>
          </IconBtn>
          <div className="relative min-w-0 flex-1">
            <input
              className="field compact min-w-0 pr-9 text-center text-base font-bold"
              {...numField}
              value={grams}
              onChange={(event) => changeGrams(event.target.value)}
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-mute">г</span>
          </div>
          <IconBtn onClick={() => changeGrams(value + 10)} title="Увеличить на 10 г" size={36}>
            <span className="block -translate-y-px text-base leading-none font-bold">+</span>
          </IconBtn>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-1.5">
        {quickValues.map((quick) => (
          <button
            type="button"
            key={quick}
            onClick={() => changeGrams(quick)}
            className={`rounded-lg border py-2 text-sm font-semibold whitespace-nowrap transition active:scale-95 ${
              value === quick ? "border-acc bg-acc/20 text-acc" : "border-line bg-panel2 hover:border-acc2/60"
            }`}
          >
            {quick} г
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Btn variant="soft" className="flex-1" onClick={onCancel}>
          Отмена
        </Btn>
        <Btn className="flex-[2]" disabled={value <= 0} onClick={() => onSave(value)}>
          Сохранить
        </Btn>
      </div>
    </div>
  );
}

/**
 * Продукт в корзине дня. Зажал пальцем (≈0.2 с) — начинается перенос:
 * дальше палец ведёт карточку, а приём под пальцем подсвечивается.
 * Сдвинул палец раньше удержания — это прокрутка списка, перенос не стартует.
 */
function BasketCard({
  item,
  onPickUp,
}: {
  item: BasketItem;
  onPickUp: (item: BasketItem, x: number, y: number) => void;
}) {
  const totals = entryTotals(item.entry);
  const hold = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function cancelHold() {
    if (hold.current !== null) window.clearTimeout(hold.current);
    hold.current = null;
    start.current = null;
  }

  useEffect(() => cancelHold, []);

  return (
    <div
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        cancelHold();
        const { clientX, clientY } = event;
        start.current = { x: clientX, y: clientY };
        hold.current = window.setTimeout(() => {
          hold.current = null;
          try {
            navigator.vibrate?.(25);
          } catch {
            /* noop */
          }
          onPickUp(item, clientX, clientY);
        }, 200);
      }}
      onPointerMove={(event) => {
        const from = start.current;
        if (hold.current === null || !from) return;
        if (Math.abs(event.clientX - from.x) > 12 || Math.abs(event.clientY - from.y) > 12) cancelHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      style={{ touchAction: "pan-y" }}
      className="mb-1.5 flex cursor-grab items-center gap-2 rounded-xl border border-line bg-panel2 px-2.5 py-2 last:mb-0 select-none active:border-acc2/60"
    >
      <span className="shrink-0 text-sm leading-none text-mute">⠿</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug break-words">{item.entry.name}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-mute">
          {round(item.entry.grams)} г · Б {round(totals.protein, 1)} · Ж {round(totals.fat, 1)} · У{" "}
          {round(totals.carbs, 1)}
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold whitespace-nowrap">
        {round(totals.kcal)} <span className="text-[10px] font-medium text-mute">ккал</span>
      </span>
    </div>
  );
}

/** Ширина зоны действия при свайпе (справа — удалить, слева — на завтра), px */
const SWIPE_W = 88;

/** Какая сторона строки открыта свайпом: слева — «На завтра», справа — «Удалить» */
type SwipeSide = "left" | "right";

/**
 * Строка продукта в приёме:
 * тап — изменить граммы, долгий тап — перенос в другой приём,
 * свайп влево — удалить (с подтверждением),
 * свайп вправо — копия на следующий день в корзину.
 */
function EntryRow({
  entry,
  swiped,
  onSwipe,
  onTap,
  onLongPress,
  onDelete,
  onTomorrow,
}: {
  entry: MealEntry;
  swiped: SwipeSide | null;
  onSwipe: (side: SwipeSide | null) => void;
  onTap: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onTomorrow: () => void;
}) {
  const totals = entryTotals(entry);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; base: number; mode: "?" | "swipe" | "scroll" } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const suppressClick = useRef(false);

  // Родитель решает, какая сторона открыта: эта строка подстраивается
  // (сдвиг влево — «Удалить», вправо — «На завтра»), остальные закрываются.
  useEffect(() => {
    setDx(swiped === "right" ? SWIPE_W : swiped === "left" ? -SWIPE_W : 0);
  }, [swiped]);

  function cancelHold() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      base: swiped === "left" ? -SWIPE_W : swiped === "right" ? SWIPE_W : 0,
      mode: "?",
    };
    longPressed.current = false;
    cancelHold();
    holdTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 550);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.mode === "scroll") return;
    const mx = event.clientX - d.x;
    const my = event.clientY - d.y;
    if (d.mode === "?") {
      if (Math.abs(mx) < 9 && Math.abs(my) < 9) return;
      d.mode = Math.abs(mx) > Math.abs(my) ? "swipe" : "scroll";
      cancelHold();
      if (d.mode === "scroll") return;
    }
    setDx(Math.max(-SWIPE_W, Math.min(SWIPE_W, d.base + mx)));
  }

  function handlePointerEnd() {
    cancelHold();
    const d = drag.current;
    drag.current = null;
    if (d?.mode === "swipe") {
      suppressClick.current = true;
      const side: SwipeSide | null = dx <= -SWIPE_W / 2 ? "left" : dx >= SWIPE_W / 2 ? "right" : null;
      setDx(side === "left" ? -SWIPE_W : side === "right" ? SWIPE_W : 0);
      onSwipe(side);
    }
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (swiped) {
      setDx(0);
      onSwipe(null);
      return;
    }
    onTap();
  }

  return (
    <div className="relative overflow-hidden">
      {/* бирюзовая зона слева — видна при свайпе вправо: копия на завтра в корзину */}
      <div className="absolute inset-y-0 left-0 flex items-stretch" style={{ width: SWIPE_W }}>
        <button
          type="button"
          aria-label={`Копия «${entry.name}» на завтра`}
          onClick={onTomorrow}
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-acc2/85 text-[#0b2b28] transition active:bg-acc2"
        >
          <span className="text-base leading-none">📥</span>
          <span className="text-[10px] font-semibold whitespace-nowrap">На завтра</span>
        </button>
      </div>
      {/* красная зона справа — видна при свайпе влево: удалить с подтверждением */}
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: SWIPE_W }}>
        <button
          type="button"
          aria-label={`Удалить ${entry.name}`}
          onClick={onDelete}
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-bad/80 text-white transition active:bg-bad"
        >
          <span className="text-base leading-none">🗑</span>
          <span className="text-[10px] font-semibold">Удалить</span>
        </button>
      </div>
      <div
        data-no-swipe
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleClick}
        className="relative flex items-center gap-2 px-3 py-2"
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: drag.current ? "none" : "transform .18s ease-out",
          background: "linear-gradient(145deg, rgb(54 39 90), rgb(33 24 57))",
          touchAction: "pan-y",
        }}
      >
        {/* onClick висит на внешнем div: при захвате указателя (свайп-логика)
            клик приходит на него, а не на кнопку; кнопка нужна для семантики
            и клавиатуры — её клик всплывёт сюда же, дважды не сработает */}
        <button
          type="button"
          onContextMenu={(event) => event.preventDefault()}
          className="flex min-w-0 flex-1 select-none items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-acc/5 active:bg-acc/10"
          style={{ touchAction: "pan-y" }}
        >
          <div className="min-w-0 flex-1">
            {/* Полное название — без обрезки */}
            <div className="text-sm leading-snug break-words">{entry.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] leading-snug">
              <span className="whitespace-nowrap text-mute">{round(entry.grams)} г</span>
              <span className="whitespace-nowrap font-semibold text-acc2">· Б {round(totals.protein, 1)}</span>
              <span className="whitespace-nowrap font-semibold text-warn">· Ж {round(totals.fat, 1)}</span>
              <span className="whitespace-nowrap font-semibold text-acc">· У {round(totals.carbs, 1)}</span>
            </div>
          </div>
          {/* Справа — калории именно этой порции (граммовка × ккал на 100 г).
              Подпись «ккал» рядом с числом: без неё цифру легко принять
              за граммы или за ккал на 100 г. */}
          <div className="shrink-0 text-xs font-semibold whitespace-nowrap">
            {round(totals.kcal)} <span className="text-[10px] font-medium text-mute">ккал</span>
          </div>
        </button>
      </div>
    </div>
  );
}

function EntryMoveSheet({
  action,
  meals,
  onMove,
}: {
  action: EntryAction;
  meals: Meal[];
  onMove: (mealId: string) => void;
}) {
  const targets = meals.filter((meal) => meal.id !== action.mealId);
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-mute">
        Можно открыть это окно долгим нажатием на продукт. Выберите приём, куда перенести «{action.entry.name}».
      </p>
      {!targets.length && <Empty icon="🍽" text="Сначала создай ещё один приём пищи" />}
      {targets.map((meal) => (
        <button
          type="button"
          key={meal.id}
          onClick={() => onMove(meal.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition hover:border-acc/60"
        >
          <span className="font-mono text-xs text-acc2">{meal.time}</span>
          <span className="min-w-0 flex-1 text-sm leading-snug font-medium break-words">{mealTitle(meal.title)}</span>
          <span className="text-lg text-acc">→</span>
        </button>
      ))}
    </div>
  );
}

function CalendarView({
  state,
  targets,
  selectedDate,
  onSelect,
}: {
  state: AppState;
  targets: Targets;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(`${selectedDate.slice(0, 7)}-01`);
  const first = new Date(`${month}T12:00:00`);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const monthLabel = first.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const totals = useMemo(() => {
    const result = new Map<string, ReturnType<typeof sumTotals>>();
    for (const meal of state.meals) {
      if (!meal.entries.length) continue;
      const previous = result.get(meal.date) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 };
      const current = sumTotals(meal.entries);
      result.set(meal.date, {
        kcal: previous.kcal + current.kcal,
        protein: previous.protein + current.protein,
        fat: previous.fat + current.fat,
        carbs: previous.carbs + current.carbs,
      });
    }
    return result;
  }, [state.meals]);

  function moveMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1, 12);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <IconBtn onClick={() => moveMonth(-1)} title="Предыдущий месяц" size={36}>‹</IconBtn>
        <div className="text-center font-semibold capitalize">{monthLabel}</div>
        <IconBtn onClick={() => moveMonth(1)} title="Следующий месяц" size={36}>›</IconBtn>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-mute">
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leading }, (_, index) => <div key={`empty-${index}`} className="aspect-square" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayDate = `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`;
          const dayTotals = totals.get(dayDate);
          const kcal = Math.round(dayTotals?.kcal ?? 0);
          const hasEntries = !!dayTotals;
          const complete = hasEntries && isTargetValue(dayTotals.kcal, targets.calories) && isTargetValue(dayTotals.protein, targets.protein) && isTargetValue(dayTotals.fat, targets.fat) && isTargetValue(dayTotals.carbs, targets.carbs);
          return (
            <button
              type="button"
              key={dayDate}
              onClick={() => onSelect(dayDate)}
              className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border text-xs transition active:scale-95 ${
                dayDate === selectedDate
                  ? "border-acc bg-acc/15"
                  : complete
                    ? "border-acc2/50 bg-acc2/18"
                    : hasEntries
                      ? "border-bad/40 bg-bad/10"
                      : "border-line bg-panel2/45"
              }`}
            >
              <span className="font-semibold">{day}</span>
              {hasEntries && <span className={`mt-0.5 truncate text-[9px] ${complete ? "text-acc2" : "text-bad"}`}>{kcal}</span>}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-[10px] text-mute min-[360px]:grid-cols-3 min-[360px]:gap-2">
        <div className="rounded-lg bg-acc2/12 px-2 py-1.5 text-center"><span className="text-acc2">●</span> цель выполнена</div>
        <div className="rounded-lg bg-bad/10 px-2 py-1.5 text-center"><span className="text-bad">●</span> ниже или выше нормы</div>
        <div className="rounded-lg bg-panel2/55 px-2 py-1.5 text-center"><span>●</span> нет записей</div>
      </div>
      <p className="text-center text-[11px] text-mute">Зелёный день — калории и все БЖУ в пределах ±10% от цели.</p>
    </div>
  );
}

function CenterNotice({ message }: { message: string }) {
  // Тост внизу экрана, в одну линию с круглой кнопкой камеры
  return (
    <div
      className="pointer-events-none fixed z-[70] flex justify-start"
      style={{
        left: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
        right: "max(5.25rem, calc((100vw - 32rem) / 2 + 5.25rem))",
        bottom: "calc(5.75rem + var(--safe-bottom))",
      }}
    >
      <div className="rise flex min-h-14 w-full items-center rounded-2xl border border-acc2/40 bg-panel px-4 py-2 text-left text-[13px] leading-snug font-semibold text-ink shadow-xl shadow-black/15 backdrop-blur-xl">
        <span className="line-clamp-2">✓ {message}</span>
      </div>
    </div>
  );
}

function TimePicker({
  value,
  title,
  onChange,
}: {
  value: string;
  title?: string;
  onChange: (time: string, title: string) => void;
}) {
  const [mealName, setMealName] = useState(title && title !== "Приём" ? title : "");
  const [hourValue, minuteValue] = value.split(":").map(Number);
  const [selectedHour, setSelectedHour] = useState(Number.isFinite(hourValue) ? hourValue : 12);
  const [selectedMinute, setSelectedMinute] = useState(Number.isFinite(minuteValue) ? minuteValue : 0);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  useEffect(() => {
    const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
      ref.current?.children[index]?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    };
    scrollTo(hourRef, selectedHour);
    scrollTo(minuteRef, Math.round(selectedMinute / 5));
  }, []);

  return (
    <div className="space-y-3">
      <input
        className="field py-2 text-sm"
        {...noSuggest}
        value={mealName}
        onChange={(event) => setMealName(event.target.value)}
        placeholder="Название приёма (необязательно)"
      />
      <div>
        <div className="relative grid grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-line bg-panel2/60 p-1.5">
          <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-10 -translate-y-1/2 rounded-xl border border-acc/40 bg-acc/10" />
          <Wheel label="Часы" values={hours} value={selectedHour} onChange={setSelectedHour} scrollRef={hourRef} />
          <Wheel label="Минуты" values={minutes} value={selectedMinute} onChange={setSelectedMinute} scrollRef={minuteRef} />
        </div>
      </div>
      <Btn
        size="sm"
        className="w-full"
        onClick={() => onChange(`${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`, mealName.trim())}
      >
        Сохранить {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")}
      </Btn>
    </div>
  );
}

function Wheel({
  label,
  values,
  value,
  onChange,
  scrollRef,
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (value: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative z-20 min-w-0">
      <div className="mb-0.5 text-center text-[9px] font-bold tracking-[.14em] text-mute uppercase">{label}</div>
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const box = event.currentTarget;
          const index = Math.max(0, Math.min(values.length - 1, Math.round((box.scrollTop + box.clientHeight / 2 - 80) / 40)));
          if (values[index] !== value) onChange(values[index]);
        }}
        className="h-40 touch-pan-y snap-y snap-mandatory select-none overflow-y-auto overscroll-contain py-15 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {values.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onChange(item)}
            className={`flex h-10 w-full snap-center items-center justify-center rounded-xl font-mono text-lg transition ${item === value ? "font-extrabold text-acc" : "text-mute/70"}`}
          >
            {String(item).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewMealForm({ onCreate }: { onCreate: (title: string, time: string) => void }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(nowTime());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [h, m] = time.split(":").map(Number);
  const [hour, setHour] = useState(Number.isFinite(h) ? h : 12);
  const [minute, setMinute] = useState(Number.isFinite(m) ? m : 0);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  useEffect(() => {
    setTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }, [hour, minute]);

  useEffect(() => {
    if (!pickerOpen) return;
    hourRef.current?.children[hour]?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    minuteRef.current?.children[Math.round(minute / 5)]?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  }, [pickerOpen]);

  return (
    <div className="space-y-3">
      <Field label="Название (необязательно)">
        <input className="field" {...noSuggest} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, После тренировки" />
      </Field>

      <Field label="Время приёма">
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className={`field flex w-full items-center justify-between gap-2 text-left transition ${
            pickerOpen ? "border-acc2 ring-2 ring-acc2/25" : ""
          }`}
        >
          <span className="font-mono text-lg font-semibold tracking-wide">{time}</span>
          <span className="flex shrink-0 items-center gap-2 text-mute">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 1.8" />
            </svg>
            <span className={`text-xs transition ${pickerOpen ? "rotate-180" : ""}`}>▾</span>
          </span>
        </button>
      </Field>

      {pickerOpen && (
        <div className="rise relative grid w-full grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-line bg-panel2/60 p-1.5">
          <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-10 -translate-y-1/2 rounded-xl border border-acc/40 bg-acc/15" />
          <Wheel label="Часы" values={hours} value={hour} onChange={setHour} scrollRef={hourRef} />
          <Wheel label="Минуты" values={minutes} value={minute} onChange={setMinute} scrollRef={minuteRef} />
        </div>
      )}

      <Btn className="w-full" disabled={!time} onClick={() => onCreate(title.trim(), time)}>
        Добавить приём на {time}
      </Btn>
    </div>
  );
}

function isTargetValue(value: number, target: number) {
  return target > 0 && value >= target * 0.9 && value <= target * 1.1;
}

function mealTitle(title?: string) {
  const value = title?.trim() ?? "";
  return value === "Приём" ? "" : value;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
