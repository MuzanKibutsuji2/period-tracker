// ─── Mira · first-run onboarding ────────────────────────────────────────────
// No account. Five gentle steps, everything skippable except entering.

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarHeart, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { useStore } from '../lib/store';
import { todayISO } from '../lib/cycle';
import { Logo, PrivacyBadge } from './ui';

const STEPS = ['Welcome', 'Privacy', 'Last period', 'Typical cycle', 'Done'] as const;

export default function Onboarding(): React.JSX.Element {
  const { actions } = useStore();
  const [step, setStep] = useState(0);
  const [lastStart, setLastStart] = useState<string>('');
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);

  const finish = (): void => {
    actions.completeOnboarding({
      lastPeriodStart: lastStart || null,
      cycleLength: cycleLen,
      periodLength: periodLen,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#efeaff] via-[#f6f5fb] to-[#f6f5fb] dark:from-[#191430] dark:via-[#0e0e16] dark:to-[#0e0e16]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-10">
        {/* progress */}
        <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: i <= step ? '100%' : '0%', background: i <= step ? 'var(--accent)' : 'transparent' }}
              />
            </div>
          ))}
        </div>

        <div key={step} className="anim-fade-up flex flex-1 flex-col pt-8">
          {step === 0 && (
            <>
              <div className="flex items-center gap-3">
                <span className="anim-float inline-block"><Logo size={52} /></span>
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight">Mira</h1>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">your cycle, decoded gently</p>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {[
                  { icon: <Waves size={20} />, title: 'Body Weather, not just "Day 14"', body: 'Your logs become a glanceable forecast of energy, mood, sleep and more.' },
                  { icon: <Sparkles size={20} />, title: 'Patterns without the clinic vibe', body: 'Pattern Lab spots rhythms in your history — in plain, careful language.' },
                  { icon: <CalendarHeart size={20} />, title: '15-second check-ins', body: 'No giant forms. A few taps a day is genuinely enough.' },
                ].map((f) => (
                  <div key={f.title} className="card flex gap-3.5 p-4">
                    <div className="accent-soft-bg accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">{f.icon}</div>
                    <div>
                      <div className="text-[15px] font-extrabold">{f.title}</div>
                      <div className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{f.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="accent-soft-bg flex h-16 w-16 items-center justify-center rounded-3xl text-emerald-600 dark:text-emerald-300">
                <ShieldCheck size={30} />
              </div>
              <h2 className="mt-5 font-display text-[28px] font-semibold leading-tight">Your data never leaves this device.</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                No account, no login, no cloud. Mira stores everything in this browser's private storage.
              </p>
              <div className="mt-5 space-y-2.5 text-[14px] font-medium">
                {['No sign-up or email, ever', 'Works fully offline after first load', 'Export or delete everything, anytime', 'No ads, no trackers, no analytics'].map((t) => (
                  <div key={t} className="card flex items-center gap-3 px-4 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-sm text-emerald-600 dark:text-emerald-300">✓</span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-4"><PrivacyBadge /></div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-[28px] font-semibold leading-tight">When did your last period start?</h2>
              <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Pick the first day of bleeding. Unsure? Skip — you can log it later.</p>
              <label className="mt-6 block">
                <span className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-slate-400">First day of last period</span>
                <input
                  type="date"
                  className="field h-14 text-lg"
                  value={lastStart}
                  max={todayISO()}
                  onChange={(e) => setLastStart(e.target.value)}
                  aria-label="First day of last period"
                />
              </label>
              <button onClick={() => setLastStart('')} className="mt-3 text-sm font-bold accent-text">
                I don't remember / prefer to skip
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-[28px] font-semibold leading-tight">What feels typical for you?</h2>
              <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Rough guesses are fine — Mira learns from your actual history.</p>
              <div className="card mt-6 p-5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="ob-cycle" className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Cycle length</label>
                  <span className="font-display text-2xl font-semibold">{cycleLen} <span className="text-sm font-normal text-slate-400">days</span></span>
                </div>
                <input id="ob-cycle" type="range" min={15} max={90} value={cycleLen} onChange={(e) => setCycleLen(Number(e.target.value))} className="mt-3" aria-valuetext={`${cycleLen} days`} />
                <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-400"><span>15</span><span>90</span></div>
              </div>
              <div className="card mt-3 p-5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="ob-period" className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Period length</label>
                  <span className="font-display text-2xl font-semibold">{periodLen} <span className="text-sm font-normal text-slate-400">days</span></span>
                </div>
                <input id="ob-period" type="range" min={1} max={15} value={periodLen} onChange={(e) => setPeriodLen(Number(e.target.value))} className="mt-3" aria-valuetext={`${periodLen} days`} />
                <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-400"><span>1</span><span>15</span></div>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="anim-float text-6xl" aria-hidden>🌙</span>
              <h2 className="mt-5 font-display text-[30px] font-semibold">You're all set.</h2>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                Start with a 15-second check-in, or explore first with realistic sample data.
              </p>
              <button
                onClick={() => { actions.loadSampleData(); }}
                className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-3 text-sm font-bold text-slate-500 transition hover:border-slate-400 dark:border-white/15 dark:text-slate-300"
              >
                ✨ Explore with sample data first
              </button>
              <p className="mt-2 text-xs text-slate-400">Sample data is clearly labelled and deletable in Settings.</p>
            </div>
          )}
        </div>

        {/* nav */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-200"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-accent flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button onClick={finish} className="btn-accent h-14 flex-1 rounded-2xl text-[15px] font-extrabold">
              Enter Mira →
            </button>
          )}
        </div>
        {step < 4 && (
          <button onClick={finish} className="mt-3 text-[13px] font-bold text-slate-400">
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
}
