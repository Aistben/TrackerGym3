import { useMemo, useState } from "react";
import { usePersistentState } from "./lib/storage";
import { computeTargets, today } from "./lib/nutrition";
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
  const [photoRequest, setPhotoRequest] = useState(0);

  const currentWeight = useMemo(() => {
    if (!state.profile) return 0;
    const last = [...state.weights]
      .filter((item) => item.date <= today())
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
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

  function openPhotoCapture() {
    setTab("day");
    setPhotoRequest((value) => value + 1);
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
          photoRequest={photoRequest}
        />
      )}
      {tab === "progress" && (
        <Progress state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}
      {tab === "profile" && (
        <ProfileView state={state} setState={setState} targets={targets} currentWeight={currentWeight} />
      )}

      <button
        type="button"
        aria-label="Добавить продукт по фото"
        title="Добавить продукт по фото"
        onClick={openPhotoCapture}
        className="fixed z-[45] grid size-14 place-items-center rounded-full border border-white/25 bg-acc text-2xl text-white shadow-xl shadow-acc/30 transition hover:scale-105 hover:brightness-105 active:scale-95"
        style={{
          right: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
          bottom: "calc(5.75rem + env(safe-area-inset-bottom))",
        }}
      >
        📷
      </button>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgb(24_16_44/.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg px-2 py-1.5">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] transition"
              >
                <span
                  className={`grid h-9 w-14 place-items-center rounded-full transition ${
                    isActive ? "bg-acc/25 text-acc shadow-sm shadow-acc/30 ring-1 ring-acc/40" : "text-mute/90"
                  }`}
                >
                  <Icon active={isActive} />
                </span>
                <span className={isActive ? "font-semibold text-acc" : "font-medium text-mute"}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
