import { useRef, useState } from "react";
import type { ActivityKey, AppState, Goal, Profile, Sex, Targets } from "../lib/types";
import { ACTIVITY, GOALS, macroCalories, round } from "../lib/nutrition";
import { emptyState } from "../lib/storage";
import { Btn, Field } from "./ui";

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
  const [custom, setCustom] = useState(!!p.customMacros);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (d: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile!, ...d } }));

  const macros = p.customMacros ?? { protein: targets.protein, fat: targets.fat, carbs: targets.carbs };

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
              className={`rounded-xl border px-2 py-3 text-xs transition ${
                p.goal === g ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel2"
              }`}
            >
              <div className="text-lg">{GOALS[g].emoji}</div>
              {GOALS[g].label}
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
                className="w-full accent-[#4ade80]"
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
              className={`rounded-xl border py-2 text-sm transition ${
                p.sex === s ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel2"
              }`}
            >
              {s === "male" ? "Мужчина" : "Женщина"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Возраст">
            <input className="field" inputMode="numeric" value={p.age} onChange={(e) => patch({ age: +e.target.value || 0 })} />
          </Field>
          <Field label="Рост, см">
            <input
              className="field"
              inputMode="numeric"
              value={p.height}
              onChange={(e) => patch({ height: +e.target.value || 0 })}
            />
          </Field>
          <Field label="Стартовый вес, кг">
            <input
              className="field"
              inputMode="decimal"
              value={p.startWeight}
              onChange={(e) => patch({ startWeight: +e.target.value.replace(",", ".") || 0 })}
            />
          </Field>
          <Field label="Целевой вес, кг">
            <input
              className="field"
              inputMode="decimal"
              value={p.targetWeight}
              onChange={(e) => patch({ targetWeight: +e.target.value.replace(",", ".") || 0 })}
            />
          </Field>
        </div>
        <Field label="Активность">
          <select className="field" value={p.activity} onChange={(e) => patch({ activity: e.target.value as ActivityKey })}>
            {(Object.keys(ACTIVITY) as ActivityKey[]).map((a) => (
              <option key={a} value={a} className="bg-panel">
                {ACTIVITY[a].label} — {ACTIVITY[a].hint}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Норма калорий</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="BMR" value={targets.bmr} />
          <Mini label="TDEE" value={targets.tdee} />
          <Mini label="Цель" value={targets.calories} accent />
        </div>
        <Field label={`Ручная корректировка: ${p.calorieAdjust > 0 ? "+" : ""}${p.calorieAdjust} ккал`}>
          <input
            type="range"
            min={-500}
            max={500}
            step={25}
            value={p.calorieAdjust}
            onChange={(e) => patch({ calorieAdjust: +e.target.value })}
            className="w-full accent-[#38bdf8]"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => {
              setCustom(e.target.checked);
              patch({ customMacros: e.target.checked ? macros : null });
            }}
            className="size-4 accent-[#4ade80]"
          />
          Задать БЖУ вручную
        </label>
        {custom && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["Белки", "protein"],
                  ["Жиры", "fat"],
                  ["Углеводы", "carbs"],
                ] as const
              ).map(([label, key]) => (
                <Field key={key} label={label}>
                  <input
                    className="field"
                    inputMode="numeric"
                    value={macros[key]}
                    onChange={(e) => patch({ customMacros: { ...macros, [key]: +e.target.value || 0 } })}
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-mute">
              Из макросов получается {round(macroCalories(macros))} ккал (цель {targets.calories})
            </p>
          </>
        )}
        <p className="text-xs text-mute">Расчёт по формуле Миффлина–Сан Жеора, вес учитывается текущий: {round(currentWeight, 1)} кг</p>
      </div>

      <div className="card space-y-2 p-4">
        <h3 className="text-sm font-semibold">Данные</h3>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="soft" onClick={exportData}>
            ⬇️ Экспорт JSON
          </Btn>
          <Btn variant="soft" onClick={() => fileRef.current?.click()}>
            ⬆️ Импорт
          </Btn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
        />
        <Btn
          variant="danger"
          className="w-full"
          onClick={() => confirm("Удалить все данные и начать заново?") && setState(emptyState)}
        >
          Сбросить всё
        </Btn>
      </div>
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
