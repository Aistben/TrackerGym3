import { useMemo, useState } from "react";
import type { AppState, Meal, MealEntry, Product, Targets } from "../lib/types";
import { dayTotals, entryTotals, humanDate, round, shiftDate, sumTotals, today } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { Bar, Btn, Empty, Field, Ring, Sheet } from "./ui";
import AddFood from "./AddFood";

const PRESETS = [
  { title: "Завтрак", time: "08:30" },
  { title: "Перекус", time: "11:00" },
  { title: "Обед", time: "13:30" },
  { title: "Полдник", time: "16:30" },
  { title: "Ужин", time: "19:00" },
  { title: "Перед сном", time: "22:00" },
];

export default function DayView({
  state,
  setState,
  targets,
  date,
  setDate,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  targets: Targets;
  date: string;
  setDate: (d: string) => void;
}) {
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [addMode, setAddMode] = useState<"search" | "scan">("search");
  const [scanPick, setScanPick] = useState(false);
  const [newMeal, setNewMeal] = useState(false);
  const [moveMeal, setMoveMeal] = useState<Meal | null>(null);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);

  const meals = useMemo(
    () => state.meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [state.meals, date],
  );
  const totals = dayTotals(meals);
  const left = Math.max(0, targets.calories - totals.kcal);

  const update = (fn: (ms: Meal[]) => Meal[]) => setState((s) => ({ ...s, meals: fn(s.meals) }));

  function addMeal(title: string, time: string) {
    update((ms) => [...ms, { id: uid(), date, title, time, entries: [] }]);
  }

  function addEntry(mealId: string, e: MealEntry) {
    update((ms) => ms.map((m) => (m.id === mealId ? { ...m, entries: [...m.entries, e] } : m)));
  }

  function removeEntry(mealId: string, entryId: string) {
    update((ms) => ms.map((m) => (m.id === mealId ? { ...m, entries: m.entries.filter((e) => e.id !== entryId) } : m)));
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

  return (
    <div className="space-y-4 pb-28">
      {/* навигация по дате */}
      <div className="flex items-center gap-2">
        <button onClick={() => setDate(shiftDate(date, -1))} className="card grid size-10 shrink-0 place-items-center text-lg">
          ‹
        </button>
        <div className="card relative flex-1 py-2 text-center">
          <div className="text-sm font-semibold">{humanDate(date)}</div>
          <div className="text-[11px] text-mute">{date.split("-").reverse().join(".")}</div>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} className="card grid size-10 shrink-0 place-items-center text-lg">
          ›
        </button>
        {date !== today() && (
          <button onClick={() => setDate(today())} className="card shrink-0 px-3 py-2 text-xs text-acc">
            сегодня
          </button>
        )}
      </div>

      {/* итоги дня */}
      <div className="card flex items-center gap-4 p-4">
        <Ring
          value={totals.kcal}
          max={targets.calories}
          label={round(totals.kcal)}
          sub={`из ${targets.calories} ккал`}
        />
        <div className="flex-1 space-y-3">
          <div className="text-xs text-mute">
            {totals.kcal > targets.calories ? (
              <span className="text-warn">перебор {round(totals.kcal - targets.calories)} ккал</span>
            ) : (
              <>осталось <b className="text-white">{round(left)}</b> ккал</>
            )}
          </div>
          <MacroLine label="Белки" value={totals.protein} max={targets.protein} color="var(--color-acc2)" />
          <MacroLine label="Жиры" value={totals.fat} max={targets.fat} color="var(--color-warn)" />
          <MacroLine label="Углеводы" value={totals.carbs} max={targets.carbs} color="var(--color-acc)" />
        </div>
      </div>

      {/* приёмы пищи */}
      {meals.map((meal) => {
        const t = sumTotals(meal.entries);
        return (
          <div key={meal.id} className="card rise overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="rounded-lg bg-panel2 px-2 py-1 font-mono text-xs text-acc2">{meal.time}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{meal.title}</div>
                <div className="text-[11px] text-mute">
                  {round(t.kcal)} ккал · Б {round(t.protein)} · Ж {round(t.fat)} · У {round(t.carbs)}
                </div>
              </div>
              <button
                onClick={() => copyMeal(meal, shiftDate(date, 1), "copy")}
                title="Скопировать на завтра"
                className="rounded-lg border border-line px-2 py-1.5 text-xs transition hover:border-acc/60 hover:text-acc"
              >
                → завтра
              </button>
              <button onClick={() => setMoveMeal(meal)} className="px-1 text-mute transition hover:text-white" title="Ещё">
                ⋯
              </button>
            </div>

            <div className="divide-y divide-line">
              {meal.entries.map((e) => {
                const et = entryTotals(e);
                return (
                  <div key={e.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{e.name}</div>
                      <div className="text-[11px] text-mute">
                        {round(e.grams)} г · Б {round(et.protein, 1)} · Ж {round(et.fat, 1)} · У {round(et.carbs, 1)}
                      </div>
                    </div>
                    <div className="text-sm font-medium">{round(et.kcal)}</div>
                    <button
                      onClick={() => removeEntry(meal.id, e.id)}
                      className="text-mute opacity-60 transition hover:text-bad hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {!meal.entries.length && <div className="px-4 py-3 text-xs text-mute">Пока пусто</div>}
            </div>

            <button
              onClick={() => {
                setAddMode("search");
                setAddTo(meal);
              }}
              className="w-full border-t border-line py-2.5 text-sm font-medium text-acc transition hover:bg-acc/5"
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

      {/* Быстрый скан штрихкода */}
      <button
        onClick={() => setScanPick(true)}
        title="Сканировать штрихкод"
        className="fixed right-4 bottom-20 z-40 grid size-14 place-items-center rounded-full bg-acc text-2xl text-ink shadow-lg shadow-acc/20 transition active:scale-95"
      >
        📷
      </button>

      <Sheet open={scanPick} onClose={() => setScanPick(false)} title="Сканировать штрихкод">
        <div className="space-y-3">
          <p className="text-sm text-mute">Куда добавить найденный продукт?</p>
          {meals.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setAddMode("scan");
                setAddTo(m);
                setScanPick(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition hover:border-acc/60"
            >
              <span className="rounded-lg bg-panel px-2 py-1 font-mono text-xs text-acc2">{m.time}</span>
              <span className="flex-1 text-sm font-medium">{m.title}</span>
              <span className="text-xs text-mute">{m.entries.length} поз.</span>
            </button>
          ))}
          <Btn
            variant="soft"
            className="w-full"
            onClick={() => {
              const now = new Date();
              const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
              const meal: Meal = { id: uid(), date, title: "Перекус", time, entries: [] };
              update((ms) => [...ms, meal]);
              setAddMode("scan");
              setAddTo(meal);
              setScanPick(false);
            }}
          >
            ➕ Новый приём пищи сейчас
          </Btn>
        </div>
      </Sheet>

      {/* Лист добавления продукта */}
      <Sheet
        open={!!addTo}
        onClose={() => {
          setAddTo(null);
          setAddMode("search");
        }}
        title={`${addTo?.time} · ${addTo?.title}`}
        full
      >
        {addTo && (
          <AddFood
            key={addTo.id + addMode}
            products={state.products}
            mealTitle={addTo.title}
            startMode={addMode}
            onSaveProduct={(p: Product) =>
              setState((s) => ({ ...s, products: [p, ...s.products.filter((x) => x.id !== p.id)] }))
            }
            onAdd={(e) => addEntry(addTo.id, e)}
            onClose={() => {
              setAddTo(null);
              setAddMode("search");
            }}
          />
        )}
      </Sheet>

      {/* Новый приём пищи */}
      <Sheet open={newMeal} onClose={() => setNewMeal(false)} title="Новый приём пищи">
        <NewMealForm
          onCreate={(title, time) => {
            addMeal(title, time);
            setNewMeal(false);
          }}
        />
      </Sheet>

      {/* Меню приёма пищи */}
      <Sheet open={!!moveMeal} onClose={() => setMoveMeal(null)} title={moveMeal ? `«${moveMeal.title}»` : ""}>
        {moveMeal && (
          <MealMenu
            meal={moveMeal}
            onCopy={(d, mode) => {
              copyMeal(moveMeal, d, mode);
              setMoveMeal(null);
              if (mode === "move") setDate(d);
            }}
            onEdit={() => {
              setEditMeal(moveMeal);
              setMoveMeal(null);
            }}
            onDelete={() => {
              update((ms) => ms.filter((m) => m.id !== moveMeal.id));
              setMoveMeal(null);
            }}
          />
        )}
      </Sheet>

      {/* Редактирование названия/времени */}
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
    </div>
  );
}

function MacroLine({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-mute">{label}</span>
        <span>
          {round(value)} / {max} г
        </span>
      </div>
      <Bar value={value} max={max} color={color} />
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
  const [title, setTitle] = useState(initial?.title ?? "");
  const [time, setTime] = useState(initial?.time ?? "12:00");
  return (
    <div className="space-y-3">
      {!initial && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.title}
              onClick={() => {
                setTitle(p.title);
                setTime(p.time);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                title === p.title ? "border-acc bg-acc/15 text-acc" : "border-line bg-panel2"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
      <Field label="Название">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Обед" />
      </Field>
      <Field label="Время приёма">
        <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Btn className="w-full" disabled={!title.trim()} onClick={() => onCreate(title.trim(), time)}>
        {submitLabel}
      </Btn>
    </div>
  );
}

function MealMenu({
  meal,
  onCopy,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  onCopy: (date: string, mode: "copy" | "move") => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [target, setTarget] = useState(shiftDate(meal.date, 1));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Btn variant="soft" onClick={() => onCopy(shiftDate(meal.date, 1), "copy")}>
          📋 Копия на завтра
        </Btn>
        <Btn variant="soft" onClick={() => onCopy(meal.date, "copy")}>
          ♻️ Дублировать сегодня
        </Btn>
      </div>
      <div className="card space-y-3 p-3">
        <Field label="Другая дата">
          <input type="date" className="field" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={() => onCopy(target, "copy")}>Копировать</Btn>
          <Btn variant="soft" onClick={() => onCopy(target, "move")}>
            Перенести
          </Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Btn variant="soft" onClick={onEdit}>
          ✏️ Название / время
        </Btn>
        <Btn variant="danger" onClick={onDelete}>
          Удалить
        </Btn>
      </div>
    </div>
  );
}
