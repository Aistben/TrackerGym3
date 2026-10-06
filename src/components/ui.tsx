import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dropdownPlacement, dropdownScrollDelta, type DropRect } from "../lib/dropdown";

export function Sheet({
  open,
  onClose,
  title,
  children,
  full,
  center = false,
  compact = false,
  noBackdrop = false,
  solid = false,
  closeButtonClassName,
  placement = center ? "center" : "bottom",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  full?: boolean;
  center?: boolean;
  compact?: boolean;
  noBackdrop?: boolean;
  /** непрозрачный фон — карточки под шторкой не просвечивают */
  solid?: boolean;
  closeButtonClassName?: string;
  placement?: "center" | "bottom";
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        full ? "items-stretch p-0 sm:items-center sm:p-4" : placement === "center" ? "items-center p-4" : "items-end p-3 pb-[calc(4.5rem+var(--safe-bottom))]"
      }`}
    >
      {/* Без тёмной подложки (noBackdrop) слой всё равно перехватывает клики —
          иначе под окном можно было нажимать кнопки и открыть вторую форму поверх первой */}
      {noBackdrop ? (
        <div className="absolute inset-0 touch-none" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
      ) : (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        style={solid ? { background: "#241a40" } : undefined}
        className={`sheet-in relative w-full overflow-hidden border-line ${solid ? "backdrop-blur-none" : "bg-panel"} shadow-2xl shadow-black/60 ${
          full
            ? "h-[100dvh] max-h-none max-w-lg rounded-none border-0 sm:h-[92vh] sm:max-h-[92vh] sm:rounded-3xl sm:border"
            : `${compact ? "max-w-sm" : "max-w-lg"} border ${
                placement === "center"
                  ? `${compact ? "max-h-[72vh]" : "max-h-[88vh]"} rounded-3xl`
                  : compact
                    ? "max-h-[58vh] rounded-3xl"
                    : "max-h-[74vh] rounded-3xl"
              } max-h-[90vh]`
        } flex flex-col`}
      >
        <div className={`${placement === "center" || full ? "hidden" : "flex"} shrink-0 flex-col pt-2 sm:hidden`}>
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-snug">{title}</h3>
          <button
            onClick={onClose}
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-panel2 transition active:scale-90 ${closeButtonClassName ?? "text-mute hover:text-ink"}`}
          >
            ✕
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto overscroll-contain ${compact ? "p-3" : "p-4"}`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-mute uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "soft" | "danger";
  size?: "md" | "sm";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary: "bg-acc text-white shadow-sm shadow-acc/40 hover:brightness-110",
    soft: "bg-panel2 text-ink border border-line hover:border-acc2/60 hover:bg-panel2/70",
    ghost: "text-mute hover:text-ink hover:bg-white/10",
    danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
  }[variant];
  const sizing = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl text-center font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${sizing} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/** Круглая кнопка-иконка фиксированного размера — не сжимается и не переносит текст. */
export function IconBtn({
  children,
  onClick,
  title,
  active,
  size = 36,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full border text-lg transition active:scale-90 ${
        active ? "border-acc/50 bg-acc/15 text-acc" : "border-line bg-panel2 text-mute hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Сегментированный переключатель (вкладки внутри блока, не на всю навигацию). */
/**
 * Выпадающий список вместо системного <select>: подписи переносятся и видны
 * целиком (в системном они обрезались), меню непрозрачное и не «просвечивает»
 * сквозь него список под ним.
 *
 * Меню всегда раскрывается ВНИЗ от кнопки, на всю её ширину и с плавным
 * раскрытием. Если под кнопкой места мало (она прижата к нижней навигации),
 * страница сначала чуть прокручивается — чтобы списку было куда раскрыться, —
 * но вверх список не «переворачивается»: так сразу понятно, что выбор
 * раскрылся под своим полем.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Выбери…",
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; hint?: string; emoji?: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DropRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === value);

  /** Верх футера-навигации — до него считаем свободное место под полем. */
  function navTop() {
    return document.querySelector<HTMLElement>("[data-bottom-nav]")?.getBoundingClientRect().top ?? window.innerHeight;
  }

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    setRect(
      dropdownPlacement({
        trigger: r,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        navTop: navTop(),
      }),
    );
  }

  function openMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    // Освобождаем место под списком: подкручиваем страницу так, чтобы пункты
    // раскрылись вниз целиком, а не упирались в нижнюю навигацию.
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) {
      const delta = dropdownScrollDelta({ trigger: r, navTop: navTop(), optionsCount: options.length });
      const canScroll = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (delta > 0 && canScroll > 0) {
        window.scrollBy({ top: Math.min(delta + 4, canScroll), behavior: "smooth" });
      }
    }
    place();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onReflow = () => place();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={openMenu}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-[0.99] ${
          open ? "border-acc2 bg-panel2" : "border-line bg-panel2 hover:border-acc2/50"
        }`}
      >
        {current?.emoji && <span className="shrink-0 text-base leading-none">{current.emoji}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug font-medium break-words">{current?.label ?? placeholder}</span>
          {current?.hint && <span className="mt-0.5 block text-[11px] leading-snug text-mute">{current.hint}</span>}
        </span>
        <span className={`shrink-0 text-xs text-mute transition ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && rect &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            style={{
              position: "fixed",
              zIndex: 80,
              left: rect.left,
              width: rect.width,
              top: rect.top,
              maxHeight: rect.maxHeight,
            }}
            className="drop-in overflow-y-auto overscroll-contain rounded-xl border border-line bg-[#241a40] p-1 shadow-2xl shadow-black/60"
          >
            {options.map((option) => {
              const selected = option.key === value;
              return (
                <button
                  type="button"
                  key={option.key}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                    selected ? "bg-acc/20" : "hover:bg-white/5"
                  }`}
                >
                  {option.emoji && <span className="shrink-0 text-base leading-none">{option.emoji}</span>}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm leading-snug font-medium ${selected ? "text-acc" : ""}`}>{option.label}</span>
                    {option.hint && <span className="mt-0.5 block text-[11px] leading-snug text-mute">{option.hint}</span>}
                  </span>
                  {selected && <span className="shrink-0 text-xs text-acc">✓</span>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Tabs<T extends string | number>({
  value,
  onChange,
  items,
  className = "",
  fill = true,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { key: T; label: ReactNode }[];
  className?: string;
  /** fill=false — кнопки по содержимому, подписи не обрезаются (весь текст виден) */
  fill?: boolean;
}) {
  return (
    <div className={`flex justify-center gap-1 rounded-xl border border-line bg-panel2/60 p-1 ${className}`}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={`${fill ? "min-w-0 flex-1 truncate" : "shrink-0"} rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            value === it.key ? "bg-acc text-white shadow-sm shadow-acc/30" : "text-mute hover:text-ink"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 132,
  stroke = 11,
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: ReactNode;
  sub?: ReactNode;
}) {
  const pct = max > 0 ? Math.min(value / max, 1.35) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const over = value > max * 1.02;
  const color = over ? "var(--color-warn)" : "var(--color-acc)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(pct, 1))}
          style={{ transition: "stroke-dashoffset .5s ease, stroke .3s" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl leading-none font-bold">{label}</div>
        {sub && <div className="mt-1 text-[11px] text-mute">{sub}</div>}
      </div>
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-10 text-center text-sm text-mute">
      <div className="mb-2 text-3xl opacity-60">{icon}</div>
      {text}
    </div>
  );
}

/** Общие атрибуты полей: гасят автозаполнение/подсказки браузера
 * (та самая белая панель над клавиатурой с «ключ-картами» и т.п.).
 * Случайное name отбивает у Safari/менеджеров паролей желание
 * показывать плашку автозаполнения — она срабатывает на «говорящие» имена. */
export const noSuggest = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  name: `tg-${Math.random().toString(36).slice(2, 10)}`,
  "data-form-type": "other",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
} as const;

/** Числовое поле: только цифровая клавиатура, без автозаполнения */
export const numField = {
  ...noSuggest,
  type: "text" as const,
  inputMode: "decimal" as const,
  enterKeyHint: "done" as const,
};
