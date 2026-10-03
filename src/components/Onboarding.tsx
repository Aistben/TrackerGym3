import { useMemo, useState } from "react";
import type { ActivityKey, Goal, Profile, Sex } from "../lib/types";
import { ACTIVITY, GOALS, computeTargets, today } from "../lib/nutrition";
import { Btn, Field } from "./ui";

export default function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("lose");
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("25");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [target, setTarget] = useState("75");
  const [activity, setActivity] = useState<ActivityKey>("moderate");
  const [pace, setPace] = useState("0.5");

  const profile: Profile = useMemo(
    () => ({
      name: "",
      sex,
      age: +age || 25,
      height: +height || 175,
      startWeight: +weight || 75,
      targetWeight: +target || +weight || 75,
      activity,
      goal,
      pace: goal === "maintain" ? 0 : +pace || 0.5,
      startDate: today(),
      calorieAdjust: 0,
      calorieAdjustLocked: false,
    }),
    [sex, age, height, weight, target, activity, goal, pace],
  );

  const t = computeTargets(profile, profile.startWeight);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-4 py-8">
      <div>
        <div className="text-xs tracking-[0.2em] text-acc uppercase">Шаг {step + 1} из 3</div>
        <h1 className="mt-1 text-2xl font-bold">
          {step === 0 ? "Какая цель?" : step === 1 ? "Параметры тела" : "Активность и темп"}
        </h1>
      </div>

      {step === 0 && (
        <div className="space-y-3 rise">
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                setGoal(g);
                if (g === "maintain") setTarget(weight);
              }}
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                goal === g ? "border-acc bg-acc/10" : "border-line bg-panel hover:border-acc2/40"
              }`}
            >
              <span className="shrink-0 text-3xl">{GOALS[g].emoji}</span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{GOALS[g].label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-mute">{GOALS[g].desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 rise">
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`rounded-xl border py-3 font-medium transition active:scale-[0.97] ${
                  sex === s ? "border-acc bg-acc/10 text-acc" : "border-line bg-panel hover:border-acc2/40"
                }`}
              >
                {s === "male" ? "Мужчина" : "Женщина"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Возраст">
              <input className="field" inputMode="numeric" type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Рост, см">
              <input className="field" inputMode="numeric" type="number" min={100} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
            </Field>
            <Field label="Текущий вес, кг">
              <input
                className="field"
                inputMode="decimal"
                type="number"
                min={20}
                max={400}
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(",", "."))}
              />
            </Field>
            <Field label="Целевой вес, кг">
              <input
                className="field"
                inputMode="decimal"
                type="number"
                min={20}
                max={400}
                step="0.1"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(",", "."))}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rise">
          <div className="space-y-2">
            {(Object.keys(ACTIVITY) as ActivityKey[]).map((a) => (
              <button
                key={a}
                onClick={() => setActivity(a)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                  activity === a ? "border-acc bg-acc/10" : "border-line bg-panel hover:border-acc2/40"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{ACTIVITY[a].label}</span>
                  <span className="block truncate text-xs text-mute">{ACTIVITY[a].hint}</span>
                </span>
                <span className="shrink-0 font-mono text-xs whitespace-nowrap text-mute">×{ACTIVITY[a].k}</span>
              </button>
            ))}
          </div>
          {goal !== "maintain" && (
            <Field label={`Темп: ${pace} кг в неделю`} hint="0.3–0.5 кг/нед — оптимально и безопасно">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                className="w-full accent-[#2dd4bf]"
              />
            </Field>
          )}
        </div>
      )}

      <div className="card mt-auto p-4">
        <div className="text-xs text-mute">Твоя норма на день</div>
        <div className="text-3xl font-bold text-acc">{t.calories} ккал</div>
        <div className="mt-1 text-xs text-mute">
          Б {t.protein} г · Ж {t.fat} г · У {t.carbs} г · TDEE {t.tdee}
        </div>
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Btn variant="soft" className="flex-1" onClick={() => setStep(step - 1)}>
            Назад
          </Btn>
        )}
        <Btn className="flex-[2]" onClick={() => (step < 2 ? setStep(step + 1) : onDone(profile))}>
          {step < 2 ? "Далее" : "Поехали 🚀"}
        </Btn>
      </div>
    </div>
  );
}
