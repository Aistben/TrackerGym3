import { useMemo, useState } from "react";
import { usePersistentState } from "./lib/storage";
import { computeTargets, today } from "./lib/nutrition";
import Onboarding from "./components/Onboarding";
import DayView from "./components/DayView";
import Progress from "./components/Progress";
import ProfileView from "./components/ProfileView";

type Tab = "day" | "progress" | "profile";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "day", icon: "◒", label: "Дневник" },
  { key: "progress", icon: "↗", label: "Прогресс" },
  { key: "profile", icon: "◌", label: "Профиль" },
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
        className="fixed z-[45] grid size-14 place-items-center rounded-full border border-white/70 bg-acc text-2xl text-ink shadow-xl shadow-acc/30 transition hover:scale-105 hover:brightness-105 active:scale-95"
        style={{
          right: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
          bottom: "calc(5.75rem + env(safe-area-inset-bottom))",
        }}
      >
        📷
      </button>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg px-2 py-1.5">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                type="button"
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
