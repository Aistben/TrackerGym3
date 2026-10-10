import { useMemo, useState } from "react";
import { usePersistentState } from "./lib/storage";
import { computeTargets, currentWeight, today } from "./lib/nutrition";
import Onboarding from "./components/Onboarding";
import DayView from "./components/DayView";
import Progress from "./components/Progress";
import ProfileView from "./components/ProfileView";

type Tab = "day" | "progress" | "profile";

function IconDiary({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5v-15Z" />
      <path d="M5 17.5h14" />
      <path d="M9 7.5h6M9 11h4" />
    </svg>
  );
}

function IconProgress({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16" />
      <path d="M4 15.5 9.5 10l3.5 3.5L20 6" />
      <path d="M20 10V6h-4" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.9-3.6 3.7-5.5 7.2-5.5s6.3 1.9 7.2 5.5" />
    </svg>
  );
}

const TABS: { key: Tab; icon: (p: { active: boolean }) => React.ReactElement; label: string }[] = [
  { key: "day", icon: IconDiary, label: "Дневник" },
  { key: "progress", icon: IconProgress, label: "Прогресс" },
  { key: "profile", icon: IconProfile, label: "Профиль" },
];

export default function App() {
  const [state, setState] = usePersistentState();
  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState(today());

  const weight = useMemo(() => (state.profile ? currentWeight(state.profile, state.weights) : 0), [state.profile, state.weights]);

  const targets = useMemo(
    () => (state.profile ? computeTargets(state.profile, weight) : null),
    [state.profile, weight],
  );

  // Все хуки вызываются до раннего возврата на онбординг, чтобы не менять
  // их порядок после появления профиля.
  if (!state.profile || !targets) {
    return (
      <Onboarding
        onDone={(profile) =>
          setState((s) => ({ ...s, profile, weights: [{ date: today(), weight: profile.startWeight }] }))
        }
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      {tab === "day" && (
        <DayView
          state={state}
          setState={setState}
          targets={targets}
          date={date}
          setDate={setDate}
        />
      )}
      {tab === "progress" && (
        <Progress state={state} setState={setState} targets={targets} currentWeight={weight} />
      )}
      {tab === "profile" && (
        <ProfileView state={state} setState={setState} targets={targets} currentWeight={weight} />
      )}

      <nav
        data-bottom-nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-violet-300/10 bg-[#130c24]/95 shadow-[0_-8px_24px_rgba(10,4,22,0.4)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-lg gap-2 px-3 py-2">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition-all duration-200 active:scale-[0.97] ${
                  isActive
                    ? "bg-gradient-to-br from-violet-400/20 via-purple-500/15 to-fuchsia-500/10 text-violet-100 shadow-md shadow-violet-500/20 ring-1 ring-violet-200/25"
                    : "text-mute hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-xl transition-all duration-200 ${
                    isActive ? "bg-violet-300/15 text-violet-100 drop-shadow-[0_0_8px_rgba(216,180,254,.55)]" : "text-mute/80"
                  }`}
                >
                  <Icon active={isActive} />
                </span>
                <span className={isActive ? "font-semibold text-violet-100" : "font-medium text-mute"}>{t.label}</span>
                {isActive && (
                  <span className="absolute top-1.5 size-1 rounded-full bg-fuchsia-200 shadow-[0_0_8px_rgba(232,121,249,.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
