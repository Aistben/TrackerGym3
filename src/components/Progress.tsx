import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState, Targets } from "../lib/types";
import { GOALS, dateRange, dayTotals, daysBetween, goalShiftText, lastWeighIn, round, shortDate, today, weightSeries } from "../lib/nutrition";
import { Btn, Empty, Field, Select, Sheet, numField } from "./ui";

const RANGES = [
  { d: 7, label: "Неделя", hint: "вес по дням" },
  { d: 14, label: "2 недели", hint: "14 дней" },
  { d: 30, label: "Месяц", hint: "30 дней" },
  { d: 90, label: "3 месяца", hint: "90 дней" },
  { d: 365, label: "Год", hint: "12 месяцев" },
];

/** Цвет графика: фиолетовый — факт (вес). */
const WEIGHT_COLOR = "#a855f7";

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
  const [range, setRange] = useState(7);
  const [weighOpen, setWeighOpen] = useState(false);
  const profile = state.profile!;
  const todayDate = today();

  const days = useMemo(() => dateRange(todayDate, range), [todayDate, range]);

  /** График — только вес. Целевого веса и плана от темпа больше нет. */
  const weightData = useMemo(
    () => weightSeries({ days, weights: state.weights, profile }),
    [days, state.weights, profile],
  );

  // Средние калории и белок считаются по дневнику за выбранный период.
  const logged = useMemo(() => {
    const byDate = new Map<string, typeof state.meals>();
    for (const meal of state.meals) {
      const list = byDate.get(meal.date) ?? [];
      list.push(meal);
      byDate.set(meal.date, list);
    }
    return days.map((iso) => dayTotals(byDate.get(iso) ?? [])).filter((total) => total.kcal > 0);
  }, [days, state.meals]);

  const avg = logged.length ? round(logged.reduce((s, total) => s + total.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? round(logged.reduce((s, total) => s + total.protein, 0) / logged.length) : 0;
  const delta = round(currentWeight - profile.startWeight, 1);

  const weighInsInWindow = weightData.filter((d) => d.факт != null).length;
  const lastWeigh = useMemo(() => lastWeighIn(state.weights, todayDate), [state.weights, todayDate]);
  // Взвешивание могло быть раньше выбранного периода: тогда линия веса пропадает,
  // и это выглядит как «график сломался». Предлагаем одним касанием расширить период.
  const widerRange = useMemo(() => {
    if (!lastWeigh) return null;
    const need = daysBetween(lastWeigh.date, todayDate) + 1;
    const fit = RANGES.find((item) => item.d >= need) ?? RANGES[RANGES.length - 1];
    return fit.d > range ? fit : null;
  }, [lastWeigh, todayDate, range]);

  return (
    <div className="space-y-4 pb-28">
      <div className="grid grid-cols-2 gap-3">
        <Stat title="Текущий вес" value={`${round(currentWeight, 1)} кг`} sub={`${delta > 0 ? "+" : ""}${delta} кг от старта`} />
        <Stat title="Цель" value={GOALS[profile.goal].label} sub={goalShiftText(profile.goal)} />
        <Stat title="Средние калории" value={avg ? `${avg}` : "—"} sub={`цель ${targets.calories} ккал`} />
        <Stat title="Средний белок" value={avgP ? `${avgP} г` : "—"} sub={`цель ${targets.protein} г`} />
      </div>

      <div className="card p-4">
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">Вес по дням</h3>
            <span className="shrink-0 text-[11px] text-mute">{state.weights.length} записей</span>
          </div>
          <div className="flex items-stretch gap-2">
            <Select
              className="min-w-0 flex-1"
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({ key: r.d, label: r.label, hint: r.hint }))}
            />
            <Btn variant="soft" size="sm" className="shrink-0 self-stretch whitespace-nowrap px-3" onClick={() => setWeighOpen(true)}>
              ➕ Добавить вес
            </Btn>
          </div>
          <p className="text-[11px] text-mute">
            Фиолетовая линия — вес. Проведи пальцем по графику, чтобы увидеть день.
          </p>
        </div>

        {weighInsInWindow === 0 && widerRange && lastWeigh && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] leading-snug text-warn">
            <span className="min-w-0 flex-1">
              В этом периоде нет взвешиваний — последнее {shortDate(lastWeigh.date)} (
              {daysBetween(lastWeigh.date, todayDate)} дн. назад), поэтому линия веса пустая.
            </span>
            <button
              type="button"
              onClick={() => setRange(widerRange.d)}
              className="shrink-0 rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 font-semibold whitespace-nowrap"
            >
              Показать «{widerRange.label}»
            </button>
          </div>
        )}
        {weighInsInWindow === 1 && (
          <div className="mb-3 rounded-xl border border-line bg-panel2/60 px-3 py-2 text-[11px] leading-snug text-mute">
            В периоде пока одно взвешивание — линия веса появится после второго. Точка уже стоит на графике.
          </div>
        )}
        {state.weights.length === 0 ? (
          <Empty icon="⚖️" text="Добавь первое взвешивание — график начнёт строиться" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={weightData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WEIGHT_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={WEIGHT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3b2d60" vertical={false} />
              <XAxis
                dataKey={range <= 14 ? "day" : "date"}
                tick={{ fontSize: 10, fill: "#b0a2cf" }}
                interval={range <= 7 ? 0 : range <= 14 ? 1 : "preserveStartEnd"}
                minTickGap={range <= 14 ? 0 : 24}
              />
              <YAxis tick={{ fontSize: 10, fill: "#b0a2cf" }} domain={["dataMin - 1.5", "dataMax + 1.5"]} />
              <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#b0a2cf" }} />
              <Area
                type="monotone"
                dataKey="факт"
                name="Вес, кг"
                legendType="none"
                stroke="none"
                fill="url(#gw)"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="факт"
                name="Вес, кг"
                stroke={WEIGHT_COLOR}
                strokeWidth={2.4}
                dot={{ r: 3, fill: WEIGHT_COLOR }}
                connectNulls
              />
              <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: 11, color: "#b0a2cf" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <Sheet
        open={weighOpen}
        onClose={() => setWeighOpen(false)}
        title="Взвешивание"
        center
        closeButtonClassName="text-acc2 hover:text-acc2"
      >
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
  background: "rgba(30, 20, 54, .94)",
  border: "1px solid #4c3b77",
  color: "#f1ebff",
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
            {...numField}
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
