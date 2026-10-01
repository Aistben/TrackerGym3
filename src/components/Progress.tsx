import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState, Targets } from "../lib/types";
import { GOALS, dayTotals, etaDays, planWeight, round, shiftDate, shortDate, today } from "../lib/nutrition";
import { Btn, Empty, Field, Sheet, Tabs } from "./ui";

const RANGES = [
  { d: 14, label: "2 недели" },
  { d: 30, label: "месяц" },
  { d: 90, label: "3 месяца" },
];

export default function Progress({
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
  const [range, setRange] = useState(30);
  const [weighOpen, setWeighOpen] = useState(false);
  const profile = state.profile!;

  const days = useMemo(() => {
    const start = shiftDate(today(), -(range - 1));
    const out: string[] = [];
    for (let i = 0; i < range; i++) out.push(shiftDate(start, i));
    return out;
  }, [range]);

  const kcalData = useMemo(
    () =>
      days.map((d) => {
        const t = dayTotals(state.meals.filter((m) => m.date === d));
        return {
          date: shortDate(d),
          iso: d,
          kcal: round(t.kcal),
          protein: round(t.protein),
          fat: round(t.fat),
          carbs: round(t.carbs),
        };
      }),
    [days, state.meals],
  );

  const weightData = useMemo(() => {
    const from = shiftDate(today(), -(range - 1));
    const list: { date: string; iso: string; факт?: number; план: number }[] = [];
    const startIso = profile.startDate < from ? from : profile.startDate;
    let iso = startIso;
    const end = shiftDate(today(), 14);
    while (iso <= end) {
      const w = state.weights.find((x) => x.date === iso);
      list.push({ date: shortDate(iso), iso, факт: w?.weight, план: round(planWeight(profile, iso), 1) });
      iso = shiftDate(iso, 1);
    }
    return list;
  }, [state.weights, profile, range]);

  const logged = kcalData.filter((d) => d.kcal > 0);
  const avg = logged.length ? round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : 0;
  const inRange = logged.filter((d) => Math.abs(d.kcal - targets.calories) <= targets.calories * 0.1).length;
  const eta = etaDays(profile, currentWeight);
  const delta = round(currentWeight - profile.startWeight, 1);

  return (
    <div className="space-y-4 pb-28">
      <div className="grid grid-cols-2 gap-3">
        <Stat title="Текущий вес" value={`${round(currentWeight, 1)} кг`} sub={`${delta > 0 ? "+" : ""}${delta} кг от старта`} />
        <Stat title="Цель" value={`${profile.targetWeight} кг`} sub={GOALS[profile.goal].label} />
        <Stat title="Средние калории" value={avg ? `${avg}` : "—"} sub={`цель ${targets.calories} ккал`} />
        <Stat title="Средний белок" value={avgP ? `${avgP} г` : "—"} sub={`цель ${targets.protein} г`} />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Вес: план и факт</h3>
          <Btn variant="soft" size="sm" onClick={() => setWeighOpen(true)}>
            + Взвешивание
          </Btn>
        </div>
        {state.weights.length === 0 ? (
          <Empty icon="⚖️" text="Добавь первое взвешивание — график начнёт строиться" />
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={weightData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2a42" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8394b4" }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: "#8394b4" }} domain={["dataMin - 1.5", "dataMax + 1.5"]} />
              <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#8394b4" }} />
              <ReferenceLine y={profile.targetWeight} stroke="#38bdf8" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="план" stroke="#38bdf8" strokeWidth={1.6} strokeDasharray="5 5" dot={false} />
              <Area type="monotone" dataKey="факт" stroke="none" fill="url(#gw)" connectNulls />
              <Line
                type="monotone"
                dataKey="факт"
                stroke="#4ade80"
                strokeWidth={2.4}
                dot={{ r: 3, fill: "#4ade80" }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {eta !== null && eta > 0 && (
          <p className="mt-2 text-xs text-mute">
            При темпе {profile.pace} кг/нед цель достижима примерно через <b className="text-white">{eta} дн.</b> (
            {shortDate(shiftDate(today(), eta))})
          </p>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Калории по дням</h3>
          <Tabs
            value={range}
            onChange={setRange}
            items={RANGES.map((r) => ({ key: r.d, label: r.label }))}
            fill={false}
            className="w-auto shrink-0"
          />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={kcalData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="#1f2a42" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8394b4" }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fontSize: 10, fill: "#8394b4" }} />
            <Tooltip contentStyle={tipStyle} cursor={{ fill: "#ffffff08" }} />
            <ReferenceLine y={targets.calories} stroke="#38bdf8" strokeDasharray="4 4" />
            <Bar dataKey="kcal" name="ккал" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-mute">
          Дней в норме (±10%): <b className="text-white">{inRange}</b> из {logged.length} записанных
        </p>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">БЖУ по дням, г</h3>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={kcalData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="#1f2a42" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8394b4" }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fontSize: 10, fill: "#8394b4" }} />
            <Tooltip contentStyle={tipStyle} cursor={{ fill: "#ffffff08" }} />
            <Bar dataKey="protein" name="Белки" stackId="a" fill="#38bdf8" />
            <Bar dataKey="fat" name="Жиры" stackId="a" fill="#fbbf24" />
            <Bar dataKey="carbs" name="Углеводы" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Sheet open={weighOpen} onClose={() => setWeighOpen(false)} title="Взвешивание">
        <WeighForm
          weights={state.weights}
          onSave={(date, weight) =>
            setState((s) => ({
              ...s,
              weights: [...s.weights.filter((w) => w.date !== date), { date, weight }].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            }))
          }
          onDelete={(date) => setState((s) => ({ ...s, weights: s.weights.filter((w) => w.date !== date) }))}
          onClose={() => setWeighOpen(false)}
        />
      </Sheet>
    </div>
  );
}

const tipStyle = {
  background: "#0e1422",
  border: "1px solid #1f2a42",
  borderRadius: 12,
  fontSize: 12,
};

function Stat({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="card p-3">
      <div className="truncate text-[11px] text-mute">{title}</div>
      <div className="truncate text-xl font-bold">{value}</div>
      <div className="truncate text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function WeighForm({
  weights,
  onSave,
  onDelete,
  onClose,
}: {
  weights: { date: string; weight: number }[];
  onSave: (date: string, weight: number) => void;
  onDelete: (date: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(today());
  const [w, setW] = useState("");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Вес, кг">
          <input
            className="field"
            inputMode="decimal"
            autoFocus
            value={w}
            placeholder="82.4"
            onChange={(e) => setW(e.target.value.replace(",", "."))}
          />
        </Field>
      </div>
      <Btn
        className="w-full"
        disabled={!(+w > 20)}
        onClick={() => {
          onSave(date, +w);
          onClose();
        }}
      >
        Сохранить
      </Btn>
      {weights.length > 0 && (
        <div className="space-y-1 pt-2">
          <div className="text-xs font-medium tracking-wide text-mute uppercase">История</div>
          {[...weights]
            .reverse()
            .slice(0, 20)
            .map((x) => (
              <div key={x.date} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                <span className="flex-1 text-mute">{shortDate(x.date)}</span>
                <span className="font-medium">{x.weight} кг</span>
                <button onClick={() => onDelete(x.date)} className="text-mute hover:text-bad">
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
