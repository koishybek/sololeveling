"use client";

import {
  useEffect,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icons";

/* ─────────────────────────── Button ─────────────────────────── */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const SECONDARY =
  "bg-transparent text-accent-hover shadow-[inset_0_0_0_1.5px_var(--color-accent)] hover:bg-accent-soft";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_4px_12px_rgba(95,184,142,0.28)] hover:bg-accent-hover active:bg-accent-active",
  secondary: SECONDARY,
  outline: SECONDARY, // alias kept while screens migrate
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-btn px-5 py-[14px] text-[15px] font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ─────────────────────────── Card ─────────────────────────── */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card bg-surface p-5 shadow-card", className)}
      {...props}
    />
  );
}

/* ─────────────────────────── Progress ring ─────────────────────────── */

export function ProgressRing({
  value,
  max,
  size = 220,
  stroke = 14,
  color = "var(--color-accent)",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ─────────────────────────── Macros ─────────────────────────── */

/** Compact macro bar (label + value + thin track). */
export function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) * 100 : 0;
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}
          <span className="text-muted">/{Math.round(goal)} г</span>
        </span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** Full-width diary macro row: icon circle + label + cur/max + progress. */
export function MacroRow({
  iconName,
  label,
  value,
  goal,
  color,
  onClick,
}: {
  iconName: IconName;
  label: string;
  value: number;
  goal: number;
  color: string;
  onClick?: () => void;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) * 100 : 0;
  const Wrap = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 text-left",
        onClick && "transition active:scale-[.99]",
      )}
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-full text-white"
        style={{ background: color }}
      >
        <Icon name={iconName} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[15px] font-semibold">{label}</span>
          <span className="text-[13px] tabular-nums text-muted">
            <span className="font-bold text-fg">{Math.round(value)}</span> /{" "}
            {Math.round(goal)} г
          </span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-full bg-track">
          <div
            className="h-full rounded-full [animation:barGrow_.9s_cubic-bezier(.4,0,.2,1)]"
            style={{ width: `${pct}%`, background: color, transformOrigin: "left" }}
          />
        </div>
      </div>
      {onClick && <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />}
    </Wrap>
  );
}

/** Soft-tinted macro pill (used on the plan-reveal screen). */
export function MacroPill({
  iconName,
  label,
  value,
  color,
  softBg,
}: {
  iconName: IconName;
  label: string;
  value: string;
  color: string;
  softBg: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
      style={{ background: softBg }}
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-full text-white"
        style={{ background: color }}
      >
        <Icon name={iconName} size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[15px] font-bold tabular-nums" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Inputs & controls ─────────────────────────── */

export function NumberField({
  value,
  onChange,
  suffix,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] bg-surface-2 px-4 py-3 focus-within:ring-2 focus-within:ring-accent/40">
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        className="w-full bg-transparent text-lg outline-none placeholder:text-muted"
      />
      {suffix && <span className="shrink-0 text-muted">{suffix}</span>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-[14px] bg-surface-2 px-4 py-3 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40",
        className,
      )}
      {...props}
    />
  );
}

/** Selectable card shell (onboarding option, etc.). */
export function OptionButton({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      className={cn(
        "w-full rounded-card bg-surface p-4 text-left shadow-card transition active:scale-[.99]",
        selected && "ring-2 ring-accent",
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-[14px] bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition",
              active ? "bg-surface text-fg shadow-card" : "text-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onDec,
  onInc,
  decDisabled,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
}) {
  return (
    <div className="flex items-center rounded-[14px] border border-border bg-surface">
      <button
        onClick={onDec}
        disabled={decDisabled}
        aria-label="Меньше"
        className="grid size-11 place-items-center text-fg transition active:scale-90 disabled:opacity-30"
      >
        <Icon name="minus" size={17} strokeWidth={2.4} />
      </button>
      <div className="min-w-[64px] border-x border-border py-2.5 text-center text-[15px] font-bold tabular-nums">
        {value}
      </div>
      <button
        onClick={onInc}
        aria-label="Больше"
        className="grid size-11 place-items-center text-fg transition active:scale-90"
      >
        <Icon name="plus" size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--color-accent)" : "#D6D4CC" }}
    >
      <span
        className="absolute top-[3px] size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-all"
        style={{ left: checked ? "23px" : "3px" }}
      />
    </button>
  );
}

export type TagTone = "sage" | "protein" | "carb" | "fat" | "neutral";

const TAG_TONES: Record<TagTone, string> = {
  sage: "text-accent-hover bg-accent-soft",
  protein: "text-[#D9694F] bg-protein-soft",
  carb: "text-[#C8871F] bg-carb-soft",
  fat: "text-[#3F9793] bg-fat-soft",
  neutral: "text-muted bg-surface-2",
};

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
        TAG_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
      {children}
    </div>
  );
}

/* ─────────────────────────── Bottom sheet ─────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end [animation:fadeIn_.2s_ease]">
      <button
        aria-label="Закрыть"
        className="absolute inset-0 cursor-default bg-[rgba(46,46,51,0.35)] backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative z-10 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-surface px-6 pt-3.5 [animation:sheetUp_.28s_cubic-bezier(.2,.8,.2,1)]"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-5 h-[5px] w-[38px] rounded-full bg-[#DBD9D1]" />
        {title && (
          <h2 className="mb-5 text-center text-2xl font-bold">{title}</h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
