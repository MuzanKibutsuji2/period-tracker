// ─── Mira · Cycle Timeline ──────────────────────────────────────────────────
// One cycle as a journey: Period → Recovery → Mid → Ovulation → Late → Next.

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Pencil } from 'lucide-react';
import { useStore } from '../lib/store';
import {
  addDaysISO, diffDays, fmtLong, fmtShort, getCycleState, getPhase, PHASE_META,
  sortPeriods, summarizeCycles, todayISO,
} from '../lib/cycle';
import { ALL_TRACKERS, type PhaseKey } from '../types';
import { EmptyState } from './ui';

const PHASE_ORDER: PhaseKey[] = ['period', 'recovery', 'mid', 'ovulation', 'late', 'premenstrual'];
const FLOW_EMOJI: Record<string, string> = { spotting: '·', light: '💧', medium: '💧💧', heavy: '🌊' };

const emojiFor = (id: string): string => ALL_TRACKERS.find((t) => t.id === id)?.emoji ?? '•';

export default function Timeline({ onEditDay }: { onEditDay: (iso: string) => void }): React.JSX.Element {
  const { data } = useStore();
  const today = todayISO();
  const state = useMemo(
    () => getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today),
    [data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today]
  );
  const summaries = useMemo(
    () => summarizeCycles(data.periods, data.logs, state.avgCycle, today),
    [data.periods, data.logs, state.avgCycle, today]
  );
  const [idx, setIdx] = useState<number | null>(null); // null = current
  const sorted = useMemo(() => sortPeriods(data.periods).filter((p) => p.start <= today), [data.periods, today]);
  const activeIdx = idx ?? sorted.length - 1;

  if (!sorted.length || !state.currentStart) {
    return (
      <div className="pb-28 md:pb-10">
        <h1 className="font-display text-[26px] font-semibold">Cycle Timeline</h1>
        <p className="mb-4 mt-1 text-[13px] text-slate-500">Your cycle as a journey, not a spreadsheet.</p>
        <EmptyState emoji="🗺️" title="No journey yet" body="Once you log a period, your cycle appears here as a beautiful timeline with symptoms, moods and notes along the way." />
      </div>
    );
  }

  const start = sorted[Math.max(0, Math.min(activeIdx, sorted.length - 1))].start;
  const nextStart = sorted[activeIdx + 1]?.start ?? null;
  const totalDays = nextStart ? diffDays(start, nextStart) : state.avgCycle;
  const isCurrent = activeIdx === sorted.length - 1;

  // group days by phase
  const groups: { phase: PhaseKey; days: { iso: string; day: number }[] }[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const phase = getPhase(d, nextStart ? totalDays : state.avgCycle, state.avgPeriod);
    const iso = addDaysISO(start, d - 1);
    const last = groups[groups.length - 1];
    if (last && last.phase === phase) last.days.push({ iso, day: d });
    else groups.push({ phase, days: [{ iso, day: d }] });
  }
  void PHASE_ORDER;

  return (
    <div className="space-y-5 pb-28 md:pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold">Cycle Timeline</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {fmtShort(start)} → {nextStart ? fmtShort(addDaysISO(nextStart, -1)) : `day ${totalDays} (est.)`} · {isCurrent ? 'current cycle' : `cycle ${activeIdx + 1}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button aria-label="Previous cycle" disabled={activeIdx <= 0} onClick={() => setIdx(activeIdx - 1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm disabled:opacity-40 dark:bg-white/5"><ChevronLeft size={18} /></button>
          <button aria-label="Next cycle" disabled={activeIdx >= sorted.length - 1} onClick={() => setIdx(activeIdx + 1 >= sorted.length - 1 ? null : activeIdx + 1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm disabled:opacity-40 dark:bg-white/5"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* journey strip */}
      <div className="no-scrollbar card flex items-center gap-1 overflow-x-auto p-3" aria-label="Cycle phases">
        {groups.map((g, i) => (
          <React.Fragment key={g.phase}>
            <div className="flex min-w-[86px] flex-1 flex-col items-center rounded-2xl px-2 py-2.5" style={{ background: 'var(--accent-softer)' }}>
              <span className="text-lg" aria-hidden>{PHASE_META[g.phase].emoji}</span>
              <span className="mt-0.5 text-center text-[10px] font-extrabold leading-tight">{PHASE_META[g.phase].label}</span>
              <span className="text-[10px] font-semibold text-slate-400">d{g.days[0].day}{g.days.length > 1 ? `–${g.days[g.days.length - 1].day}` : ''}</span>
            </div>
            {i < groups.length - 1 && <span className="px-0.5 text-slate-300" aria-hidden>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* vertical timeline */}
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.phase} aria-label={PHASE_META[g.phase].label}>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="accent-soft-bg flex h-9 w-9 items-center justify-center rounded-2xl text-lg" aria-hidden>{PHASE_META[g.phase].emoji}</span>
              <div>
                <h2 className="text-[15px] font-extrabold">{PHASE_META[g.phase].label}</h2>
                <p className="text-xs text-slate-400">Days {g.days[0].day}–{g.days[g.days.length - 1].day} · {PHASE_META[g.phase].tagline}</p>
              </div>
            </div>
            <div className="relative ml-[18px] space-y-2 border-l-2 border-dashed border-slate-200 pl-5 dark:border-white/10">
              {g.days.map(({ iso, day }) => {
                const log = data.logs[iso];
                const future = iso > today;
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    onClick={() => !future && onEditDay(iso)}
                    disabled={future}
                    className={`card flex w-full items-center gap-3 !rounded-2xl p-3 text-left ${isToday ? 'ring-2' : ''} ${future ? 'opacity-55' : 'transition hover:shadow-soft'}`}
                    style={isToday ? ({ ['--tw-ring-color' as string]: 'var(--accent)' }) : undefined}
                    aria-label={`${fmtLong(iso)}, day ${day}${log?.notes ? `, note: ${log.notes}` : ''}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5">
                      <span className="font-display text-[16px] font-semibold leading-none">{day}</span>
                      <span className="text-[9px] font-bold text-slate-400">{fmtShort(iso).split(' ')[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px] font-bold">
                        {fmtLong(iso)}
                        {isToday && <span className="accent-bg rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white">today</span>}
                      </div>
                      {future ? (
                        <FutureHint iso={iso} />
                      ) : log ? (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                          {log.flow !== 'none' && (
                            <span className="inline-flex items-center gap-1 font-bold">
                              {log.flow === 'spotting' ? <span aria-hidden>·</span> : <Droplets size={11} />}
                              {log.flow}
                            </span>
                          )}
                          {(log.symptoms.length > 0 || log.moods.length > 0) && (
                            <span aria-hidden>{[...log.symptoms, ...log.moods].slice(0, 6).map(emojiFor).join(' ')}</span>
                          )}
                          {log.energy && <span>· {log.energy} energy</span>}
                          {log.sleep && <span>· {log.sleep} sleep</span>}
                          {log.notes && <span className="block w-full truncate italic">“{log.notes}”</span>}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[12px] text-slate-400">Nothing logged — tap to add.</div>
                      )}
                    </div>
                    {!future && <Pencil size={14} className="shrink-0 text-slate-300" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="text-[12px] text-slate-400">Future days show estimates only. {summaries.length > 1 ? `You're viewing cycle ${activeIdx + 1} of ${summaries.length}.` : ''}</p>
    </div>
  );
}

function FutureHint({ iso }: { iso: string }): React.JSX.Element {
  const { data } = useStore();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, todayISO());
  const bits: string[] = [];
  if (state.nextWindow && iso >= state.nextWindow.from && iso <= state.nextWindow.to) bits.push('🩸 Period possible');
  if (state.ovulationEstimate === iso) bits.push('✨ Ovulation estimate');
  else if (state.fertileWindow && iso >= state.fertileWindow.from && iso <= state.fertileWindow.to) bits.push('✦ Fertile window (est.)');
  if (!bits.length) bits.push('No estimate — just a day.');
  return <div className="mt-0.5 text-[12px] text-slate-400">{bits.join(' · ')}</div>;
}

export { FLOW_EMOJI };
