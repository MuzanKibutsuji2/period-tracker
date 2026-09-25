// ─── Mira · Insights hub ────────────────────────────────────────────────────
// Pattern Lab · What changed? · Trends. All computed locally from real logs.

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FlaskConical, GitCompareArrows, LineChart as LineChartIcon, Minus } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ACCENTS, PHYSICAL_SYMPTOMS, trackerLabel } from '../types';
import { useStore } from '../lib/store';
import {
  addDaysISO, cycleLengths, fmtShort, getCycleState, mean, summarizeCycles, todayISO,
} from '../lib/cycle';
import { detectPatterns } from '../lib/analytics';
import { ConfidencePill, EmptyState, Notice, SectionTitle, Segmented } from './ui';

type Tab = 'lab' | 'compare' | 'trends';

export default function InsightsView(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('lab');
  return (
    <div className="space-y-5 pb-28 md:pb-10">
      <div>
        <h1 className="font-display text-[26px] font-semibold">Insights</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">Your history, translated — carefully, never clinically.</p>
      </div>
      <Segmented<Tab>
        label="Insights sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'lab', label: '🧪 Lab' },
          { id: 'compare', label: '⚖️ Compare' },
          { id: 'trends', label: '📊 Trends' },
        ]}
      />
      {tab === 'lab' && <PatternLab />}
      {tab === 'compare' && <WhatChanged />}
      {tab === 'trends' && <Trends />}
    </div>
  );
}

// ─── Pattern Lab ────────────────────────────────────────────────────────────

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'cycles', label: 'Cycles' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'mood', label: 'Mood' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'energy', label: 'Energy' },
  { id: 'habits', label: 'Habits' },
] as const;

function PatternLab(): React.JSX.Element {
  const { data } = useStore();
  const [cat, setCat] = useState<string>('all');
  const today = todayISO();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
  const patterns = useMemo(
    () => detectPatterns({ periods: data.periods, logs: data.logs, assumedCycle: state.avgCycle, assumedPeriod: state.avgPeriod }),
    [data.periods, data.logs, state.avgCycle, state.avgPeriod]
  );
  const shown = cat === 'all' ? patterns : patterns.filter((p) => p.category === cat);

  return (
    <div className="space-y-4">
      <div className="card flex gap-3 p-4">
        <span className="accent-soft-bg accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><FlaskConical size={20} /></span>
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>Pattern Lab</strong> reads only the logs on this device. It describes co-occurrence — never causes,
          never diagnoses. <span className="text-slate-400">A pattern here means "you logged X alongside Y", nothing more.</span>
        </p>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter patterns">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={`h-10 shrink-0 rounded-2xl px-4 text-[13px] font-bold transition ${
              cat === c.id ? 'btn-accent' : 'bg-white text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="🔬"
          title="No patterns yet"
          body="Track a few more days — and ideally one full period — and Mira will start surfacing rhythms from your own history. Quality beats quantity."
        />
      ) : (
        <div className="space-y-2.5">
          {shown.map((p) => (
            <article key={p.id} className="card anim-fade-up p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>{p.emoji}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                  p.strength === 'strong' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : p.strength === 'moderate' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-500/10 text-slate-500'
                }`}>
                  {p.strength === 'strong' ? '★ repeated' : p.strength === 'moderate' ? '◆ emerging' : '◇ early hint'}
                </span>
              </div>
              <h3 className="mt-2 text-[15px] font-extrabold leading-snug">{p.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{p.detail}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── What changed? ──────────────────────────────────────────────────────────

function Delta({ value, suffix = '', invert }: { value: number | null; suffix?: string; invert?: boolean }): React.JSX.Element {
  if (value == null || Number.isNaN(value)) return <span className="text-slate-300">—</span>;
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  const tone = value === 0
    ? 'bg-slate-500/10 text-slate-500'
    : invert
      ? value < 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
      : 'accent-soft-bg accent-text';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-extrabold ${tone}`}>
      <Icon size={11} /> {sign}{value}{suffix}
    </span>
  );
}

function WhatChanged(): React.JSX.Element {
  const { data } = useStore();
  const [mode, setMode] = useState<'previous' | 'average'>('previous');
  const today = todayISO();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
  const summaries = useMemo(
    () => summarizeCycles(data.periods, data.logs, state.avgCycle, today),
    [data.periods, data.logs, state.avgCycle, today]
  );
  const accent = ACCENTS[data.settings.accent].hex;

  const current = summaries.find((s) => s.isCurrent);
  const previous = summaries.length >= 2 ? summaries[summaries.length - 2] : null;
  const pastClosed = summaries.filter((s) => s.length != null && s !== current);
  const avgLen = pastClosed.length ? mean(pastClosed.map((s) => s.length!)) : null;
  const avgPeriod = pastClosed.length ? mean(pastClosed.map((s) => s.periodDays)) : null;

  if (!current || (mode === 'previous' && !previous) || (mode === 'average' && pastClosed.length === 0)) {
    return (
      <EmptyState
        emoji="⚖️"
        title="Nothing to compare yet"
        body={summaries.length < 2
          ? 'What changed? needs at least two cycles. Log another period and this comparison unlocks automatically.'
          : 'Not enough closed cycles for this comparison yet.'}
      />
    );
  }

  const cur = current!;
  const baseLen = mode === 'previous' ? previous!.length : avgLen;
  const basePeriod = mode === 'previous' ? previous!.periodDays : avgPeriod;
  // current cycle is ongoing → compare "days so far"
  const curLenSoFar = (cur.length ?? (cur.end && cur.start ? Math.max(1, Math.round((new Date(cur.end).getTime() - new Date(cur.start).getTime()) / 86400000) + 1) : 0));

  const symptomRows = PHYSICAL_SYMPTOMS.slice(0, 6).map((s) => {
    const c = cur.symptomCounts[s.id] ?? 0;
    const b = mode === 'previous'
      ? (previous!.symptomCounts[s.id] ?? 0)
      : (pastClosed.length ? mean(pastClosed.map((p) => p.symptomCounts[s.id] ?? 0)) ?? 0 : 0);
    return { id: s.id, label: s.label, emoji: s.emoji, cur: c, base: Math.round(b * 10) / 10, delta: Math.round((c - b) * 10) / 10 };
  }).filter((r) => r.cur > 0 || r.base > 0);

  const lowEnergyBase = mode === 'previous' ? previous!.lowEnergyDays : mean(pastClosed.map((p) => p.lowEnergyDays)) ?? 0;
  const sleepBase = mode === 'previous' ? previous!.avgSleepHours : (pastClosed.length ? mean(pastClosed.map((p) => p.avgSleepHours ?? NaN).filter((n) => !Number.isNaN(n))) : null);

  const chartData = symptomRows.slice(0, 5).map((r) => ({ name: r.emoji, Current: r.cur, Base: r.base }));

  return (
    <div className="space-y-4">
      <Segmented<'previous' | 'average'>
        label="Comparison baseline"
        value={mode}
        onChange={setMode}
        options={[
          { id: 'previous', label: 'vs previous cycle' },
          { id: 'average', label: 'vs your average' },
        ]}
      />
      <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500">
        <GitCompareArrows size={15} />
        Current cycle ({fmtShort(cur.start)} – now) compared with {mode === 'previous' ? `cycle ${previous!.index} (${fmtShort(previous!.start)})` : `your average of ${pastClosed.length} past cycles`}
      </div>

      {cur.length == null && (
        <Notice tone="info">Your current cycle is still in progress, so length is compared as “days so far”. Take it lightly.</Notice>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'Cycle length', cur: `${curLenSoFar}d so far`, delta: baseLen != null ? Math.round(curLenSoFar - baseLen) : null, suffix: 'd' },
          { label: 'Period duration', cur: `${cur.periodDays}d`, delta: basePeriod != null ? Math.round(cur.periodDays - basePeriod) : null, suffix: 'd' },
          { label: 'Days logged', cur: `${cur.loggedDays}`, delta: Math.round(cur.loggedDays - (mode === 'previous' ? previous!.loggedDays : mean(pastClosed.map((p) => p.loggedDays)) ?? 0)) },
          { label: 'Low-energy days', cur: `${cur.lowEnergyDays}`, delta: Math.round((cur.lowEnergyDays - lowEnergyBase) * 10) / 10, invert: true },
        ].map((r) => (
          <div key={r.label} className="card p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{r.label}</div>
            <div className="mt-1 font-display text-[22px] font-semibold">{r.cur}</div>
            <div className="mt-1.5"><Delta value={r.delta} suffix={r.suffix ?? ''} invert={r.invert} /></div>
          </div>
        ))}
      </div>

      <div>
        <SectionTitle title="Symptom frequency" sub={`Days logged · current vs ${mode}`} />
        {chartData.length === 0 ? (
          <div className="card p-5 text-sm text-slate-500">No symptoms logged in either cycle. Lucky — or quiet logging.</div>
        ) : (
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={16} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(100,100,150,.08)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12 }} />
                <Bar dataKey="Current" fill={accent} radius={[6, 6, 2, 2]} />
                <Bar dataKey="Base" fill="#cbd5e1" radius={[6, 6, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] font-bold text-slate-400">
              {symptomRows.slice(0, 5).map((r) => <span key={r.id}>{r.emoji} {r.label}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="card divide-y divide-slate-100 p-1 dark:divide-white/5">
        {symptomRows.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-[14px] font-bold">{r.emoji} {r.label} <span className="font-medium text-slate-400">· {r.cur} vs {r.base}</span></span>
            <Delta value={r.delta} suffix="d" invert />
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[14px] font-bold">😴 Avg sleep <span className="font-medium text-slate-400">· {cur.avgSleepHours ?? '—'}h vs {sleepBase != null ? `${sleepBase.toFixed(1)}h` : '—'}</span></span>
          <Delta value={cur.avgSleepHours != null && sleepBase != null ? Math.round((cur.avgSleepHours - sleepBase) * 10) / 10 : null} suffix="h" />
        </div>
      </div>
      <p className="text-[12px] text-slate-400">Differences are observations from your logs, not verdicts. Small swings are completely normal.</p>
    </div>
  );
}

// ─── Trends ─────────────────────────────────────────────────────────────────

function Trends(): React.JSX.Element {
  const { data } = useStore();
  const today = todayISO();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
  const accent = ACCENTS[data.settings.accent].hex;
  const summaries = summarizeCycles(data.periods, data.logs, state.avgCycle, today);

  const cycleChart = summaries.filter((s) => s.length != null).slice(-8).map((s) => ({ name: `#${s.index}`, days: s.length }));
  const periodChart = summaries.slice(-8).map((s) => ({ name: `#${s.index}`, days: s.periodDays }));

  const symTotals: Record<string, number> = {};
  for (const s of summaries) for (const [k, v] of Object.entries(s.symptomCounts)) symTotals[k] = (symTotals[k] ?? 0) + v;
  const symChart = Object.entries(symTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, count]) => ({
    name: trackerLabel(id).split(' ')[0],
    full: trackerLabel(id),
    count,
  }));

  const sleepSeries: { name: string; hours: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const iso = addDaysISO(today, -i);
    const h = data.logs[iso]?.sleepHours;
    if (h != null) sleepSeries.push({ name: fmtShort(iso), hours: h });
  }

  const hasAny = cycleChart.length > 0 || symChart.length > 0 || sleepSeries.length > 0;
  if (!hasAny) {
    return (
      <EmptyState
        emoji="📊"
        title="Charts need a little history"
        body="Log a period and a week of check-ins and your trends — cycle length, symptoms, sleep — will bloom here."
      />
    );
  }

  const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12 };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <LineChartIcon size={15} className="text-slate-400" />
        <span className="text-[13px] font-bold text-slate-500">Plain-language charts. <ConfidencePill level={state.confidence} /></span>
      </div>

      {cycleChart.length > 0 && (
        <div>
          <SectionTitle title="Cycle length" sub={`Last ${cycleChart.length} cycles · avg ${state.avgCycle} days`} />
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={cycleChart} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(100,100,150,.08)' }} contentStyle={tooltipStyle} />
                <ReferenceLine y={state.avgCycle} stroke={accent} strokeDasharray="4 4" label={{ value: 'avg', fontSize: 10, fill: accent }} />
                <Bar dataKey="days" radius={[7, 7, 2, 2]}>
                  {cycleChart.map((_, i) => <Cell key={i} fill={accent} opacity={0.55 + (i / cycleChart.length) * 0.45} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {periodChart.length > 0 && (
        <div>
          <SectionTitle title="Period duration" sub="Bleeding days per cycle" />
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={periodChart} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(100,100,150,.08)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="days" fill="#f0abfc" radius={[7, 7, 2, 2]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {symChart.length > 0 && (
        <div>
          <SectionTitle title="Most-logged symptoms" sub="Days logged, all time" />
          <div className="card space-y-2.5 p-5">
            {symChart.map((s) => (
              <div key={s.full}>
                <div className="flex justify-between text-[13px] font-bold"><span>{s.full}</span><span className="text-slate-400">{s.count}d</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(s.count / symChart[0].count) * 100}%`, background: accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sleepSeries.length >= 3 && (
        <div>
          <SectionTitle title="Sleep hours" sub={`Last ${sleepSeries.length} logged nights`} />
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={sleepSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 12]} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={8} stroke="#34d399" strokeDasharray="4 4" label={{ value: '8h', fontSize: 10, fill: '#34d399' }} />
                <Line type="monotone" dataKey="hours" stroke={accent} strokeWidth={2.5} dot={{ r: 3, fill: accent }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}


