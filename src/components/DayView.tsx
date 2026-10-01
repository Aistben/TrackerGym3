import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Meal, MealEntry, Product, Targets } from "../lib/types";
import { dayTotals, entryTotals, humanDate, round, shiftDate, sumTotals, today } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { Bar, Btn, Empty, Field, IconBtn, Ring, Sheet } from "./ui";
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
  const [moveMeal, setMoveMeal] = useState<Meal | null>(null);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [timePick, setTimePick] = useState<Meal | null>(null);
  const [editEntry, setEditEntry] = useState<EntryAction | null>(null);
  const [moveEntry, setMoveEntry] = useState<EntryAction | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null);
  const [tempMealId, setTempMealId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const lastPhotoRequest = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const meals = useMemo(
    () => state.meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [state.meals, date],
  );
  const totals = dayTotals(meals);
  const left = Math.max(0, targets.calories - totals.kcal);
  const hasOverlay = !!(
    addTo ||
    scanPick ||
    newMeal ||
    moveMeal ||
    editMeal ||
    timePick ||
    editEntry ||
    moveEntry ||
    deleteMeal
  );

  const update = (fn: (ms: Meal[]) => Meal[]) => setState((s) => ({ ...s, meals: fn(s.meals) }));

  useEffect(() => {
    if (!photoRequest || photoRequest === lastPhotoRequest.current) return;
    lastPhotoRequest.current = photoRequest;
    openPhotoAdd();
  }, [photoRequest]);

  function addMeal(title: string, time: string): Meal {
    const meal = { id: uid(), date, title: title.trim() || "Приём", time, entries: [] };
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
      const meal = addMeal("Приём", nowTime());
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
  }

  function copyMeal(meal: Meal, targetDate: string, mode: "copy" | "move") {
    update((ms) => {
      const clone: Meal = {
        ...meal,
        id: uid(),
        date: targetDate,
        entries: meal.entries.map((e) => ({ ...e, id: uid() })),
      };
      const rest = mode === "move" ? ms.filter((m) => m.id !== meal.id) : ms;
      return [...rest, clone];
    });
  }

  function openPicker() {
    const el = dateInputRef.current;
    if (!el) return;
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") picker.showPicker();
    else el.click();
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
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          className="card relative flex-1 cursor-pointer py-2.5 text-center transition active:scale-[0.99]"
        >
          <div className="truncate text-sm font-semibold">{humanDate(date)}</div>
          <div className="truncate text-[11px] text-mute">{date.split("-").reverse().join(".")}</div>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
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

      {meals.map((meal) => {
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
                <div className="truncate text-sm font-semibold">{meal.title || "Приём"}</div>
                <div className="truncate text-[11px] text-mute">
                  {round(t.kcal)} ккал · Б {round(t.protein)} · Ж {round(t.fat)} · У {round(t.carbs)}
                </div>
              </div>
              <IconBtn onClick={() => copyMeal(meal, shiftDate(date, 1), "copy")} title="Копия на завтра" size={32}>
                <span className="text-lg leading-none">→</span>
              </IconBtn>
              <IconBtn onClick={() => copyMeal(meal, date, "copy")} title="Дублировать приём" size={32}>
                <span className="text-lg leading-none">↗</span>
              </IconBtn>
              <IconBtn onClick={() => setMoveMeal(meal)} title="Изменить приём" size={32}>
                <span className="text-sm">✎</span>
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
                const action = { mealId: meal.id, mealTitle: meal.title || "Приём", entry };
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

      <Sheet open={scanPick} onClose={() => setScanPick(false)} title="Сканировать штрихкод">
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
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{meal.title || "Приём"}</span>
              <span className="shrink-0 text-xs text-mute">{meal.entries.length} поз.</span>
            </button>
          ))}
          <Btn
            variant="soft"
            className="w-full"
            onClick={() => {
              const meal = addMeal("Приём", nowTime());
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

      <Sheet open={!!addTo} onClose={closeAddFood} title={`${addTo?.time} · ${addTo?.title || "Приём"}`} full>
        {addTo && (
          <AddFood
            key={addTo.id + addMode}
            products={state.products}
            recentProductIds={state.recentProductIds}
            mealTitle={addTo.title || "Приём"}
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
          />
        )}
      </Sheet>

      <Sheet open={newMeal} onClose={() => setNewMeal(false)} title="Новый приём пищи">
        <NewMealForm
          onCreate={(title, time) => {
            addMeal(title, time);
            setNewMeal(false);
          }}
        />
      </Sheet>

      <Sheet open={!!moveMeal} onClose={() => setMoveMeal(null)} title={moveMeal ? `«${moveMeal.title || "Приём"}»` : ""}>
        {moveMeal && (
          <MealMenu
            onEdit={() => {
              setEditMeal(moveMeal);
              setMoveMeal(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!timePick} onClose={() => setTimePick(null)} title={timePick ? `Время · ${timePick.title || "Приём"}` : "Время"}>
        {timePick && (
          <TimePicker
            value={timePick.time}
            onChange={(time) => {
              update((ms) => ms.map((m) => (m.id === timePick.id ? { ...m, time } : m)));
              setTimePick(null);
            }}
            onCustom={() => {
              setEditMeal(timePick);
              setTimePick(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!editMeal} onClose={() => setEditMeal(null)} title="Изменить приём пищи">
        {editMeal && (
          <NewMealForm
            initial={editMeal}
            submitLabel="Сохранить"
            onCreate={(title, time) => {
              update((ms) => ms.map((m) => (m.id === editMeal.id ? { ...m, title, time } : m)));
              setEditMeal(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!editEntry} onClose={() => setEditEntry(null)} title={editEntry?.entry.name || "Продукт"}>
        {editEntry && (
          <EntryEditor
            action={editEntry}
            onSave={(grams) => {
              updateEntry(editEntry.mealId, editEntry.entry.id, grams);
              setEditEntry(null);
            }}
            onMove={() => {
              setMoveEntry(editEntry);
              setEditEntry(null);
            }}
            onDelete={() => {
              removeEntry(editEntry.mealId, editEntry.entry.id);
              setEditEntry(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!moveEntry} onClose={() => setMoveEntry(null)} title="Перенести продукт">
        {moveEntry && (
          <EntryMoveSheet
            action={moveEntry}
            meals={meals}
            onMove={(targetId) => moveEntryTo(moveEntry, targetId)}
          />
        )}
      </Sheet>

      <Sheet open={!!deleteMeal} onClose={() => setDeleteMeal(null)} title="Удалить приём?">
        {deleteMeal && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              Удалить «{deleteMeal.title || "Приём"}» вместе со всеми продуктами? Это действие нельзя отменить.
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
                }}
              >
                Да, удалить
              </Btn>
            </div>
          </div>
        )}
      </Sheet>
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
  onSave,
  onMove,
  onDelete,
}: {
  action: EntryAction;
  onSave: (grams: number) => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const [grams, setGrams] = useState(String(action.entry.grams));
  const value = Math.max(0, Number(grams.replace(",", ".")) || 0);
  const total = entryTotals({ ...action.entry, grams: value });
  const quickValues = [30, 50, 100, 150, 200, 250, 300];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="font-semibold">{action.entry.name}</div>
        <div className="mt-1 text-xs text-mute">{action.mealTitle} · на 100 г: {action.entry.kcal} ккал</div>
      </div>
      <Field label="Количество, г / мл">
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => setGrams(String(Math.max(0, value - 10)))} title="Уменьшить на 10 г" size={44}>
            −
          </IconBtn>
          <input
            className="field text-center text-lg"
            inputMode="decimal"
            autoFocus
            value={grams}
            onChange={(event) => setGrams(event.target.value.replace(",", "."))}
          />
          <IconBtn onClick={() => setGrams(String(value + 10))} title="Увеличить на 10 г" size={44}>
            +
          </IconBtn>
        </div>
      </Field>
      <div className="flex flex-wrap justify-center gap-2">
        {quickValues.map((quick) => (
          <button
            type="button"
            key={quick}
            onClick={() => setGrams(String(quick))}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              value === quick ? "border-acc bg-acc/15 text-acc" : "border-line bg-panel2 hover:border-acc2/60"
            }`}
          >
            {quick}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Ккал", round(total.kcal)],
          ["Белки", round(total.protein, 1)],
          ["Жиры", round(total.fat, 1)],
          ["Углев.", round(total.carbs, 1)],
        ].map(([label, number]) => (
          <div key={label as string} className="card px-1.5 py-3">
            <div className="truncate text-lg font-bold">{number}</div>
            <div className="truncate text-[11px] text-mute">{label}</div>
          </div>
        ))}
      </div>
      <Btn className="w-full" disabled={value <= 0} onClick={() => onSave(value)}>
        Сохранить граммы
      </Btn>
      <div className="grid grid-cols-2 gap-2">
        <Btn variant="soft" onClick={onMove}>
          Перенести в другой приём
        </Btn>
        <Btn variant="danger" onClick={onDelete}>
          Удалить продукт
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
          <span className="min-w-0 flex-1 truncate font-medium">{meal.title || "Приём"}</span>
          <span className="text-lg text-acc">→</span>
        </button>
      ))}
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  onCustom,
}: {
  value: string;
  onChange: (time: string) => void;
  onCustom: () => void;
}) {
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
    <div className="space-y-4">
      <div>
        <p className="text-sm text-mute">Проведи пальцем по часам и минутам — выбранное значение будет в центре.</p>
        <div className="relative mt-4 grid grid-cols-2 gap-3 overflow-hidden rounded-2xl border border-line bg-panel2/60 p-2">
          <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-12 -translate-y-1/2 rounded-xl border border-acc/40 bg-acc/10" />
          <Wheel label="Часы" values={hours} value={selectedHour} onChange={setSelectedHour} scrollRef={hourRef} />
          <Wheel label="Минуты" values={minutes} value={selectedMinute} onChange={setSelectedMinute} scrollRef={minuteRef} />
        </div>
      </div>
      <Btn className="w-full" onClick={() => onChange(`${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`)}>
        Выбрать {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")}
      </Btn>
      <Btn variant="soft" className="w-full" onClick={onCustom}>Ввести точное время с клавиатуры</Btn>
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
      <div className="mb-1 text-center text-[10px] font-bold tracking-[.14em] text-mute uppercase">{label}</div>
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const box = event.currentTarget;
          const index = Math.max(0, Math.min(values.length - 1, Math.round((box.scrollTop + box.clientHeight / 2 - 104) / 48)));
          if (values[index] !== value) onChange(values[index]);
        }}
        className="h-52 touch-pan-y snap-y snap-mandatory select-none overflow-y-auto overscroll-contain py-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {values.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onChange(item)}
            className={`flex h-12 w-full snap-center items-center justify-center rounded-xl font-mono text-xl transition ${item === value ? "font-extrabold text-acc" : "text-mute/70"}`}
          >
            {String(item).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewMealForm({
  onCreate,
  initial,
  submitLabel = "Добавить",
}: {
  onCreate: (title: string, time: string) => void;
  initial?: Meal;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState(initial?.title === "Приём" ? "" : initial?.title ?? "");
  const [time, setTime] = useState(initial?.time ?? nowTime());
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-panel2/60 px-3 py-2 text-xs leading-relaxed text-mute">
        Название необязательно — если оставить поле пустым, приём будет называться «Приём». Время можно изменить позже.
      </div>
      <Field label="Название (необязательно)">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, После тренировки" />
      </Field>
      <Field label="Время приёма">
        <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Btn className="w-full" disabled={!time} onClick={() => onCreate(title.trim() || "Приём", time)}>
        {submitLabel}
      </Btn>
    </div>
  );
}

function MealMenu({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-mute">Измените название или время приёма пищи.</p>
      <Btn variant="soft" className="w-full" onClick={onEdit}>
        ✏️ Название / время
      </Btn>
    </div>
  );
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
