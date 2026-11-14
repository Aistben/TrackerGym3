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
import { GOALS, dayTotals, goalShiftText, round, shortDate, today } from "../lib/nutrition";
import { Btn, Empty, Field, Sheet, numField } from "./ui";

import { progressWindow, weightChartDomain } from "../lib/progress";
import { validDate } from "../lib/validation";

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
  const [weighOpen, setWeighOpen] = useState(false);
  const profile = state.profile!;
  const todayDate = today();

  const window = useMemo(() => progressWindow(state.weights, todayDate), [state.weights, todayDate]);
  const weightData = window.points;
  const chartDomain = weightChartDomain(weightData, todayDate);

  // Match nutrition averages to the automatic graph window; no daily empty points needed.
  const logged = useMemo(() => {
    const byDate = new Map<string, typeof state.meals>();
    for (const meal of state.meals) {
      if (meal.date < window.start || meal.date > window.end) continue;
      const list = byDate.get(meal.date) ?? [];
      list.push(meal);
      byDate.set(meal.date, list);
    }
    return [...byDate.values()].map(dayTotals).filter((total) => total.kcal > 0);
  }, [window.start, window.end, state.meals]);

  const avg = logged.length ? round(logged.reduce((s, total) => s + total.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? round(logged.reduce((s, total) => s + total.protein, 0) / logged.length) : 0;
  const delta = round(currentWeight - profile.startWeight, 1);

  const weighInsInWindow = weightData.length;

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
            <h3 className="min-w-0 truncate text-sm font-semibold">Динамика веса</h3>
            <span className="shrink-0 text-[11px] text-mute">{weighInsInWindow} записей на графике</span>
          </div>
          <div className="flex items-stretch gap-2">
            <Btn variant="soft" size="sm" className="shrink-0 self-stretch whitespace-nowrap px-3" onClick={() => setWeighOpen(true)}>
              ➕ Добавить вес
            </Btn>
          </div>
          <p className="text-[11px] text-mute">
            {weightData.length > 0 ? `${shortDate(weightData[0].iso)} — ${shortDate(weightData.at(-1)!.iso)}. ` : ""}Взвешивания за последние пять месяцев. Период обновляется автоматически.
          </p>
        </div>

        {window.historical && (
          <p className="mb-3 text-[11px] text-mute">Давно не было взвешиваний — показан период до последней записи. Добавь вес за сегодня, и график автоматически перейдёт к текущей дате.</p>
        )}
        {weighInsInWindow === 1 && (
          <div className="mb-3 rounded-xl border border-line bg-panel2/60 px-3 py-2 text-[11px] leading-snug text-mute">
            В периоде пока одно взвешивание — линия веса появится после второго. Точка уже стоит на графике.
          </div>
        )}
        {weighInsInWindow === 0 ? (
          <Empty icon="⚖️" text="Добавь первое взвешивание — график начнёт строиться" />
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={weightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WEIGHT_COLOR} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={WEIGHT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#343647" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={chartDomain}
                padding={{ left: 4, right: 4 }}
                allowDataOverflow
                tickMargin={8}
                tickFormatter={(value) => shortDate(new Date(value).toISOString().slice(0, 10))}
                tick={{ fontSize: 10, fill: "#b0a2cf" }}
                tickCount={4}
                minTickGap={24}
              />
              <YAxis width={40} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#b0a2cf" }} domain={["dataMin - 1.5", "dataMax + 1.5"]} />
              <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#b0a2cf" }} labelFormatter={(value) => new Date(Number(value)).toLocaleDateString("ru-RU")} />
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
      <div className="truncate text-base font-semibold">{value}</div>
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
        disabled={!validDate(date) || !Number.isFinite(+w) || +w < 20 || +w > 400}
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
