import { useEffect, useRef, useState } from "react";
import type { ActivityKey, AppState, Goal, Macros, Profile, Sex, Targets } from "../lib/types";
import { ACTIVITY, GOALS, MACRO_STEP, goalShiftText, round, stepMacro } from "../lib/nutrition";
import { emptyState, importState } from "../lib/storage";
import { updateProfile } from "../lib/profile";
import { copyText } from "../lib/clipboard";
import { buildMyProductsText, myProducts } from "../lib/productsText";
import { Btn, Field, Select, Sheet, numField } from "./ui";

/** Белок цели в читаемом виде: «2,2» — с запятой, как в остальном интерфейсе. */
function proteinPerKgText(goal: Goal) {
  return GOALS[goal].proteinPerKg.toFixed(1).replace(".", ",");
}

export default function ProfileView({
  state,
  setState,
  targets,
  currentWeight,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  targets: Targets;
  currentWeight: number;
}) {
  const p = state.profile!;
  const [resetOpen, setResetOpen] = useState(false);
  // Смена цели при ручных БЖУ сначала спрашивает подтверждение: цель заменит их расчётом.
  const [goalPending, setGoalPending] = useState<Goal | null>(null);
  const [productsNote, setProductsNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const productsNoteTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (productsNoteTimer.current !== null) window.clearTimeout(productsNoteTimer.current);
  }, []);

  // Свои продукты (не встроенная база): введённые вручную + найденные онлайн.
  const myCount = myProducts(state.products).length;

  async function copyMyProducts() {
    const done = await copyText(buildMyProductsText(state.products));
    setProductsNote(done ? "Скопировано — можно вставлять" : "Не получилось скопировать");
    if (productsNoteTimer.current !== null) window.clearTimeout(productsNoteTimer.current);
    productsNoteTimer.current = window.setTimeout(() => setProductsNote(null), 2500);
  }

  const patch = (d: Partial<Profile>) => setState((s) => updateProfile(s, d));

  /* ---------- замок настроек, цель и норма БЖУ ---------- */
  const locked = p.profileSettingsLocked ?? true;

  // Норма БЖУ: если человек задал её руками — это она. Пока не задал, показываем
  // расчёт по цели. Первое касание «−/+» или правка цифры фиксирует их как свои.
  const manual = p.macroTargets;
  const macros: Macros = manual ?? { protein: targets.protein, fat: targets.fat, carbs: targets.carbs };

  function setMacro(key: keyof Macros, value: number) {
    patch({ macroTargets: { ...macros, [key]: stepMacro(value) } });
  }

  /** Без ручных БЖУ норма пересчитывается сразу, с ними — сначала подтверждение. */
  function chooseGoal(goal: Goal) {
    if (goal === p.goal && !manual) return;
    if (manual) setGoalPending(goal);
    else patch({ goal });
  }

  function applyPendingGoal() {
    if (goalPending) patch({ goal: goalPending, macroTargets: undefined });
    setGoalPending(null);
  }

  function toggleSettingsLock() {
    patch({ profileSettingsLocked: !locked });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nutri-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        setState(importState(JSON.parse(String(r.result))));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Не удалось прочитать файл");
      }
    };
    r.readAsText(file);
  }

  return (
    <div className="profile-view space-y-3 pb-28">
      <header className="flex items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Профиль</h1>
          <p className="mt-0.5 text-xs text-mute">Параметры и личная норма</p>
        </div>
        <button type="button" onClick={toggleSettingsLock} aria-pressed={!locked}
          aria-label={locked ? "Разблокировать цель, норму калорий и параметры" : "Заблокировать цель, норму калорий и параметры"}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-panel2 px-3 text-xs font-medium transition hover:border-acc2/60">
          <span aria-hidden="true">{locked ? "🔒" : "🔓"}</span>{locked ? "Изменить" : "Готово"}
        </button>
      </header>

      <section className="card space-y-3 p-4" aria-labelledby="daily-target-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="daily-target-title" className="text-sm font-semibold">Норма на день</h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] ${manual ? "bg-warn/10 text-warn" : "bg-acc2/10 text-acc2"}`}>
            {manual ? "Вручную" : "По формуле"}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{targets.calories}</span>
          <span className="text-sm text-mute">ккал / день</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([ ["Белки", macros.protein], ["Жиры", macros.fat], ["Углеводы", macros.carbs] ] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-panel2/60 px-2 py-2.5 text-center">
              <div className="text-[11px] text-mute">{label}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}<span className="ml-1 text-xs font-normal text-mute">г</span></div>
            </div>
          ))}
        </div>
        <p className="text-xs text-mute">{GOALS[p.goal].label} · {round(currentWeight, 1)} кг{!manual && " · Миффлин–Сан Жеор"}</p>
        {!locked && (
          <div className="space-y-2 border-t border-line/60 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-medium text-mute">Настроить БЖУ</h3>
              <Btn variant="ghost" size="sm" disabled={!manual} onClick={() => patch({ macroTargets: undefined })}>↺ По цели</Btn>
            </div>
            <MacroRow label="Белки" step={MACRO_STEP.protein} value={macros.protein} onCommit={(value) => setMacro("protein", value)} />
            <MacroRow label="Жиры" step={MACRO_STEP.fat} value={macros.fat} onCommit={(value) => setMacro("fat", value)} />
            <MacroRow label="Углеводы" step={MACRO_STEP.carbs} value={macros.carbs} onCommit={(value) => setMacro("carbs", value)} />
            <p className="text-[11px] leading-relaxed text-mute">{manual ? "БЖУ фиксированы. «По цели» вернёт автоматический расчёт." : "Правка БЖУ включает ручной режим."}</p>
            <details className="text-xs text-mute">
              <summary className="cursor-pointer py-2">Как считается норма</summary>
              <div className="space-y-2 pb-1 leading-relaxed">
                <p>Основной обмен (BMR): {targets.bmr} ккал. Расход с активностью (TDEE): {targets.tdee} ккал.</p>
                <p>По цели: {goalShiftText(p.goal)}, белок {proteinPerKgText(p.goal)} г/кг. Калории из БЖУ: белки и углеводы — 4 ккал/г, жиры — 9 ккал/г.</p>
                <p>Шаг кнопок: белки ±10 г, жиры ±5 г, углеводы ±100 г. Значения можно вписать вручную.</p>
              </div>
            </details>
          </div>
        )}
      </section>

      {!locked && (
        <>
          <section className="card space-y-3 p-4" aria-labelledby="parameters-title">
            <h2 id="parameters-title" className="text-sm font-semibold">Параметры тела</h2>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Пол">
              {(["male", "female"] as Sex[]).map((sex) => (
                <button key={sex} type="button" aria-pressed={p.sex === sex} onClick={() => patch({ sex })}
                  className={`min-h-11 rounded-xl border text-sm transition ${p.sex === sex ? "border-acc/60 bg-acc/10 text-ink" : "border-line bg-panel2/40 text-mute"}`}>
                  {sex === "male" ? "Мужчина" : "Женщина"}
                </button>
              ))}
            </div>
            <div className="profile-parameters">
              <label><span>Возраст <small>лет</small></span><ParameterInput value={p.age} min={13} max={100} onCommit={(age) => patch({ age })} /></label>
              <label><span>Рост <small>см</small></span><ParameterInput value={p.height} min={100} max={250} onCommit={(height) => patch({ height })} /></label>
              <label><span>Вес <small>кг</small></span><ParameterInput value={currentWeight} min={20} max={400} step={0.1} onCommit={(startWeight) => patch({ startWeight })} /></label>
            </div>
            <Field label="Активность">
              <Select value={p.activity} onChange={(activity) => patch({ activity })}
                options={(Object.keys(ACTIVITY) as ActivityKey[]).map((a) => ({ key: a, label: ACTIVITY[a].label, hint: ACTIVITY[a].hint }))} />
            </Field>
            <p className="text-[11px] leading-relaxed text-mute">Вес сохраняется за сегодня. {manual ? "Для пересчёта БЖУ нажми «По цели»." : "Норма пересчитывается автоматически."}</p>
          </section>

          <section className="card space-y-3 p-4" aria-labelledby="goal-title">
            <h2 id="goal-title" className="text-sm font-semibold">Цель питания</h2>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Цель питания">
              {(Object.keys(GOALS) as Goal[]).map((g) => (
                <button key={g} type="button" aria-pressed={p.goal === g} onClick={() => chooseGoal(g)}
                  className={`flex min-h-14 items-center justify-center rounded-xl border px-1 py-2 text-center text-xs leading-snug transition ${p.goal === g ? "border-acc/60 bg-acc/10 text-ink" : "border-line bg-panel2/40 text-mute"}`}>
                  {GOALS[g].label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-mute">{goalShiftText(p.goal)} · белок {proteinPerKgText(p.goal)} г/кг</p>
          </section>
        </>
      )}

      <section className="card space-y-3 p-4" aria-labelledby="data-title">
        <div>
          <h2 id="data-title" className="text-sm font-semibold">Мои данные</h2>
          <p className="mt-1 text-[11px] text-mute">Хранятся на этом устройстве</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="soft" size="sm" className="min-h-11" title="Сохранить резервную копию JSON" onClick={exportData}>Сохранить копию</Btn>
          <Btn variant="soft" size="sm" className="min-h-11" title="Загрузить резервную копию JSON" onClick={() => fileRef.current?.click()}>Загрузить копию</Btn>
        </div>
        <Btn variant="ghost" size="sm" disabled={!myCount} onClick={copyMyProducts} className="min-h-11 w-full">
          Скопировать мои продукты · {myCount}
        </Btn>
        <p role="status" className="text-[11px] text-mute">{productsNote ?? (!myCount ? "Здесь появятся продукты, добавленные тобой." : "Название и БЖУ текстом, без встроенной базы.")}</p>
        <details className="border-t border-line/60 pt-2 text-xs text-mute">
          <summary className="cursor-pointer py-2">Удаление данных</summary>
          <p className="py-2 leading-relaxed">Сброс удалит профиль, дневник и историю веса. Сначала сохрани копию.</p>
          <Btn variant="danger" size="sm" className="min-h-11 w-full" onClick={() => setResetOpen(true)}>Сбросить все данные</Btn>
        </details>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importData(file);
          e.target.value = "";
        }} />
      </section>

      <Sheet open={goalPending !== null} onClose={() => setGoalPending(null)} title="Заменить норму БЖУ?" center>
        {goalPending && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              Ты задал БЖУ руками: Б {macros.protein} · Ж {macros.fat} · У {macros.carbs} г. Цель «{GOALS[goalPending].label}» заменит их
              расчётом по цели: {goalShiftText(goalPending)}, белок {proteinPerKgText(goalPending)} г на кг. Свои цифры потом можно
              вписать заново.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="soft" onClick={() => setGoalPending(null)}>
                Оставить свои
              </Btn>
              <Btn onClick={applyPendingGoal}>Заменить</Btn>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Сбросить все данные?" center>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-mute">
            Профиль, дневник, продукты и история веса будут удалены. Это действие нельзя отменить.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="soft" onClick={() => setResetOpen(false)}>
              Нет
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setState(emptyState);
                setResetOpen(false);
              }}
            >
              Да, сбросить
            </Btn>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/**
 * Строка БЖУ в настройках: «Углеводы  [−] 150 [+]». Цифру можно вписать руками
 * (значение фиксируется по «Готово» или уходу из поля), а кнопки прибавляют
 * и убавляют шаг — у углеводов это 100 г за одно нажатие.
 */
function MacroRow({
  label,
  value,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  step: number;
  onCommit: (value: number) => void;
}) {
  // Пока человек печатает, поле живёт своей строкой: иначе «1» из «154» сразу
  // превращалась бы в число и курсор прыгал.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  function commit() {
    onCommit(stepMacro(Number(shown.replace(",", "."))));
    setDraft(null);
  }

  const stepBtn =
    "grid size-9 shrink-0 place-items-center rounded-full border border-line bg-panel2 text-lg leading-none font-semibold text-ink transition hover:border-acc2/60 active:scale-90";

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel2/60 py-1.5 pr-2 pl-3">
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <button
        type="button"
        onClick={() => {
          setDraft(null);
          onCommit(stepMacro(value, -step));
        }}
        title={`Убавить на ${step} г`}
        aria-label={`${label}: убавить ${step} г`}
        className={stepBtn}
      >
        −
      </button>
      <label className="relative block">
        <input
          {...numField}
          inputMode="numeric"
          value={shown}
          aria-label={`${label}, граммы`}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          // Размер и отступы заданы инлайном: у .field они прописаны в CSS и
          // перебивают utility-классы, а «г» внутри поля занимает место справа.
          style={{ width: "4.75rem", padding: ".5rem 1.05rem .5rem .35rem" }}
          className="field compact text-center font-semibold"
        />
        <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-mute">г</span>
      </label>
      <button
        type="button"
        onClick={() => {
          setDraft(null);
          onCommit(stepMacro(value, step));
        }}
        title={`Прибавить ${step} г`}
        aria-label={`${label}: прибавить ${step} г`}
        className={stepBtn}
      >
        +
      </button>
    </div>
  );
}

/** Keep an empty draft while typing, but never put zero/NaN into persisted settings. */
function ParameterInput({ value, min, max, step = 1, onCommit }: {
  value: number; min: number; max: number; step?: number; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input className="field compact" type="number" inputMode={step < 1 ? "decimal" : "numeric"}
    min={min} max={max} step={step} value={draft ?? value}
    onChange={(event) => {
      const text = event.target.value;
      setDraft(text);
      const number = Number(text.replace(",", "."));
      if (text.trim() && Number.isFinite(number) && number >= min && number <= max && (step < 1 || Number.isInteger(number))) onCommit(number);
    }}
    onBlur={() => setDraft(null)} />;
}
