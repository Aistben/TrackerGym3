import { useEffect, useMemo, useRef, useState } from "react";
import type { MealEntry, Product } from "../lib/types";
import { round } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { lookupBarcode, searchOnline } from "../lib/openfoodfacts";
import { Btn, Empty, Field } from "./ui";
import Scanner from "./Scanner";

type Mode = "search" | "scan" | "create" | "portion";

export default function AddFood({
  products,
  mealTitle,
  onSaveProduct,
  onAdd,
  onClose,
}: {
  products: Product[];
  mealTitle: string;
  onSaveProduct: (p: Product) => void;
  onAdd: (entry: MealEntry) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [grams, setGrams] = useState("100");
  const [online, setOnline] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", brand: "", kcal: "", protein: "", fat: "", carbs: "", portion: "", barcode: "" });

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? products.filter((p) => (p.name + " " + (p.brand ?? "") + " " + (p.barcode ?? "")).toLowerCase().includes(s))
      : [...products].sort((a, b) => (a.source === "base" ? 1 : 0) - (b.source === "base" ? 1 : 0));
    return list.slice(0, 60);
  }, [products, q]);

  // онлайн-поиск по OpenFoodFacts с дебаунсом
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 3 || mode !== "search") {
      setOnline([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setLoading(true);
      try {
        const res = await searchOnline(s, ac.signal);
        setOnline(res.filter((p) => !products.some((lp) => lp.barcode && lp.barcode === p.barcode)));
      } catch {
        /* offline — ничего страшного */
      } finally {
        setLoading(false);
      }
    }, 550);
    return () => clearTimeout(t);
  }, [q, mode, products]);

  function pick(p: Product, persist = false) {
    if (persist) onSaveProduct(p);
    setPicked(p);
    setGrams(String(p.portion ?? 100));
    setMode("portion");
  }

  async function handleCode(code: string) {
    setMode("search");
    const known = products.find((p) => p.barcode === code);
    if (known) {
      setNotice(null);
      pick(known);
      return;
    }
    setLoading(true);
    setNotice("Ищем штрихкод " + code + "…");
    try {
      const found = await lookupBarcode(code);
      if (found) {
        setNotice(null);
        pick(found, true);
        return;
      }
    } catch {
      /* fallthrough */
    } finally {
      setLoading(false);
    }
    setNotice(`Штрихкод ${code} не найден — добавь продукт в свою базу`);
    setDraft((d) => ({ ...d, barcode: code }));
    setMode("create");
  }

  function saveDraft() {
    const p: Product = {
      id: uid(),
      name: draft.name.trim() || "Без названия",
      brand: draft.brand.trim() || undefined,
      barcode: draft.barcode || undefined,
      kcal: +draft.kcal || 0,
      protein: +draft.protein || 0,
      fat: +draft.fat || 0,
      carbs: +draft.carbs || 0,
      portion: +draft.portion || undefined,
      source: "user",
      createdAt: new Date().toISOString(),
    };
    onSaveProduct(p);
    pick(p);
  }

  /* ---------- порция ---------- */
  if (mode === "portion" && picked) {
    const g = +grams || 0;
    const k = g / 100;
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="font-semibold">{picked.name}</div>
          {picked.brand && <div className="text-xs text-mute">{picked.brand}</div>}
          <div className="mt-1 text-xs text-mute">
            на 100 г: {picked.kcal} ккал · Б {picked.protein} · Ж {picked.fat} · У {picked.carbs}
          </div>
        </div>

        <Field label="Количество, г / мл">
          <input
            className="field text-lg"
            inputMode="decimal"
            autoFocus
            value={grams}
            onChange={(e) => setGrams(e.target.value.replace(",", "."))}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {[30, 50, 100, 150, 200, 250].map((v) => (
            <button
              key={v}
              onClick={() => setGrams(String(v))}
              className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-xs transition hover:border-acc2/60"
            >
              {v} г
            </button>
          ))}
          {picked.portion && (
            <button
              onClick={() => setGrams(String(picked.portion))}
              className="rounded-lg border border-acc/40 bg-acc/10 px-3 py-1.5 text-xs text-acc"
            >
              1 порция · {picked.portion} г
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Ккал", round(picked.kcal * k)],
            ["Белки", round(picked.protein * k, 1)],
            ["Жиры", round(picked.fat * k, 1)],
            ["Углев.", round(picked.carbs * k, 1)],
          ].map(([l, v]) => (
            <div key={l as string} className="card px-2 py-3">
              <div className="text-lg font-bold">{v}</div>
              <div className="text-[11px] text-mute">{l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Btn variant="soft" className="flex-1" onClick={() => setMode("search")}>
            Назад
          </Btn>
          <Btn
            className="flex-[2]"
            disabled={g <= 0}
            onClick={() => {
              onAdd({
                id: uid(),
                productId: picked.id,
                name: picked.name,
                grams: g,
                kcal: picked.kcal,
                protein: picked.protein,
                fat: picked.fat,
                carbs: picked.carbs,
              });
              onClose();
            }}
          >
            Добавить в «{mealTitle}»
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------- сканер ---------- */
  if (mode === "scan") return <Scanner onDetect={handleCode} onClose={() => setMode("search")} />;

  /* ---------- создание продукта ---------- */
  if (mode === "create") {
    return (
      <div className="space-y-3">
        {notice && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{notice}</div>}
        <Field label="Название">
          <input className="field" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Бренд">
            <input className="field" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
          </Field>
          <Field label="Штрихкод">
            <input
              className="field"
              inputMode="numeric"
              value={draft.barcode}
              onChange={(e) => setDraft({ ...draft, barcode: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </div>
        <div className="text-xs text-mute">Пищевая ценность на 100 г / 100 мл</div>
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
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value.replace(",", ".") })}
              />
            </Field>
          ))}
        </div>
        <Field label="Вес порции, г" hint="необязательно — 1 шт / 1 упаковка">
          <input
            className="field"
            inputMode="decimal"
            value={draft.portion}
            onChange={(e) => setDraft({ ...draft, portion: e.target.value.replace(",", ".") })}
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn variant="soft" className="flex-1" onClick={() => setMode("search")}>
            Назад
          </Btn>
          <Btn className="flex-1" disabled={!draft.name.trim() || !draft.kcal} onClick={saveDraft}>
            Сохранить в базу
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------- поиск ---------- */
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="Поиск продукта…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button
          onClick={() => setMode("scan")}
          title="Сканировать штрихкод"
          className="shrink-0 rounded-xl border border-acc/40 bg-acc/10 px-3 text-xl"
        >
          📷
        </button>
      </div>

      {notice && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{notice}</div>}

      <button
        onClick={() => {
          setDraft({ name: q, brand: "", kcal: "", protein: "", fat: "", carbs: "", portion: "", barcode: "" });
          setMode("create");
        }}
        className="w-full rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-mute transition hover:border-acc/50 hover:text-acc"
      >
        + Создать свой продукт
      </button>

      <div className="space-y-1.5">
        {local.map((p) => (
          <Row key={p.id} p={p} onClick={() => pick(p)} />
        ))}
        {!local.length && !online.length && !loading && <Empty icon="🔍" text="Ничего не нашлось" />}

        {(loading || online.length > 0) && (
          <div className="pt-3 text-xs font-medium tracking-wide text-mute uppercase">
            Open Food Facts {loading && "· загрузка…"}
          </div>
        )}
        {online.map((p) => (
          <Row key={p.id} p={p} online onClick={() => pick(p, true)} />
        ))}
      </div>
    </div>
  );
}

function Row({ p, onClick, online }: { p: Product; onClick: () => void; online?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/60 px-3 py-2.5 text-left transition hover:border-acc2/60"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="truncate text-xs text-mute">
          {p.brand ? p.brand + " · " : ""}Б {p.protein} · Ж {p.fat} · У {p.carbs}
          {p.source === "user" ? " · моё" : online ? " · онлайн" : ""}
        </div>
      </div>
      <div className="shrink-0 text-sm font-semibold text-acc">{p.kcal}</div>
      <div className="shrink-0 text-[10px] text-mute">ккал/100г</div>
    </button>
  );
}
