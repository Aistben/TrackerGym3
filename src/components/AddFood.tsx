import { useEffect, useMemo, useRef, useState } from "react";
import type { MealEntry, Product } from "../lib/types";
import { round } from "../lib/nutrition";
import { uid } from "../lib/storage";
import { lookupBarcode, searchOnline } from "../lib/openfoodfacts";
import { sameBarcode } from "../lib/barcode";
import { Btn, Empty, Field, IconBtn, Sheet, Tabs, noSuggest, numField } from "./ui";
import Scanner from "./Scanner";
import LabelScanner from "./LabelScanner";

type Mode = "search" | "scan" | "form" | "portion" | "photo";
type Lib = "recent" | "base";

const blankDraft = { name: "", brand: "", kcal: "", protein: "", fat: "", carbs: "", portion: "", barcode: "" };

export default function AddFood({
  products,
  recentProductIds,
  startMode = "search",
  onSaveProduct,
  onDeleteProduct,
  onUsed,
  onAdd,
  onClose,
  onNotice,
  onPortionPreview,
  onModeChange,
}: {
  products: Product[];
  recentProductIds: string[];
  mealTitle: string;
  startMode?: "search" | "scan" | "photo";
  onSaveProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUsed: (id: string) => void;
  onAdd: (entry: MealEntry) => void;
  onClose: () => void;
  onNotice?: (message: string) => void;
  /** живой предпросмотр порции — чтобы график сверху пересчитывался на лету */
  onPortionPreview?: (preview: { product: Product; grams: number } | null) => void;
  onModeChange?: (mode: "search" | "scan" | "form" | "portion" | "photo") => void;
}) {
  const [mode, setMode] = useState<Mode>(startMode);
  const [lib, setLib] = useState<Lib>(recentProductIds.length ? "recent" : "base");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [grams, setGrams] = useState("100");
  const [online, setOnline] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [draft, setDraft] = useState({ ...blankDraft });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (mode !== "portion" || !picked) {
      onPortionPreview?.(null);
      return;
    }
    onPortionPreview?.({ product: picked, grams: Math.max(0, Number(grams) || 0) });
  }, [mode, picked, grams, onPortionPreview]);

  useEffect(() => () => onPortionPreview?.(null), [onPortionPreview]);

  const recent = useMemo(
    () => recentProductIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [recentProductIds, products],
  );

  const base = useMemo(() => [...products].sort((a, b) => (a.source === "base" ? 1 : 0) - (b.source === "base" ? 1 : 0)), [products]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const source = lib === "recent" ? recent : base;
    const filtered = s
      ? source.filter((p) => (p.name + " " + (p.brand ?? "") + " " + (p.barcode ?? "")).toLowerCase().includes(s))
      : source;
    return filtered.slice(0, 60);
  }, [lib, recent, base, q]);

  // онлайн-поиск по OpenFoodFacts с дебаунсом — только пока открыта вкладка «База»
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const s = q.trim();
    abort.current?.abort();
    if (s.length < 3 || mode !== "search" || lib !== "base") {
      setOnline([]);
      setLoading(false);
      return;
    }
    let activeRequest: AbortController | null = null;
    const t = setTimeout(async () => {
      const ac = new AbortController();
      activeRequest = ac;
      abort.current = ac;
      setLoading(true);
      try {
        const res = await searchOnline(s, ac.signal);
        if (!ac.signal.aborted) {
          setOnline(res.filter((p) => !products.some((lp) => sameBarcode(lp.barcode, p.barcode))));
        }
      } catch {
        /* offline or cancelled — ничего страшного */
      } finally {
        if (activeRequest === ac) setLoading(false);
      }
    }, 550);
    return () => {
      window.clearTimeout(t);
      activeRequest?.abort();
    };
  }, [q, mode, lib, products]);

  function pick(p: Product, persist = false) {
    if (persist) onSaveProduct(p);
    setPicked(p);
    setGrams(String(p.portion ?? 100));
    setMode("portion");
  }

  function openCreate() {
    setEditing(null);
    setDraft({ ...blankDraft });
    setMode("form");
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDraft({
      name: p.name,
      brand: p.brand ?? "",
      kcal: String(p.kcal),
      protein: String(p.protein),
      fat: String(p.fat),
      carbs: String(p.carbs),
      portion: p.portion ? String(p.portion) : "",
      barcode: p.barcode ?? "",
    });
    setMode("form");
  }

  async function handleCode(code: string) {
    setMode("search");
    const known = products.find((p) => sameBarcode(p.barcode, code));
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
    setNotice(`Штрихкод ${code} не найден — добавь карточку вручную`);
    setEditing(null);
    setDraft({ ...blankDraft, barcode: code });
    setMode("form");
  }

  async function lookupDraftProduct() {
    const code = draft.barcode.replace(/\D/g, "");
    if (code.length < 8) return;
    setLoading(true);
    setNotice("Ищем продукт по штрихкоду…");
    try {
      const found = await lookupBarcode(code);
      if (!found) {
        setNotice("Продукт не найден. Заполни название и БЖУ вручную.");
        return;
      }
      setDraft((current) => ({
        ...current,
        name: found.name,
        brand: found.brand ?? "",
        barcode: found.barcode ?? code,
        kcal: String(found.kcal),
        protein: String(found.protein),
        fat: String(found.fat),
        carbs: String(found.carbs),
        portion: found.portion ? String(found.portion) : current.portion,
      }));
      setNotice("Название, бренд, штрихкод и БЖУ заполнены — проверь данные перед сохранением.");
    } catch {
      setNotice("Не удалось получить данные по штрихкоду. Заполни карточку вручную.");
    } finally {
      setLoading(false);
    }
  }

  function saveDraft() {
    const p: Product = {
      id: editing?.id ?? uid(),
      name: draft.name.trim() || "Без названия",
      brand: draft.brand.trim() || undefined,
      barcode: draft.barcode || undefined,
      kcal: +draft.kcal || 0,
      protein: +draft.protein || 0,
      fat: +draft.fat || 0,
      carbs: +draft.carbs || 0,
      portion: +draft.portion || undefined,
      source: editing?.source === "base" ? "base" : "user",
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    onSaveProduct(p);
    if (editing) {
      setNotice(`Сохранено: ${p.name}`);
      setMode("search");
    } else {
      pick(p);
    }
  }

  function confirmAdd() {
    if (!picked) return;
    const g = +grams || 0;
    onUsed(picked.id);
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
    onNotice?.(`${picked.name} добавлен в дневник`);
    onClose();
  }

  /* ---------- порция ---------- */
  if (mode === "portion" && picked) {
    const g = +grams || 0;
    const k = g / 100;
    return (
      <div className="space-y-3">
        <div className="card px-3 py-2.5">
          <div className="truncate text-sm font-semibold">{picked.name}</div>
          <div className="truncate text-[11px] text-mute">
            {picked.brand ? picked.brand + " · " : ""}на 100 г: {picked.kcal} ккал · Б {picked.protein} · Ж {picked.fat} · У {picked.carbs}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="field min-w-0 flex-1 text-center text-lg"
            {...numField}
            value={grams}
            onChange={(e) => setGrams(e.target.value.replace(",", "."))}
          />
          <span className="shrink-0 text-sm text-mute">г / мл</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[30, 50, 100, 150, 200, 250].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setGrams(String(v))}
              className={`rounded-lg border px-2.5 py-1 text-xs whitespace-nowrap transition ${
                +grams === v ? "border-acc bg-acc/15 text-acc" : "border-line bg-panel2 hover:border-acc2/60"
              }`}
            >
              {v}
            </button>
          ))}
          {picked.portion && (
            <button
              type="button"
              onClick={() => setGrams(String(picked.portion))}
              className="rounded-lg border border-acc/40 bg-acc/10 px-2.5 py-1 text-xs whitespace-nowrap text-acc"
            >
              порция · {picked.portion}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            ["Ккал", round(picked.kcal * k)],
            ["Белки", round(picked.protein * k, 1)],
            ["Жиры", round(picked.fat * k, 1)],
            ["Углев.", round(picked.carbs * k, 1)],
          ].map(([l, v]) => (
            <div key={l as string} className="card px-1 py-2">
              <div className="truncate text-base font-bold">{v}</div>
              <div className="truncate text-[10px] text-mute">{l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Btn variant="soft" size="sm" className="flex-1" onClick={() => setMode("search")}>
            Назад
          </Btn>
          <Btn className="flex-[2]" disabled={g <= 0} onClick={confirmAdd}>
            Добавить
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------- сканер ---------- */
  if (mode === "scan") return <Scanner onDetect={handleCode} onClose={() => setMode("search")} />;

  /* ---------- создание / редактирование продукта ---------- */
  if (mode === "form" || mode === "photo") {
    return (
      <div className="space-y-3">
        {notice && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{notice}</div>}
        <Field label="Название">
          <input className="field" {...noSuggest} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Бренд">
            <input className="field" {...noSuggest} value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
          </Field>
          <Field label="Штрихкод">
            <input
              className="field"
              {...numField}
              inputMode="numeric"
              value={draft.barcode}
              onChange={(e) => setDraft({ ...draft, barcode: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </div>
        {draft.barcode.replace(/\D/g, "").length >= 8 && (
          <Btn variant="soft" size="sm" className="w-full" disabled={loading} onClick={lookupDraftProduct}>
            {loading ? "Ищем…" : "Заполнить карточку по штрихкоду"}
          </Btn>
        )}
        <LabelScanner onRead={(values) => setDraft((current) => ({ ...current, ...values }))} />
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
                {...numField}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value.replace(",", ".") })}
              />
            </Field>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Btn variant="soft" className="flex-1" onClick={() => setMode("search")}>
            Назад
          </Btn>
          <Btn className="flex-1" disabled={!draft.name.trim() || !draft.kcal} onClick={saveDraft}>
            {editing ? "Сохранить" : "Сохранить в базу"}
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------- поиск: недавние / вся база ---------- */
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={searchRef}
          className="field"
          placeholder="Найти продукт по названию…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          {...noSuggest}
        />
        <IconBtn onClick={() => setMode("scan")} title="Дополнительно: сканировать штрихкод" size={44}>
          <span className="text-lg">📷</span>
        </IconBtn>
      </div>

      <Tabs
        value={lib}
        onChange={setLib}
        items={[
          { key: "recent", label: `🕘 Недавние${recent.length ? ` · ${recent.length}` : ""}` },
          { key: "base", label: `📦 Вся база · ${products.length}` },
        ]}
      />

      {notice && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{notice}</div>}

      <button
        onClick={openCreate}
        className="w-full rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-mute transition hover:border-acc/50 hover:text-acc"
      >
        + Создать свой продукт
      </button>

      <div className="space-y-1.5">
        {list.map((p) => (
          <Row key={p.id} p={p} onClick={() => pick(p)} onEdit={() => openEdit(p)} onDelete={() => setDeleteProduct(p)} />
        ))}
        {!list.length && lib === "recent" && !loading && (
          <Empty icon="🕘" text="Пока нет недавних продуктов — добавь что-нибудь из базы" />
        )}
        {!list.length && lib === "base" && !online.length && !loading && <Empty icon="🔍" text="Ничего не нашлось" />}

        {lib === "base" && (loading || online.length > 0) && (
          <div className="pt-3 text-xs font-medium tracking-wide text-mute uppercase">
            Open Food Facts {loading && "· загрузка…"}
          </div>
        )}
        {lib === "base" &&
          online.map((p) => <Row key={p.id} p={p} online onClick={() => pick(p, true)} />)}
      </div>

      <Sheet open={!!deleteProduct} onClose={() => setDeleteProduct(null)} title="Удалить продукт?" center>
        {deleteProduct && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              Удалить «{deleteProduct.name}» из твоей базы? Уже добавленные записи в дневнике останутся.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="soft" onClick={() => setDeleteProduct(null)}>Нет</Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  onDeleteProduct(deleteProduct.id);
                  setDeleteProduct(null);
                  setNotice("Продукт удалён");
                }}
              >
                Да, удалить
              </Btn>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Row({
  p,
  onClick,
  online,
  onEdit,
  onDelete,
}: {
  p: Product;
  onClick: () => void;
  online?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel2/60 px-3 py-2.5 transition hover:border-acc2/60">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{p.name}</div>
          <div className="truncate text-xs text-mute">
            {p.brand ? p.brand + " · " : ""}Б {p.protein} · Ж {p.fat} · У {p.carbs}
            {p.source === "user" ? " · моё" : online ? " · онлайн" : ""}
          </div>
        </div>
        <div className="shrink-0 text-sm font-semibold text-acc">{p.kcal}</div>
        <div className="shrink-0 text-[10px] whitespace-nowrap text-mute">ккал/100г</div>
      </button>
      {p.source !== "base" && onEdit && (
        <IconBtn onClick={onEdit} title="Изменить" size={30}>
          <span className="text-xs">✏️</span>
        </IconBtn>
      )}
      {p.source !== "base" && onDelete && (
        <IconBtn onClick={onDelete} title="Удалить из базы" size={30}>
          <span className="text-xs">✕</span>
        </IconBtn>
      )}
    </div>
  );
}
