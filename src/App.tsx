import { useMemo, useState } from "react";
import { usePersistentState } from "./lib/storage";
import { GOALS, computeTargets, today } from "./lib/nutrition";
import Onboarding from "./components/Onboarding";
import DayView from "./components/DayView";
import Progress from "./components/Progress";
import Products from "./components/Products";
import ProfileView from "./components/ProfileView";

type Tab = "day" | "progress" | "base" | "profile";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "day", icon: "🍽", label: "Дневник" },
  { key: "progress", icon: "📈", label: "Прогресс" },
  { key: "base", icon: "📦", label: "База" },
  { key: "profile", icon: "⚙️", label: "Профиль" },
];

export default function App() {
  const [state, setState] = usePersistentState();
  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState(today());

  const currentWeight = useMemo(() => {
    if (!state.profile) return 0;
    const last = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return last?.weight ?? state.profile.startWeight;
  }, [state.weights, state.profile]);

  const targets = useMemo(
    () => (state.profile ? computeTargets(state.profile, currentWeight) : null),
    [state.profile, currentWeight],
  );

  if (!state.profile || !targets) {
    return (
      <Onboarding
        onDone={(profile) =>
          setState((s) => ({ ...s, profile, weights: [{ date: today(), weight: profile.startWeight }] }))
        }
      />
    );
  }

  const goal = GOALS[state.profile.goal];

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pt-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs tracking-[0.18em] text-mute uppercase">
            {goal.emoji} {goal.label}
          </div>
          <h1 className="text-xl font-bold">
            {TABS.find((t) => t.key === tab)!.label}
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-acc">{targets.calories}</div>
          <div className="text-[11px] text-mute">ккал в день</div>
        </div>
      </header>

      {tab === "day" && <DayView state={state} setState={setState} targets={targets} date={date} setDate={setDate} />}
      {tab === "progress" && (
        <Progress state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}
      {tab === "base" && <Products state={state} setState={setState} />}
      {tab === "profile" && (
        <ProfileView state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                tab === t.key ? "text-acc" : "text-mute"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
