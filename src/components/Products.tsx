import { useMemo, useState } from "react";
import type { AppState, Product } from "../lib/types";
import { uid } from "../lib/storage";
import { lookupBarcode } from "../lib/openfoodfacts";
import { Btn, Empty, Field, Sheet } from "./ui";
import Scanner from "./Scanner";

const blank = { name: "", brand: "", barcode: "", kcal: "", protein: "", fat: "", carbs: "", portion: "" };

export default function Products({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "user">("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return state.products
      .filter((p) => (tab === "user" ? p.source !== "base" : true))
      .filter((p) => !s || (p.name + " " + (p.brand ?? "") + " " + (p.barcode ?? "")).toLowerCase().includes(s))
      .sort((a, b) => (a.source === "base" ? 1 : 0) - (b.source === "base" ? 1 : 0) || a.name.localeCompare(b.name));
  }, [state.products, q, tab]);

  function openForm(p?: Product) {
    setEditing(p ?? null);
    setForm(
      p
        ? {
            name: p.name,
            brand: p.brand ?? "",
            barcode: p.barcode ?? "",
            kcal: String(p.kcal),
            protein: String(p.protein),
            fat: String(p.fat),
            carbs: String(p.carbs),
            portion: p.portion ? String(p.portion) : "",
          }
        : { ...blank },
    );
    setOpen(true);
  }

  function save() {
    const p: Product = {
      id: editing?.id ?? uid(),
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      barcode: form.barcode || undefined,
      kcal: +form.kcal || 0,
      protein: +form.protein || 0,
      fat: +form.fat || 0,
      carbs: +form.carbs || 0,
      portion: +form.portion || undefined,
      source: editing?.source === "base" ? "base" : "user",
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    setState((s) => ({ ...s, products: [p, ...s.products.filter((x) => x.id !== p.id)] }));
    setOpen(false);
  }

  async function onCode(code: string) {
    setScan(false);
    const known = state.products.find((p) => p.barcode === code);
    if (known) {
      setMsg(null);
      setQ(code);
      return;
    }
    setMsg("Ищем " + code + " в Open Food Facts…");
    const found = await lookupBarcode(code).catch(() => null);
    if (found) {
      setState((s) => ({ ...s, products: [found, ...s.products] }));
      setMsg(`Добавлено: ${found.name}`);
      setQ(found.name);
    } else {
      setMsg(`Штрихкод ${code} не найден — заполни карточку вручную`);
      setEditing(null);
      setForm({ ...blank, barcode: code });
      setOpen(true);
    }
  }

  return (
    <div className="space-y-3 pb-28">
      <div className="flex gap-2">
        <input className="field" placeholder="Поиск в базе…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setScan(true)} className="shrink-0 rounded-xl border border-acc/40 bg-acc/10 px-3 text-xl">
          📷
        </button>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["all", `Все · ${state.products.length}`],
            ["user", `Мои · ${state.products.filter((p) => p.source !== "base").length}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${tab === k ? "bg-acc/15 text-acc" : "text-mute"}`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Btn variant="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => openForm()}>
          + Продукт
        </Btn>
      </div>

      {msg && <div className="rounded-xl border border-acc2/30 bg-acc2/10 p-3 text-xs text-acc2">{msg}</div>}

      <div className="space-y-1.5">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="truncate text-xs text-mute">
                {p.brand ? p.brand + " · " : ""}Б {p.protein} · Ж {p.fat} · У {p.carbs}
                {p.barcode ? ` · ${p.barcode}` : ""}
              </div>
            </div>
            <div className="text-sm font-semibold text-acc">{p.kcal}</div>
            <button onClick={() => openForm(p)} className="text-mute hover:text-white">
              ✏️
            </button>
            {p.source !== "base" && (
              <button
                onClick={() => setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }))}
                className="text-mute hover:text-bad"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!list.length && <Empty icon="📦" text="Пусто. Добавь продукт или отсканируй штрихкод" />}
      </div>

      <Sheet open={scan} onClose={() => setScan(false)} title="Сканер штрихкода">
        <Scanner onDetect={onCode} onClose={() => setScan(false)} />
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? "Редактировать продукт" : "Новый продукт"}>
        <div className="space-y-3">
          <Field label="Название">
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Бренд">
              <input className="field" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Штрихкод">
              <input
                className="field"
                inputMode="numeric"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
          <div className="text-xs text-mute">На 100 г / 100 мл</div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Калории", "kcal"],
                ["Белки, г", "protein"],
                ["Жиры, г", "fat"],
                ["Углеводы, г", "carbs"],
              ] as const
            ).map(([label, key]) => (
              <Field key={key} label={label}>
                <input
                  className="field"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value.replace(",", ".") })}
                />
              </Field>
            ))}
          </div>
          <Field label="Вес порции, г" hint="необязательно">
            <input
              className="field"
              inputMode="decimal"
              value={form.portion}
              onChange={(e) => setForm({ ...form, portion: e.target.value.replace(",", ".") })}
            />
          </Field>
          <Btn className="w-full" disabled={!form.name.trim() || !form.kcal} onClick={save}>
            Сохранить
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}
