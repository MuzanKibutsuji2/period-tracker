// ─── Mira · Home dashboard ──────────────────────────────────────────────────
// Answers "where am I in my cycle?" in under 3 seconds, then invites depth.

import React, { useMemo } from 'react';
import {
  ArrowRight, CalendarDays, Droplets, Flame, Plus, Sparkles, TrendingUp, Waves,
} from 'lucide-react';
import { useStore } from '../lib/store';
import {
  fmtLong, fmtShort, getCycleState, loggingStreak, PHASE_META, todayISO,
} from '../lib/cycle';
import { buildBodyWeather, buildInsights, forecastSymptoms, gentleForecast } from '../lib/analytics';
import { ConfidencePill, Disclaimer, PrivacyBadge, ProgressRing, SectionTitle } from './ui';
import type { ViewKey } from '../App';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({
  onCheckIn,
  onGo,
}: {
  onCheckIn: () => void;
  onGo: (v: ViewKey) => void;
}): React.JSX.Element {
  const { data } = useStore();
  const today = todayISO();
  const state = useMemo(
    () => getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today),
    [data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today]
  );
  const weather = useMemo(
    () => buildBodyWeather({ periods: data.periods, logs: data.logs, assumedCycle: state.avgCycle, assumedPeriod: state.avgPeriod }),
    [data.periods, data.logs, state.avgCycle, state.avgPeriod]
  );
  const insights = useMemo(
    () => buildInsights({ periods: data.periods, logs: data.logs, assumedCycle: state.avgCycle, assumedPeriod: state.avgPeriod }),
    [data.periods, data.logs, state.avgCycle, state.avgPeriod]
  );
  const forecast = useMemo(
    () => gentleForecast({ periods: data.periods, logs: data.logs, assumedCycle: state.avgCycle, assumedPeriod: state.avgPeriod }),
    [data.periods, data.logs, state.avgCycle, state.avgPeriod]
  );
  const symptomOutlook = useMemo(
    () => forecastSymptoms({ periods: data.periods, logs: data.logs, assumedCycle: state.avgCycle, assumedPeriod: state.avgPeriod }),
    [data.periods, data.logs, state.avgCycle, state.avgPeriod]
  );
  const streak = useMemo(() => loggingStreak(data.logs, today), [data.logs, today]);
  const checkedToday = !!data.logs[today];

  const phase = state.phase ? PHASE_META[state.phase] : null;

  return (
    <div className="stagger space-y-5 pb-28 md:pb-10">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-400">{fmtLong(today)}</p>
          <h1 className="font-display text-[28px] font-semibold leading-tight">{greeting()}. 👋</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PrivacyBadge compact />
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1.5 text-[11px] font-bold text-orange-600 dark:text-orange-300">
              <Flame size={13} /> {streak}-day streak
            </span>
          )}
        </div>
      </div>

      {/* ── hero: where am I ── */}
      {!state.hasData ? (
        <div className="card overflow-hidden">
          <div className="accent-soft-bg px-6 pb-6 pt-6">
            <h2 className="font-display text-2xl font-semibold">Let's find your place in your cycle.</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
              Log a period to unlock your cycle day, estimates and Body Weather.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button onClick={onCheckIn} className="btn-accent flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-extrabold">
                <Plus size={17} /> Log your first day
              </button>
              <button onClick={() => onGo('calendar')} className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
                <CalendarDays size={17} /> Open calendar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:gap-7">
            <ProgressRing value={state.cycleDay ?? 1} max={state.avgCycle}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Day</div>
              <div className="font-display text-[42px] font-semibold leading-none">{state.cycleDay}</div>
              <div className="mt-1 text-[11px] font-bold text-slate-400">of ~{state.avgCycle}</div>
            </ProgressRing>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="accent-soft-bg accent-text inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-extrabold">
                  {phase!.emoji} {phase!.label}
                </span>
                <ConfidencePill level={state.confidence} />
              </div>
              <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">{phase!.tagline} {state.avgCycleBasedOn > 0 ? `Based on your last ${state.avgCycleBasedOn} cycle${state.avgCycleBasedOn === 1 ? '' : 's'}.` : 'Using your assumed length until history builds.'}</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next period (est.)</div>
                  <div className="mt-0.5 text-[15px] font-extrabold">
                    {state.daysUntilPeriod != null && state.daysUntilPeriod >= 0
                      ? state.daysUntilPeriod === 0 ? 'Today' : `in ${state.daysUntilPeriod}d`
                      : `${state.lateBy}d late?`}
                  </div>
                  <div className="text-xs font-medium text-slate-400">
                    {state.nextWindow ? `${fmtShort(state.nextWindow.from)} – ${fmtShort(state.nextWindow.to)}` : '—'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fertile window (est.)</div>
                  <div className="mt-0.5 text-[15px] font-extrabold">
                    {state.fertileWindow ? `${fmtShort(state.fertileWindow.from)} – ${fmtShort(state.fertileWindow.to)}` : '—'}
                  </div>
                  <div className="text-xs font-medium text-slate-400">Ovulation ≈ {state.ovulationEstimate ? fmtShort(state.ovulationEstimate) : '—'}</div>
                </div>
              </div>
            </div>
          </div>
          {!checkedToday && (
            <button onClick={onCheckIn} className="btn-accent mx-6 mb-6 flex min-h-[52px] w-[calc(100%-3rem)] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold">
              <Plus size={17} /> Today's 15-second check-in
            </button>
          )}
        </div>
      )}

      {/* ── Body Weather ── */}
      <section aria-label="Body Weather">
        <SectionTitle
          title="🌦️ Your Body Weather"
          sub={weather.coverage > 0 ? `From your last ${weather.coverage} logged day${weather.coverage === 1 ? '' : 's'} — not a guess` : 'Log to generate your first reading'}
        />
        <div className="card overflow-hidden">
          <div className="accent-soft-bg px-5 pb-4 pt-5">
            <h3 className="font-display text-xl font-semibold leading-snug">{weather.headline}</h3>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{weather.subline}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
            {weather.items.map((w) => (
              <div key={w.id} className={`rounded-2xl border p-3.5 ${w.hasData ? 'border-slate-100 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.03]' : 'border-dashed border-slate-200 dark:border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xl" aria-hidden>{w.hasData ? w.emoji : '◌'}</span>
                  {w.hasData && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${w.id === 'pain' ? (w.score > 40 ? 'bg-red-500/10 text-red-500' : w.score > 15 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600') : w.score >= 65 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : w.score >= 40 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-slate-500/10 text-slate-500'}`}>
                      {w.level}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[13px] font-extrabold">{w.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{w.blurb}</div>
                {w.hasData && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10" aria-hidden>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, w.score)}%`, background: w.id === 'pain' ? (w.score > 40 ? '#ef4444' : '#f59e0b') : 'var(--accent)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gentle forecast ── */}
      {state.hasData && (
        <section aria-label="14-day outlook">
          <SectionTitle title="🔭 Gentle forecast" sub="Estimates with honest confidence — never false certainty" action={<ConfidencePill level={state.confidence} />} />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {forecast.map((f) => (
              <div
                key={f.date}
                className={`flex w-[86px] shrink-0 flex-col items-center rounded-2xl border px-2 py-3 text-center ${
                  f.kinds.includes('period')
                    ? 'border-transparent text-white'
                    : 'card !rounded-2xl'
                }`}
                style={f.kinds.includes('period') ? { background: 'var(--accent)' } : undefined}
                title={`${f.label}: ${f.note}`}
              >
                <div className={`text-[11px] font-bold ${f.kinds.includes('period') ? 'text-white/80' : 'text-slate-400'}`}>{f.label}</div>
                <div className="mt-1 font-display text-lg font-semibold">{new Date(f.date + 'T12:00').getDate()}</div>
                <div className="mt-1 flex h-5 items-center gap-0.5 text-[11px]" aria-hidden>
                  {f.kinds.includes('period') && <Droplets size={12} />}
                  {f.kinds.includes('ovulation') && <Sparkles size={12} />}
                  {f.kinds.includes('fertile') && !f.kinds.includes('ovulation') && <span className="text-[10px]">✦</span>}
                  {f.symptomEmojis.map((e) => <span key={e}>{e}</span>)}
                  {f.kinds.length === 0 && <span className="text-slate-300 dark:text-slate-600">·</span>}
                </div>
                <div className={`mt-0.5 text-[9px] font-bold leading-tight ${f.kinds.includes('period') ? 'text-white/85' : 'text-slate-400'}`}>{f.note}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Insights ── */}
      <section aria-label="Insights">
        <SectionTitle title="💡 Insight cards" sub="Generated from your actual logs" action={<button onClick={() => onGo('insights')} className="accent-text text-[13px] font-extrabold">Pattern Lab →</button>} />
        {insights.length === 0 ? (
          <div className="card px-5 py-6 text-center text-sm text-slate-500">Nothing to surface right now — keep logging and check back soon.</div>
        ) : (
          <div className="space-y-2.5">
            {insights.map((ins) => (
              <div key={ins.id} className="card flex gap-3 p-4">
                <span className="text-2xl" aria-hidden>{ins.emoji}</span>
                <div>
                  <div className="text-[14px] font-extrabold">{ins.title}</div>
                  <div className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{ins.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Symptom outlook + quick links ── */}
      <div className="grid gap-5 md:grid-cols-2">
        <section aria-label="Symptom outlook">
          <SectionTitle title="🗓️ Often-logged outlook" sub="Symptoms that cluster at certain cycle days in your history" />
          {symptomOutlook.length === 0 ? (
            <div className="card px-5 py-6 text-sm leading-relaxed text-slate-500">
              No repeating timing yet. After a few weeks of logging, Mira will gently flag windows like <em>"headaches often appear around day 24–27"</em>.
            </div>
          ) : (
            <div className="space-y-2.5">
              {symptomOutlook.map((s) => (
                <div key={s.symptomId} className="card flex items-center gap-3 p-4">
                  <span className="text-2xl" aria-hidden>{s.emoji}</span>
                  <div className="text-[13px] leading-snug">
                    <strong>{s.label}</strong> {s.frequency} appears around <strong>day {s.fromDay}–{s.toDay}</strong> in your logs.
                    <span className="text-slate-400"> A heads-up, not a diagnosis.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Explore">
          <SectionTitle title="🧭 Go deeper" sub="Your history, made useful" />
          <div className="grid gap-2.5">
            {[
              { icon: <Waves size={18} />, title: 'Cycle Timeline', body: 'Period → recovery → mid-cycle → ovulation → late, with your logs on it.', go: 'timeline' as ViewKey },
              { icon: <TrendingUp size={18} />, title: 'What changed?', body: 'This cycle vs last cycle vs your average, side by side.', go: 'insights' as ViewKey },
              { icon: <CalendarDays size={18} />, title: 'Calendar', body: 'Periods, fertile windows and notes in one beautiful month view.', go: 'calendar' as ViewKey },
            ].map((c) => (
              <button key={c.title} onClick={() => onGo(c.go)} className="card flex items-center gap-3.5 p-4 text-left transition hover:shadow-soft">
                <span className="accent-soft-bg accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">{c.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold">{c.title}</span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{c.body}</span>
                </span>
                <ArrowRight size={17} className="shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <Disclaimer />
    </div>
  );
}


