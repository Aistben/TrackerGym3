import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Meal, MealEntry, Product, Targets } from "../lib/types";
import { dayTotals, entryTotals, humanDate, round, shiftDate, sumTotals, today } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { Bar, Btn, Empty, Field, IconBtn, Ring, Sheet, noSuggest, numField } from "./ui";
import AddFood from "./AddFood";

type EntryAction = { mealId: string; mealTitle: string; entry: MealEntry };

export default function DayView({
  state,
  setState,
  targets,
  date,
  setDate,
  photoRequest,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  targets: Targets;
  date: string;
  setDate: (d: string) => void;
  photoRequest: number;
}) {
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [addMode, setAddMode] = useState<"search" | "scan" | "photo">("search");
  const [scanPick, setScanPick] = useState(false);
  const [newMeal, setNewMeal] = useState(false);
  const [timePick, setTimePick] = useState<Meal | null>(null);
  const [editEntry, setEditEntry] = useState<EntryAction | null>(null);
  const [moveEntry, setMoveEntry] = useState<EntryAction | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ mealId: string; entryId: string; grams: number } | null>(null);
  const [tempMealId, setTempMealId] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<{ product: Product; grams: number } | null>(null);
  const [addStep, setAddStep] = useState<"search" | "scan" | "form" | "portion" | "photo">("search");
  const lastPhotoRequest = useRef(0);
  const noticeTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

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
    scanPick ||
    newMeal ||
    timePick ||
    editEntry ||
    moveEntry ||
    deleteMeal ||
    calendarOpen
  );

  const handlePortionPreview = useCallback(
    (preview: { product: Product; grams: number } | null) => setDraftPreview(preview),
    [],
  );
  const handleAddModeChange = useCallback(
    (step: "search" | "scan" | "form" | "portion" | "photo") => setAddStep(step),
    [],
  );

  const update = (fn: (ms: Meal[]) => Meal[]) => setState((s) => ({ ...s, meals: fn(s.meals) }));

  function notify(message: string) {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1200);
  }

  useEffect(() => {
    return () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!photoRequest || photoRequest === lastPhotoRequest.current) return;
    lastPhotoRequest.current = photoRequest;
    openPhotoAdd();
  }, [photoRequest]);

  function addMeal(title: string, time: string): Meal {
    const meal = { id: uid(), date, title: title.trim(), time, entries: [] };
    update((ms) => [...ms, meal]);
    return meal;
  }

  function openPhotoAdd() {
    // Если день пустой, временный приём удалится после отмены добавления.
    const target = meals[meals.length - 1];
    if (target) {
      setTempMealId(null);
      setAddTo(target);
    } else {
      const meal = addMeal("", nowTime());
      setTempMealId(meal.id);
      setAddTo(meal);
    }
    setAddMode("photo");
  }

  function openScanFor(meal: Meal) {
    setTempMealId(null);
    setAddMode("scan");
    setAddTo(meal);
    setScanPick(false);
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

  function startEntryHold(event: React.PointerEvent, action: EntryAction) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    longPressTriggered.current = false;
    holdTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setMoveEntry(action);
    }, 550);
  }

  function cancelEntryHold() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function openEntry(action: EntryAction) {
    cancelEntryHold();
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setEditEntry(action);
  }

  return (
    <div className="space-y-4 pb-32" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
      <div className="flex items-center gap-2">
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
      <div className="text-center text-[11px] text-mute">Свайп влево или вправо — другой день</div>

      <div className="sticky top-0 z-40 -mx-4 px-4 pt-1 pb-2">
      <div className="card flex items-center gap-4 p-4">
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
        <div className="rise card mt-2 p-3" data-no-swipe>
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

      {visibleMeals.map((meal) => {
        const t = sumTotals(meal.entries);
        return (
          <div key={meal.id} className="card rise overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-3 py-3">
              <button
                type="button"
                onClick={() => setTimePick(meal)}
                title="Выбрать время"
                className="shrink-0 rounded-lg bg-acc/12 px-2.5 py-1.5 font-mono text-xs font-semibold whitespace-nowrap text-acc2 transition hover:bg-acc/20"
              >
                {meal.time}
              </button>
              <div className="min-w-0 flex-1">
                {meal.title?.trim() && meal.title.trim() !== "Приём" && (
                  <div className="truncate text-sm font-semibold">{meal.title.trim()}</div>
                )}
                <div className="truncate text-[11px] text-mute">
                  {round(t.kcal)} ккал · Б {round(t.protein)} · Ж {round(t.fat)} · У {round(t.carbs)}
                </div>
              </div>
              <IconBtn onClick={() => copyMeal(meal, shiftDate(date, 1))} title="Копия на завтра" size={32}>
                <span className="text-lg leading-none">→</span>
              </IconBtn>
              <IconBtn onClick={() => copyMeal(meal, date)} title="Дублировать приём" size={32}>
                <span className="text-lg leading-none">↗</span>
              </IconBtn>
              <IconBtn
                onClick={() => setDeleteMeal(meal)}
                title="Удалить приём"
                size={32}
                className="border-bad/40 text-bad hover:text-bad"
              >
                <span className="text-sm">×</span>
              </IconBtn>
            </div>

            <div className="divide-y divide-line">
              {meal.entries.map((entry) => {
                const totalsForEntry = entryTotals(entry);
                const action = { mealId: meal.id, mealTitle: mealTitle(meal.title), entry };
                return (
                  <div key={entry.id} className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openEntry(action)}
                      onPointerDown={(event) => startEntryHold(event, action)}
                      onPointerUp={cancelEntryHold}
                      onPointerCancel={cancelEntryHold}
                      onPointerLeave={cancelEntryHold}
                      onContextMenu={(event) => event.preventDefault()}
                      className="flex min-w-0 flex-1 select-none items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-acc/5 active:bg-acc/10"
                      style={{ touchAction: "manipulation" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{entry.name}</div>
                        <div className="truncate text-[11px] text-mute">
                          {round(entry.grams)} г · Б {round(totalsForEntry.protein, 1)} · Ж {round(totalsForEntry.fat, 1)} · У {round(totalsForEntry.carbs, 1)}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">{round(totalsForEntry.kcal)}</div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить ${entry.name}`}
                      onClick={() => removeEntry(meal.id, entry.id)}
                      className="shrink-0 px-1 text-mute opacity-60 transition hover:text-bad hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
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
      <Btn variant="soft" className="w-full" onClick={() => setScanPick(true)}>
        ▣ Сканировать штрихкод
      </Btn>

      <Sheet open={scanPick} onClose={() => setScanPick(false)} title="Сканировать штрихкод" center>
        <div className="space-y-3">
          <p className="text-sm text-mute">Куда добавить найденный продукт?</p>
          {meals.map((meal) => (
            <button
              type="button"
              key={meal.id}
              onClick={() => openScanFor(meal)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition hover:border-acc/60 active:scale-[0.99]"
            >
              <span className="shrink-0 rounded-lg bg-panel px-2 py-1 font-mono text-xs whitespace-nowrap text-acc2">
                {meal.time}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{mealTitle(meal.title)}</span>
              <span className="shrink-0 text-xs text-mute">{meal.entries.length} поз.</span>
            </button>
          ))}
          <Btn
            variant="soft"
            className="w-full"
            onClick={() => {
              const meal = addMeal("", nowTime());
              setTempMealId(meal.id);
              setAddMode("scan");
              setAddTo(meal);
              setScanPick(false);
            }}
          >
            ➕ Новый приём сейчас
          </Btn>
        </div>
      </Sheet>

      <Sheet
        open={!!addTo}
        onClose={closeAddFood}
        title={addStep === "portion" ? "Количество" : "Добавить продукт"}
        placement="bottom"
        compact={addStep === "portion"}
        noBackdrop={addStep === "portion"}
      >
        {addTo && (
          <AddFood
            key={addTo.id + addMode}
            products={state.products}
            recentProductIds={state.recentProductIds}
            mealTitle={mealTitle(addTo.title)}
            startMode={addMode}
            onSaveProduct={(p: Product) =>
              setState((s) => ({ ...s, products: [p, ...s.products.filter((x) => x.id !== p.id)] }))
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
            notify("Новый приём добавлен");
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
  const quickValues = [30, 50, 100, 150, 200, 250, 300];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-semibold">{action.entry.name}</div>
        <div className="shrink-0 text-[11px] whitespace-nowrap text-mute">{action.entry.kcal} ккал/100 г</div>
      </div>
      <Field label="Количество, г / мл">
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => changeGrams(Math.max(0, value - 10))} title="Уменьшить на 10 г" size={44}>
            −
          </IconBtn>
          <input
            className="field min-w-0 text-center text-lg"
            {...numField}
            value={grams}
            onChange={(event) => changeGrams(event.target.value)}
          />
          <IconBtn onClick={() => changeGrams(value + 10)} title="Увеличить на 10 г" size={44}>
            +
          </IconBtn>
        </div>
      </Field>
      <div className="flex flex-wrap justify-center gap-2">
        {quickValues.map((quick) => (
          <button
            type="button"
            key={quick}
            onClick={() => changeGrams(quick)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              value === quick ? "border-acc bg-acc/15 text-acc" : "border-line bg-panel2 hover:border-acc2/60"
            }`}
          >
            {quick}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Btn variant="soft" size="sm" className="flex-1" onClick={onCancel}>
          Отмена
        </Btn>
        <Btn className="flex-[2]" disabled={value <= 0} onClick={() => onSave(value)}>
          Сохранить
        </Btn>
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
          <span className="min-w-0 flex-1 truncate font-medium">{mealTitle(meal.title)}</span>
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
      <div className="grid grid-cols-3 gap-2 text-[10px] text-mute">
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
        bottom: "calc(5.75rem + env(safe-area-inset-bottom))",
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
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-panel2/60 px-3 py-2 text-xs leading-relaxed text-mute">
        Название необязательно. Если оставить поле пустым, карточка останется без названия. Время можно изменить позже.
      </div>
      <Field label="Название (необязательно)">
        <input className="field" {...noSuggest} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, После тренировки" />
      </Field>
      <Field label="Время приёма">
        <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Btn className="w-full" disabled={!time} onClick={() => onCreate(title.trim(), time)}>
        Добавить
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
