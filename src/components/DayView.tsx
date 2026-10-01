import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Meal, MealEntry, Product, Targets } from "../lib/types";
import { dayTotals, entryTotals, humanDate, round, shiftDate, sumTotals, today } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { Bar, Btn, Empty, Field, IconBtn, Ring, Sheet } from "./ui";
import AddFood from "./AddFood";

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
  const [addMode, setAddMode] = useState<"search" | "scan" | "photo">("search");
  const [photoFirst, setPhotoFirst] = useState(false);
  const [scanPick, setScanPick] = useState(false);
  const [newMeal, setNewMeal] = useState(false);
  const [moveMeal, setMoveMeal] = useState<Meal | null>(null);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [timePick, setTimePick] = useState<Meal | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const meals = useMemo(
    () => state.meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [state.meals, date],
  );
  const totals = dayTotals(meals);
  const left = Math.max(0, targets.calories - totals.kcal);

  const update = (fn: (ms: Meal[]) => Meal[]) => setState((s) => ({ ...s, meals: fn(s.meals) }));

  function addMeal(title: string, time: string): Meal {
    const meal = { id: uid(), date, title, time, entries: [] };
    update((ms) => [...ms, meal]);
    return meal;
  }

  function openPhotoAdd() {
    // Фото — быстрый сценарий: не заставляем пользователя сначала создавать
    // отдельную карточку. Используем последний приём или создаём нейтральный.
    const target = meals[meals.length - 1] ?? addMeal("Новый приём", currentTime());
    setAddMode("photo");
    setAddTo(target);
  }

  function currentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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

  function openPicker() {
    const el = dateInputRef.current;
    if (!el) return;
    // showPicker — современный стандарт без «прозрачного» инпута поверх текста,
    // который на части браузеров всё равно рисовал свой текст поверх нашего.
    if (typeof (el as any).showPicker === "function") (el as any).showPicker();
    else el.click();
  }

  return (
    <div className="space-y-4 pb-32">
      {/* навигация по дате */}
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

      {/* итоги дня */}
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
                осталось <b className="text-white">{round(left)}</b> ккал
              </>
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
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <button
                onClick={() => setTimePick(meal)}
                title="Выбрать время"
                className="shrink-0 rounded-lg bg-acc/12 px-2.5 py-1.5 font-mono text-xs font-semibold whitespace-nowrap text-acc2 transition hover:bg-acc/20"
              >
                {meal.time}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{meal.title}</div>
                <div className="truncate text-[11px] text-mute">
                  {round(t.kcal)} ккал · Б {round(t.protein)} · Ж {round(t.fat)} · У {round(t.carbs)}
                </div>
              </div>
              <IconBtn onClick={() => copyMeal(meal, shiftDate(date, 1), "copy")} title="Скопировать на завтра" size={34}>
                <span className="text-sm">📋</span>
              </IconBtn>
              <IconBtn onClick={() => setMoveMeal(meal)} title="Ещё" size={34}>
                ⋯
              </IconBtn>
            </div>

            <div className="divide-y divide-line">
              {meal.entries.map((e) => {
                const et = entryTotals(e);
                return (
                  <div key={e.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{e.name}</div>
                      <div className="truncate text-[11px] text-mute">
                        {round(e.grams)} г · Б {round(et.protein, 1)} · Ж {round(et.fat, 1)} · У {round(et.carbs, 1)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-medium">{round(et.kcal)}</div>
                    <button
                      onClick={() => removeEntry(meal.id, e.id)}
                      className="shrink-0 text-mute opacity-60 transition hover:text-bad hover:opacity-100"
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
              className="w-full border-t border-line py-2.5 text-sm font-semibold text-acc transition hover:bg-acc/5 active:bg-acc/10"
            >
              + Добавить продукт
            </button>
          </div>
        );
      })}

      {!meals.length && <Empty icon="🍽" text="Добавь первый приём пищи на этот день" />}

      <div className="rounded-3xl border border-acc/25 bg-gradient-to-br from-acc/12 via-panel to-panel p-4 shadow-lg shadow-black/10">
        <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-acc uppercase">Главный инструмент</div>
        <div className="text-lg font-bold">Сними таблицу БЖУ</div>
        <p className="mt-1 max-w-[34rem] text-xs leading-relaxed text-mute">Фото пищевой ценности на 100 г — приложение распознает калории, белки, жиры и углеводы. Без штрихкода и долгого поиска.</p>
        <Btn className="mt-3 w-full" onClick={openPhotoAdd}>📸 Добавить продукт по фото</Btn>
      </div>
      <div className="flex gap-2">
        <Btn variant="soft" className="flex-1" onClick={() => setNewMeal(true)}>+ Новый приём пищи</Btn>
        <Btn variant="soft" className="shrink-0 !px-4" title="Дополнительные способы поиска" onClick={() => setScanPick(true)}>⋯</Btn>
      </div>

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
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition hover:border-acc/60 active:scale-[0.99]"
            >
              <span className="shrink-0 rounded-lg bg-panel px-2 py-1 font-mono text-xs whitespace-nowrap text-acc2">
                {m.time}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.title}</span>
              <span className="shrink-0 text-xs text-mute">{m.entries.length} поз.</span>
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
            recentProductIds={state.recentProductIds}
            mealTitle={addTo.title}
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
            onAdd={(e) => addEntry(addTo.id, e)}
            onClose={() => {
              setAddTo(null);
              setAddMode("search");
            }}
          />
        )}
      </Sheet>

      {/* Новый приём пищи */}
      <Sheet open={newMeal} onClose={() => { setNewMeal(false); setPhotoFirst(false); }} title="Новый приём пищи">
        <NewMealForm
          onCreate={(title, time) => {
            const meal = addMeal(title, time);
            setNewMeal(false);
            if (photoFirst) {
              setPhotoFirst(false);
              setAddMode("photo");
              setAddTo(meal);
            }
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

      {/* Быстрый выбор времени прямо из карточки */}
      <Sheet open={!!timePick} onClose={() => setTimePick(null)} title={timePick ? `Время · ${timePick.title}` : "Время"}>
        {timePick && (
          <TimePicker
            value={timePick.time}
            onChange={(time) => {
              update((ms) => ms.map((m) => (m.id === timePick.id ? { ...m, time } : m)));
              setTimePick(null);
            }}
            onCustom={() => { setEditMeal(timePick); setTimePick(null); }}
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

function TimePicker({
  value,
  onChange,
  onCustom,
}: {
  value: string;
  onChange: (time: string) => void;
  onCustom: () => void;
}) {
  const [hour, minute] = value.split(":").map(Number);
  const [selectedHour, setSelectedHour] = useState(hour || 12);
  const [selectedMinute, setSelectedMinute] = useState(minute || 0);
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
        <p className="text-sm text-mute">Проведи пальцем по часам или минутам. Выбранное значение будет в центре.</p>
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
        className="h-52 snap-y snap-mandatory overflow-y-auto overscroll-contain py-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {values.map((item) => (
          <button
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
  const [title, setTitle] = useState(initial?.title ?? "");
  const [time, setTime] = useState(initial?.time ?? "12:00");
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-panel2/60 px-3 py-2 text-xs leading-relaxed text-mute">Дай приёму своё название — например, «После тренировки» или «Поздний ужин». Время потом можно изменить нажатием на него в карточке.</div>
      <Field label="Название">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, После тренировки" />
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
          ♻️ Дублировать
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
