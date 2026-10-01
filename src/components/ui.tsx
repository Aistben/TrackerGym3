import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
  full,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  full?: boolean;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`sheet-in relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-panel sm:rounded-3xl ${
          full ? "h-[92vh] sm:h-[80vh]" : "max-h-[90vh]"
        } flex flex-col`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">{title}</h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-panel2 text-mute transition hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
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
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-mute uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "soft" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-acc text-ink hover:brightness-110",
    soft: "bg-panel2 text-white border border-line hover:border-acc2/60",
    ghost: "text-mute hover:text-white",
    danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
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
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
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
