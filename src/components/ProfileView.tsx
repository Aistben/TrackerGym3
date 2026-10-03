import { useEffect, useRef, useState } from "react";
import type { ActivityKey, AppState, Goal, Profile, Sex, Targets } from "../lib/types";
import { ACTIVITY, GOALS, round } from "../lib/nutrition";
import { emptyState } from "../lib/storage";
import { ADJUST_LIMIT, formatAdjust, pushValue, undoTarget } from "../lib/adjust";
import { Btn, Field, Select, Sheet } from "./ui";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (d: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile!, ...d } }));

  /* ---------- ручная корректировка калорий: замок и возврат ---------- */
  const locked = !!p.calorieAdjustLocked;
  // История лежит в профиле (localStorage), а не в состоянии вкладки: даже если
  // значение случайно сдвинули, ушли с экрана и вернулись — стрелка ↩ помнит,
  // какое число было до этого.
  const history = p.calorieAdjustHistory ?? [];
  const setHistory = (next: number[]) => patch({ calorieAdjustHistory: next });
  // Перетаскивание слайдера вызывает onChange десятки раз, а точку возврата
  // нужна одна — на всё движение. Поэтому «сессия» жеста закрывается по паузе.
  const dragging = useRef(false);
  const dragTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(dragTimer.current), []);

  function changeAdjust(next: number) {
    if (next === p.calorieAdjust) return;
    if (!dragging.current) {
      setHistory(pushValue(history, p.calorieAdjust));
      dragging.current = true;
    }
    window.clearTimeout(dragTimer.current);
    dragTimer.current = window.setTimeout(() => (dragging.current = false), 600);
    patch({ calorieAdjust: next });
  }

  function undoAdjust() {
    const target = undoTarget(history);
    if (!target) return;
    window.clearTimeout(dragTimer.current);
    dragging.current = false;
    setHistory(target.stack);
    patch({ calorieAdjust: target.value });
  }

  function toggleAdjustLock() {
    window.clearTimeout(dragTimer.current);
    dragging.current = false;
    patch({ calorieAdjustLocked: !locked });
  }

  const undoValue = history.length ? history[history.length - 1] : null;

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
        setState({ ...emptyState, ...JSON.parse(String(r.result)) });
      } catch {
        alert("Не удалось прочитать файл");
      }
    };
    r.readAsText(file);
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Цель</h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <button
              key={g}
              onClick={() => patch({ goal: g, pace: g === "maintain" ? 0 : p.pace || 0.5 })}
              className={`rounded-xl border px-2 py-3 text-center text-xs leading-tight transition active:scale-[0.97] ${
                p.goal === g ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel2 hover:border-acc2/40"
              }`}
            >
              <div className="text-lg">{GOALS[g].emoji}</div>
              <span className="mt-1 block text-[11px] leading-tight">{GOALS[g].label}</span>
            </button>
          ))}
        </div>
        {p.goal !== "maintain" && (
          <div className="mt-4">
            <Field label={`Темп: ${p.pace} кг/нед`}>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={p.pace}
                onChange={(e) => patch({ pace: +e.target.value })}
                className="w-full accent-[#2dd4bf]"
              />
            </Field>
          </div>
        )}
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
        <div className="grid grid-cols-2 gap-2">
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
          <Field label="Целевой вес, кг">
            <input
              className="field compact"
              inputMode="decimal"
              type="number"
              min={20}
              max={400}
              step="0.1"
              value={p.targetWeight}
              onChange={(e) => patch({ targetWeight: +e.target.value.replace(",", ".") || 0 })}
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

      <div className="card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Норма калорий</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="BMR" value={targets.bmr} />
          <Mini label="TDEE" value={targets.tdee} />
          <Mini label="Цель" value={targets.calories} accent />
        </div>
        <Field label={`Ручная корректировка: ${formatAdjust(p.calorieAdjust)}${locked ? " · зафиксировано" : ""}`}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-500}
              max={500}
              step={25}
              value={p.calorieAdjust}
              disabled={locked}
              aria-label="Ручная корректировка калорий"
              onChange={(e) => changeAdjust(+e.target.value)}
              // touch-action: pan-y — вертикальный скролл страницы проходит сквозь
              // слайдер и не сдвигает значение; крутить его нужно осознанно, вбок.
              style={{ touchAction: "pan-y" }}
              className="min-w-0 flex-1 accent-[#a855f7] disabled:cursor-not-allowed disabled:opacity-40"
            />
            {/* Стрелка возврата — вплотную к замку: одно нажатие отменяет
                случайный сдвиг (уехало на +500 — вернёт +300). */}
            <button
              type="button"
              onClick={undoAdjust}
              disabled={undoValue === null}
              title={undoValue === null ? "Пока нечего возвращать" : `Вернуть ${formatAdjust(undoValue)}`}
              aria-label={undoValue === null ? "Возвращать пока нечего" : `Вернуть ${formatAdjust(undoValue)}`}
              className={`grid size-10 shrink-0 place-items-center rounded-full border text-lg transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 ${
                undoValue === null
                  ? "border-line bg-panel2 text-mute"
                  : "border-acc2/60 bg-acc2/15 text-acc2 hover:text-ink"
              }`}
            >
              ↩
            </button>
            <button
              type="button"
              onClick={toggleAdjustLock}
              title={locked ? "Снять замок — значение снова можно менять" : "Поставить замок, чтобы значение не сбивалось"}
              aria-label={locked ? "Снять замок с корректировки калорий" : "Зафиксировать корректировку калорий замком"}
              aria-pressed={locked}
              className={`grid size-10 shrink-0 place-items-center rounded-full border text-lg transition active:scale-90 ${
                locked ? "border-acc/60 bg-acc/15 text-acc" : "border-line bg-panel2 text-mute hover:text-ink"
              }`}
            >
              {locked ? "🔒" : "🔓"}
            </button>
          </div>
        </Field>

        <p className="text-[11px] leading-snug text-mute">
          {locked
            ? "🔒 Слайдер зафиксирован: случайное касание значение не сдвинет. Снимите замок, чтобы снова менять."
            : "🔓 Замок рядом со слайдером фиксирует значение, чтобы его не сбить случайным касанием."}{" "}
          {undoValue === null
            ? "↩ рядом с замком вернёт прежнее значение, если слайдер всё-таки уехал (25 ккал — один шаг)."
            : `↩ рядом с замком вернёт ${formatAdjust(undoValue)} — история хранит до ${ADJUST_LIMIT} шагов и не теряется при закрытии настроек.`}
        </p>

        <div className="rounded-xl border border-acc2/20 bg-acc2/8 p-3 text-xs leading-relaxed text-mute">
          <span className="font-semibold text-acc2">Как считается БЖУ:</span> белок — по текущему весу (1,8–2,2 г/кг), жиры — 30% калорий, углеводы — оставшиеся калории. Высокая активность или профицит прежде всего увеличивают углеводы. Не хватает калорий или белка — подтяни норму слайдером «Ручная корректировка» выше.
        </div>
        <p className="text-xs text-mute">Расчёт калорий по формуле Миффлина–Сан Жеора, вес учитывается текущий: {round(currentWeight, 1)} кг</p>
      </div>

      <div className="card space-y-2 p-4">
        <h3 className="text-sm font-semibold">Данные</h3>
        <div className="grid grid-cols-3 gap-2">
          <Btn variant="soft" size="sm" title="Сохранить данные в файл" onClick={exportData}>
            ⬇️ Сохранить
          </Btn>
          <Btn variant="soft" size="sm" title="Загрузить данные из файла" onClick={() => fileRef.current?.click()}>
            ⬆️ Загрузить
          </Btn>
          <Btn variant="danger" size="sm" title="Сбросить все данные" onClick={() => setResetOpen(true)}>
            🗑 Сбросить
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

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-panel2 py-3">
      <div className={`text-lg font-bold ${accent ? "text-acc" : ""}`}>{value}</div>
      <div className="text-[11px] text-mute">{label}</div>
    </div>
  );
}
