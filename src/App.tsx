import { useCallback, useMemo, useState } from "react";
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

function IconScan({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H7M17 4h1.5A1.5 1.5 0 0 1 20 5.5V7M20 17v1.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17" />
      <path d="M8 8v8M11 8v8M14.5 8v8M17 8v8" />
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
  const [scanRequest, setScanRequest] = useState(0);

  const weight = useMemo(() => (state.profile ? currentWeight(state.profile, state.weights) : 0), [state.profile, state.weights]);

  const targets = useMemo(
    () => (state.profile ? computeTargets(state.profile, weight) : null),
    [state.profile, weight],
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

  /** Открыть сканер напрямую: дневник создаст временный приём на сегодня и текущее время. */
  function openBarcodeScanner() {
    setTab("day");
    setScanRequest((value) => value + 1);
  }

  // Дневник гасит флаг сразу после обработки — иначе добавление открывалось бы
  // само при каждом возврате на вкладку «Дневник».
  const handleScanRequestHandled = useCallback(() => setScanRequest(0), []);

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      {tab === "day" && (
        <DayView
          state={state}
          setState={setState}
          targets={targets}
          date={date}
          setDate={setDate}
          scanRequest={scanRequest}
          onScanRequestHandled={handleScanRequestHandled}
        />
      )}
      {tab === "progress" && (
        <Progress state={state} setState={setState} targets={targets} currentWeight={weight} />
      )}
      {tab === "profile" && (
        <ProfileView state={state} setState={setState} targets={targets} currentWeight={weight} />
      )}

      {tab === "day" && (
        <button
          type="button"
          aria-label="Сканировать штрихкод"
          title="Сканировать штрихкод"
          onClick={openBarcodeScanner}
          className="fixed z-[45] flex items-center gap-2 rounded-full border border-white/25 bg-acc py-3 pr-4 pl-3.5 text-white shadow-xl shadow-acc/30 transition hover:scale-105 hover:brightness-105 active:scale-95"
          style={{
            right: "max(1rem, calc((100vw - 32rem) / 2 + 1rem))",
            bottom: "calc(5.75rem + var(--safe-bottom))",
          }}
        >
          <IconScan active />
          <span className="text-[13px] leading-none font-semibold whitespace-nowrap">Сканировать</span>
        </button>
      )}

      <nav data-bottom-nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#18102c]">
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
