// ─── Mira · History + Cycle Passport ──────────────────────────────────────────
// Every cycle at a glance, editable — plus a one-tap summary for doctor visits.

import React, { useMemo, useState } from 'react';
import { CalendarClock, Copy, Download, FileText, Pencil, Printer, Trash2 } from 'lucide-react';
import { trackerLabel } from '../types';
import { useStore } from '../lib/store';
import {
  fmtLongYear, fmtShort, getCycleState, summarizeCycles, todayISO, validatePeriodInput,
} from '../lib/cycle';
import { Confirm, EmptyState, Notice, Sheet } from './ui';
import { downloadTextFile } from '../lib/backup';

export default function HistoryView(): React.JSX.Element {
  const { data, actions } = useStore();
  const today = todayISO();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
  const summaries = useMemo(
    () => summarizeCycles(data.periods, data.logs, state.avgCycle, today),
    [data.periods, data.logs, state.avgCycle, today]
  );
  const [editingCycle, setEditingCycle] = useState<number | null>(null); // summary index
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const ordered = [...summaries].reverse();

  return (
    <div className="space-y-5 pb-28 md:pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-semibold">History</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {summaries.length === 0 ? 'Your cycles will live here.' : `${summaries.length} cycle${summaries.length === 1 ? '' : 's'} · avg ${state.avgCycle}d`}
          </p>
        </div>
        {summaries.length > 0 && (
          <button onClick={() => setReportOpen(true)} className="accent-soft-bg accent-text flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[13px] font-extrabold">
            <FileText size={15} /> Cycle Passport
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <EmptyState emoji="📚" title="No cycles yet" body="Your finished cycles will stack up here with lengths, symptoms and sleep — ready to compare or share with a clinician." />
      ) : (
        <div className="space-y-3">
          {ordered.map((s) => {
            const topSymptoms = Object.entries(s.symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const topMoods = Object.entries(s.moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
            const period = data.periods.find((p) => p.start === s.start);
            return (
              <article key={s.index} className="card anim-fade-up p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[16px] font-extrabold">Cycle {s.index}</h2>
                      {s.isCurrent && <span className="accent-bg rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">current</span>}
                    </div>
                    <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {fmtShort(s.start)} → {s.length != null ? fmtShort(s.end) : 'today'} · {s.length != null ? `${s.length} days` : 'in progress'}
                    </p>
                  </div>
                  {period && (
                    <div className="flex gap-1.5">
                      <button aria-label={`Edit cycle ${s.index} period`} onClick={() => setEditingCycle(s.index)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"><Pencil size={15} /></button>
                      <button aria-label={`Delete cycle ${s.index} period`} onClick={() => setDeletingId(period.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-2 py-2.5 dark:bg-white/5">
                    <div className="font-display text-lg font-semibold">{s.periodDays}d</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">period</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-2 py-2.5 dark:bg-white/5">
                    <div className="font-display text-lg font-semibold">{s.loggedDays}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">logged</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-2 py-2.5 dark:bg-white/5">
                    <div className="font-display text-lg font-semibold">{s.avgSleepHours ?? '—'}{s.avgSleepHours ? 'h' : ''}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">avg sleep</div>
                  </div>
                </div>

                {(topSymptoms.length > 0 || topMoods.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topSymptoms.map(([id, n]) => (
                      <span key={id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{trackerLabel(id)} ×{n}</span>
                    ))}
                    {topMoods.map(([id, n]) => (
                      <span key={id} className="accent-soft-bg accent-text rounded-full px-2.5 py-1 text-[11px] font-bold">{trackerLabel(id)} ×{n}</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <EditPeriodSheet summaryIndex={editingCycle} onClose={() => setEditingCycle(null)} />
      <Confirm
        open={deletingId != null}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) actions.deletePeriod(deletingId); setDeletingId(null); }}
        title="Delete this period entry?"
        body="The period will be removed from your history and cycle lengths will be recalculated. Daily logs (symptoms, moods, notes) are kept."
        confirmLabel="Delete entry"
        danger
      />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

// ─── edit period ────────────────────────────────────────────────────────────

function EditPeriodSheet({ summaryIndex, onClose }: { summaryIndex: number | null; onClose: () => void }): React.JSX.Element {
  const { data, actions } = useStore();
  const today = todayISO();
  const summary = summaryIndex != null ? summarizeCycles(data.periods, data.logs, 28, today).find((s) => s.index === summaryIndex) : undefined;
  const period = summary ? data.periods.find((p) => p.start === summary.start) : undefined;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  React.useEffect(() => {
    if (period) {
      setStart(period.start);
      setEnd(period.end ?? '');
      setErrors([]);
    }
  }, [period?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (summaryIndex == null || !period) return <Sheet open={false} onClose={onClose} title=""><></></Sheet>;

  const save = (): void => {
    const v = validatePeriodInput(start, end || null, today);
    if (!v.ok) { setErrors(v.errors); return; }
    actions.updatePeriod(period.id, start, end || null);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={`Edit cycle ${summaryIndex} period`} subtitle="Fixing a wrong date keeps every estimate honest.">
      <div className="space-y-4">
        {errors.length > 0 && <Notice tone="bad"><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-slate-500">Start date</span>
            <input type="date" className="field" value={start} max={today} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-slate-500">End date</span>
            <input type="date" className="field" value={end} max={today} min={start} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-slate-400">Leave end date empty if bleeding is ongoing.</p>
        <button onClick={save} className="btn-accent min-h-[52px] w-full rounded-2xl py-3.5 text-sm font-extrabold">Save changes</button>
        <button
          onClick={() => { actions.deletePeriod(period.id); onClose(); }}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-red-500/10 text-[13px] font-bold text-red-500"
        >
          <Trash2 size={15} /> Delete this entry
        </button>
      </div>
    </Sheet>
  );
}

// ─── Cycle Passport (doctor-visit summary) ──────────────────────────────────

function buildReport(data: ReturnType<typeof useStore>['data']): string {
  const today = todayISO();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
  const summaries = summarizeCycles(data.periods, data.logs, state.avgCycle, today);
  const recent = summaries.slice(-6);
  const totals: Record<string, number> = {};
  for (const s of summaries) for (const [k, v] of Object.entries(s.symptomCounts)) totals[k] = (totals[k] ?? 0) + v;
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const recentNotes = Object.values(data.logs).filter((l) => l.notes).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const lines = [
    'MIRA · CYCLE PASSPORT',
    `Generated ${fmtLongYear(today)} · prepared on-device from personal logs`,
    '',
    `Cycles logged: ${summaries.length}`,
    `Average cycle length: ~${state.avgCycle} days${state.avgCycleBasedOn ? ` (based on ${state.avgCycleBasedOn})` : ' (assumed — no history yet)'}`,
    `Average period: ~${state.avgPeriod} days`,
    state.nextPeriodStart ? `Next estimated period: ${fmtLongYear(state.nextPeriodStart)} (estimate)` : 'Next estimated period: —',
    '',
    'RECENT CYCLES',
    ...recent.map((s) => `  #${s.index}  ${s.start} → ${s.length ? s.end : 'ongoing'}  ·  ${s.length ? `${s.length}d cycle` : 'in progress'}  ·  ${s.periodDays}d period  ·  ${s.loggedDays} logged days`),
    '',
    'MOST-LOGGED SYMPTOMS (all time)',
    ...(top.length ? top.map(([id, n]) => `  - ${trackerLabel(id)}: ${n} days`) : ['  (none logged)']),
    '',
    'RECENT NOTES',
    ...(recentNotes.length ? recentNotes.map((l) => `  ${l.date}: ${l.notes}`) : ['  (no notes)']),
    '',
    'Please note: this summary comes from self-reported logs in a wellness app.',
    'It is not a medical record or diagnosis. Cycle estimates vary naturally.',
  ];
  return lines.join('\n');
}

function ReportSheet({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const { data } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => (open ? buildReport(data) : ''), [open, data]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — select the text instead
      const el = document.getElementById('passport-text');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Cycle Passport 🛂" subtitle="A clean one-page summary for appointments — generated on-device." wide>
      <div className="space-y-4">
        <div className="card flex gap-3 !rounded-2xl p-3.5">
          <CalendarClock size={18} className="mt-0.5 shrink-0 accent-text" />
          <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            Show or send this at checkups instead of trying to remember dates. It contains only what you logged — share it only with people you trust.
          </p>
        </div>
        <pre id="passport-text" className="nice-scroll max-h-[46dvh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700 dark:bg-black/30 dark:text-slate-200">
          {report}
        </pre>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={copy} className="btn-accent flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-extrabold">
            <Copy size={15} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => downloadTextFile(`mira-passport-${todayISO()}.txt`, report, 'text/plain')} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[13px] font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-200">
            <Download size={15} /> Save
          </button>
          <button onClick={() => window.print()} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[13px] font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-200">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
    </Sheet>
  );
}
