import { useRef, useState } from "react";
import type { ActivityKey, AppState, Goal, Macros, Profile, Sex, Targets } from "../lib/types";
import { ACTIVITY, GOALS, MACRO_STEP, goalShiftText, round, stepMacro } from "../lib/nutrition";
import { emptyState, normalizeState } from "../lib/storage";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (d: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile!, ...d } }));

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
    if (goal === p.goal) return;
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
        setState(normalizeState(JSON.parse(String(r.result))));
      } catch {
        alert("Не удалось прочитать файл");
      }
    };
    r.readAsText(file);
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Цель, норма калорий и параметры</h3>
          <p className="mt-1 text-xs leading-snug text-mute">
            {locked
              ? "Настройки скрыты. Разблокируйте, чтобы изменить."
              : "Настройки открыты. Нажмите замок, чтобы скрыть и защитить их."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSettingsLock}
          title={locked ? "Показать и изменить настройки" : "Скрыть и защитить все настройки"}
          aria-label={locked ? "Разблокировать цель, норму калорий и параметры" : "Заблокировать цель, норму калорий и параметры"}
          aria-pressed={locked}
          className={`grid size-10 shrink-0 place-items-center rounded-full border text-lg transition active:scale-90 ${
            locked ? "border-acc/60 bg-acc/15 text-acc" : "border-line bg-panel2 text-mute hover:text-ink"
          }`}
        >
          {locked ? "🔒" : "🔓"}
        </button>
      </div>

      {!locked && (
        <>
          <div className="card space-y-3 p-4">
            <h3 className="text-sm font-semibold">Цель</h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GOALS) as Goal[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={p.goal === g}
                  onClick={() => chooseGoal(g)}
                  className={`rounded-xl border px-2 py-3 text-center text-xs leading-tight transition active:scale-[0.97] ${
                    p.goal === g ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel2 hover:border-acc2/40"
                  }`}
                >
                  <div className="text-lg">{GOALS[g].emoji}</div>
                  <span className="mt-1 block text-[11px] leading-tight">{GOALS[g].label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs leading-snug text-mute">
              {GOALS[p.goal].desc}. База нормы: {goalShiftText(p.goal)}, белок {proteinPerKgText(p.goal)} г на кг веса.
            </p>
          </div>

          <div className="card space-y-3 p-4">
            <h3 className="text-sm font-semibold">Норма калорий и БЖУ</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="BMR" value={targets.bmr} />
              <Mini label="TDEE" value={targets.tdee} />
              <Mini label="Калории" value={targets.calories} accent />
            </div>

            <div className="space-y-2">
              <MacroRow
                label="Белки"
                step={MACRO_STEP.protein}
                value={macros.protein}
                onCommit={(value) => setMacro("protein", value)}
              />
              <MacroRow label="Жиры" step={MACRO_STEP.fat} value={macros.fat} onCommit={(value) => setMacro("fat", value)} />
              <MacroRow
                label="Углеводы"
                step={MACRO_STEP.carbs}
                value={macros.carbs}
                onCommit={(value) => setMacro("carbs", value)}
              />
            </div>

            <div className="rounded-xl border border-acc2/20 bg-acc2/8 p-3 text-xs leading-relaxed text-mute">
              <span className="font-semibold text-acc2">Норму задаёшь ты:</span> «−» и «+» меняют цифру на шаг (белки ±10, жиры ±5, углеводы ±100 г), а саму цифру можно вписать с клавиатуры. Калории считаются из БЖУ: белки и углеводы — по 4 ккал/г, жиры — 9 ккал/г.
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-xs leading-snug text-mute">
                {manual
                  ? "Свои БЖУ, заданы руками. «↺ По цели» вернёт расчёт по цели."
                  : `Расчёт по цели «${GOALS[p.goal].label}», формула Миффлина–Сан Жеора, вес текущий ${round(currentWeight, 1)} кг.`}
              </p>
              <Btn
                variant="soft"
                size="sm"
                title="Вернуть норму, рассчитанную по цели"
                disabled={!manual}
                onClick={() => patch({ macroTargets: undefined })}
                className="shrink-0 whitespace-nowrap"
              >
                ↺ По цели
              </Btn>
            </div>
          </div>

          <div className="card space-y-3 p-4">
            <h3 className="text-sm font-semibold">Параметры</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => patch({ sex: s })}
                  className={`rounded-xl border py-2 text-sm font-medium transition active:scale-[0.97] ${
                    p.sex === s ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel2 hover:border-acc2/40"
                  }`}
                >
                  {s === "male" ? "Мужчина" : "Женщина"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Возраст">
                <input className="field compact" inputMode="numeric" type="number" min={13} max={100} value={p.age} onChange={(e) => patch({ age: +e.target.value || 0 })} />
              </Field>
              <Field label="Рост, см">
                <input
                  className="field compact"
                  inputMode="numeric"
                  type="number"
                  min={100}
                  max={250}
                  value={p.height}
                  onChange={(e) => patch({ height: +e.target.value || 0 })}
                />
              </Field>
              <Field label="Стартовый вес, кг">
                <input
                  className="field compact"
                  inputMode="decimal"
                  type="number"
                  min={20}
                  max={400}
                  step="0.1"
                  value={p.startWeight}
                  onChange={(e) => patch({ startWeight: +e.target.value.replace(",", ".") || 0 })}
                />
              </Field>
            </div>
            <Field label="Активность">
              <Select
                value={p.activity}
                onChange={(activity) => patch({ activity })}
                options={(Object.keys(ACTIVITY) as ActivityKey[]).map((a) => ({
                  key: a,
                  label: ACTIVITY[a].label,
                  hint: ACTIVITY[a].hint,
                }))}
              />
            </Field>
          </div>
        </>
      )}

      <div className="card space-y-2 p-4">
        <h3 className="text-sm font-semibold">Данные</h3>
        <div className="grid grid-cols-3 gap-1.5">
          <Btn
            variant="soft"
            size="sm"
            title="Сохранить данные в файл"
            onClick={exportData}
            className="min-w-0 min-h-9 whitespace-nowrap !gap-1 !px-1 !py-2 text-[11px] leading-none max-[360px]:text-[10px]"
          >
            Сохранить
          </Btn>
          <Btn
            variant="soft"
            size="sm"
            title="Загрузить данные из файла"
            onClick={() => fileRef.current?.click()}
            className="min-w-0 min-h-9 whitespace-nowrap !gap-1 !px-1 !py-2 text-[11px] leading-none max-[360px]:text-[10px]"
          >
            Загрузить
          </Btn>
          <Btn
            variant="danger"
            size="sm"
            title="Сбросить все данные"
            onClick={() => setResetOpen(true)}
            className="min-w-0 min-h-9 whitespace-nowrap !gap-1 !px-1 !py-2 text-[11px] leading-none max-[360px]:text-[10px]"
          >
            Сбросить
          </Btn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
        />
      </div>

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

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-panel2 py-3">
      <div className={`text-lg font-bold ${accent ? "text-acc" : ""}`}>{value}</div>
      <div className="text-[11px] text-mute">{label}</div>
    </div>
  );
}
