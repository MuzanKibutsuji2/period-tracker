// ─── Mira · shared UI primitives ────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';

// ─── Logo ───────────────────────────────────────────────────────────────────

export function Logo({ size = 40 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Mira logo">
      <defs>
        <linearGradient id="mira-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C6CF0" />
          <stop offset="1" stopColor="#2FBFA0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#mira-g)" />
      <path d="M40 13a13.5 13.5 0 1 0 10.4 22A16 16 0 0 1 40 13Z" fill="white" opacity=".95" />
      <circle cx="44.5" cy="23" r="3" fill="white" opacity=".85" />
      <circle cx="24" cy="44" r="2" fill="white" opacity=".6" />
    </svg>
  );
}

// ─── Sheet (bottom sheet / modal) ───────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}): React.JSX.Element | null {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close dialog"
        className="sheet-backdrop anim-fade-in absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={`anim-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl dark:bg-[#17171f] sm:rounded-[28px] ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5 sm:px-7 sm:pt-6">
          <div>
            <h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>
        <div className="nice-scroll overflow-y-auto px-5 pb-6 pt-2 sm:px-7 sm:pb-7">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm ────────────────────────────────────────────────────────────────

export function Confirm({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  danger,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
}): React.JSX.Element | null {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
      <div className="mt-6 flex gap-3">
        <button onClick={onCancel} className="h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`h-12 flex-1 rounded-2xl text-sm font-bold text-white ${danger ? 'bg-red-500' : 'btn-accent'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-extrabold tracking-tight">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressRing({
  value,
  max,
  size = 148,
  stroke = 12,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}): React.JSX.Element {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, value / max));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${value} of ${max}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function PrivacyBadge({ compact }: { compact?: boolean }): React.JSX.Element {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300 ${
        compact ? 'text-[11px] font-bold' : 'text-xs font-bold'
      }`}
      title="All data is stored in this browser only. No account, no cloud."
    >
      <ShieldCheck size={compact ? 13 : 15} aria-hidden />
      <span>On-device only</span>
    </div>
  );
}

export function ConfidencePill({ level }: { level: 'high' | 'medium' | 'low' }): React.JSX.Element {
  const map = {
    high: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    low: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${map[level]}`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${level === 'high' ? 'bg-emerald-500' : level === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {level} confidence
    </span>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'good' | 'bad'; children: React.ReactNode }): React.JSX.Element {
  const map = {
    info: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
    warn: 'border-amber-300/50 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
    good: 'border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
    bad: 'border-red-300/50 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200',
  } as const;
  return <div className={`rounded-2xl border px-4 py-3 text-[13px] font-medium leading-relaxed ${map[tone]}`}>{children}</div>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}): React.JSX.Element {
  return (
    <div role="group" aria-label={label} className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`h-10 flex-1 rounded-xl text-[13px] font-bold transition ${
            value === o.id ? 'bg-white text-slate-800 shadow dark:bg-white/15 dark:text-white' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Disclaimer(): React.JSX.Element {
  return (
    <p className="text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
      Mira is a wellness journal, not a medical device. Predictions are estimates and naturally vary — never use them for
      contraception or diagnosis. If something feels unusual or worries you, please talk to a qualified healthcare professional.
    </p>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }): React.JSX.Element {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 font-display text-[22px] font-semibold leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}
