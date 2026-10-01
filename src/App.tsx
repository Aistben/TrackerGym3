import { useMemo, useState } from "react";
import { usePersistentState } from "./lib/storage";
import { GOALS, computeTargets, today } from "./lib/nutrition";
import Onboarding from "./components/Onboarding";
import DayView from "./components/DayView";
import Progress from "./components/Progress";
import ProfileView from "./components/ProfileView";

type Tab = "day" | "progress" | "profile";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "day", icon: "🍽", label: "Дневник" },
  { key: "progress", icon: "📈", label: "Прогресс" },
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
      <header className="sticky top-0 z-30 -mx-4 mb-4 bg-ink/80 px-4 pt-[env(safe-area-inset-top)] pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-acc uppercase">
              <span className="grid size-6 place-items-center rounded-lg bg-acc/15 text-base">{goal.emoji}</span>
              <span className="leading-tight">LUMEN · {goal.label}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{TABS.find((t) => t.key === tab)!.label}</h1>
          </div>
          <div className="shrink-0 rounded-2xl border border-line bg-panel2/70 px-3 py-1.5 text-right">
            <div className="text-lg leading-tight font-bold text-acc">{targets.calories}</div>
            <div className="text-[10px] leading-tight text-mute">ккал в день</div>
          </div>
        </div>
      </header>

      {tab === "day" && <DayView state={state} setState={setState} targets={targets} date={date} setDate={setDate} />}
      {tab === "progress" && (
        <Progress state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}
      {tab === "profile" && (
        <ProfileView state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg px-2 py-1.5">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition"
              >
                <span
                  className={`grid size-9 place-items-center rounded-full text-lg transition ${
                    isActive ? "bg-acc/15 text-acc" : "text-mute"
                  }`}
                >
                  {t.icon}
                </span>
                <span className={isActive ? "text-acc" : "text-mute"}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
