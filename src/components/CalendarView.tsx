// ─── Mira · Calendar + day editor ────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Eraser, StickyNote, Trash2 } from 'lucide-react';
import { FLOW_OPTIONS, MOODS, PHYSICAL_SYMPTOMS, trackerLabel, type FlowLevel } from '../types';
import { useStore } from '../lib/store';
import {
  addDaysISO, findPeriodContaining, fmtLongYear, fmtShort, getCycleState, getDayStatus,
  isValidISO, monthLabel, parseISO, PHASE_META, todayISO, validatePeriodInput,
} from '../lib/cycle';
import { Confirm, Notice, SectionTitle, Sheet } from './ui';

function monthGrid(year: number, month0: number, weekStart: 0 | 1): string[] {
  const first = new Date(year, month0, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: string[] = [];
  for (let i = offset - 1; i >= 0; i--) {
    const d = new Date(year, month0, -i);
    cells.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(addDaysISO(last, 1));
  }
  return cells;
}

export default function CalendarView({ focusDate, onConsumeFocus }: { focusDate: string | null; onConsumeFocus: () => void }): React.JSX.Element {
  const { data, actions } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const today = todayISO();
  const state = useMemo(
    () => getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today),
    [data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today]
  );

  // open a day pushed from elsewhere (timeline "edit", etc.)
  React.useEffect(() => {
    if (focusDate && isValidISO(focusDate)) {
      const d = parseISO(focusDate);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setSelected(focusDate);
      onConsumeFocus();
    }
  }, [focusDate, onConsumeFocus]);

  const weekStart = data.settings.firstDayOfWeek;
  const cells = useMemo(() => monthGrid(year, month, weekStart), [year, month, weekStart]);
  const weekdayNames = weekStart === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const move = (dir: 1 | -1): void => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const containing = selected ? findPeriodContaining(data.periods, selected) : undefined;

  const quickStart = (): void => {
    if (!selected) return;
    if (selected > today) return;
    if (containing) return;
    const v = validatePeriodInput(selected, selected, today);
    if (!v.ok) return;
    actions.addPeriod(selected, selected);
    actions.upsertLog(selected, { flow: 'medium' });
  };
  const quickEnd = (): void => {
    if (!selected || !containing) return;
    actions.updatePeriod(containing.id, containing.start, selected < containing.start ? containing.start : selected);
  };

  return (
    <div className="space-y-5 pb-28 md:pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold">Calendar</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Tap any day to view or edit it.</p>
        </div>
        <div className="flex gap-2">
          <button aria-label="Previous month" onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-white/5"><ChevronLeft size={18} /></button>
          <button aria-label="Next month" onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-white/5"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{monthLabel(year, month)}</h2>
          <button
            onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); }}
            className="accent-soft-bg accent-text rounded-xl px-3.5 py-2 text-[13px] font-extrabold"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1" role="row">
          {weekdayNames.map((w, i) => (
            <div key={i} className="py-1 text-center text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${monthLabel(year, month)} calendar`}>
          {cells.map((iso) => {
            const inMonth = parseISO(iso).getMonth() === month;
            const st = getDayStatus(iso, data.periods, state);
            const log = data.logs[iso];
            const isToday = iso === today;
            const isSel = iso === selected;
            const symptomDots = (log?.symptoms ?? []).slice(0, 3);
            return (
              <button
                key={iso}
                role="gridcell"
                aria-label={`${fmtLongYear(iso)}${st.inPeriod ? ', period day' : ''}${st.predictedPeriod ? ', predicted period' : ''}${st.fertile ? ', estimated fertile' : ''}${log?.notes ? ', has note' : ''}`}
                aria-pressed={isSel}
                onClick={() => setSelected(iso)}
                className={`relative flex min-h-[52px] flex-col items-center justify-start rounded-2xl pt-1.5 text-[13px] font-bold transition sm:min-h-[64px] ${
                  !inMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'
                } ${isSel ? 'ring-2' : ''} ${st.inPeriod ? 'accent-soft-bg' : ''}`}
                style={isSel ? ({ ['--tw-ring-color' as string]: 'var(--accent)' }) : undefined}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isToday ? 'btn-accent !rounded-full' : st.inPeriod ? 'accent-text' : ''
                  } ${st.predictedPeriod ? 'border border-dashed border-current opacity-70' : ''}`}
                  style={st.ovulation && !isToday ? { boxShadow: '0 0 0 2px rgba(245,158,11,.55)' } : undefined}
                >
                  {parseISO(iso).getDate()}
                </span>
                <span className="mt-0.5 flex h-2 items-center gap-[3px]" aria-hidden>
                  {st.fertile && !st.inPeriod && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  {symptomDots.map((s) => (
                    <span key={s} className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                  ))}
                  {log?.notes && <StickyNote size={9} className="text-slate-400" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500 dark:border-white/5 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="accent-soft-bg inline-block h-3 w-3 rounded-full" /> Period</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border border-dashed border-slate-400" /> Predicted</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Fertile (est.)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ boxShadow: '0 0 0 2px rgba(245,158,11,.55)' }} /> Ovulation (est.)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} /> Symptoms</span>
        </div>
      </div>

      {/* quick period actions for selected day */}
      {selected && (
        <div className="card anim-fade-up p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[15px] font-extrabold">{fmtLongYear(selected)}</div>
              <SelectedLine iso={selected} />
            </div>
            <div className="flex gap-2">
              {!containing && selected <= today && (
                <button onClick={quickStart} className="btn-accent flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[13px] font-extrabold">
                  <CalendarPlus size={15} /> Period started
                </button>
              )}
              {containing && (
                <button onClick={quickEnd} className="accent-soft-bg accent-text flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[13px] font-extrabold">
                  Period ended {fmtShort(selected) === fmtShort(today) ? 'today' : 'here'}
                </button>
              )}
            </div>
          </div>
          {selected > today && <div className="mt-2"><Notice tone="warn">Future dates can't be marked as period days — predictions already cover them.</Notice></div>}
        </div>
      )}

      <DaySheet
        iso={selected}
        onClose={() => setSelected(null)}
        onClearRequest={() => setConfirmClear(true)}
      />
      <Confirm
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          if (selected) {
            // remove log but keep period entries intact
            actions.upsertLog(selected, { flow: 'none', symptoms: [], moods: [], energy: undefined, sleep: undefined, sleepHours: undefined, water: undefined, exerciseMin: undefined, stress: undefined, appetite: undefined, notes: undefined });
          }
          setConfirmClear(false);
        }}
        title="Clear this day?"
        body="This removes symptoms, moods and notes for the selected day. Period entries are kept."
        confirmLabel="Clear day"
      />
    </div>
  );
}

function SelectedLine({ iso }: { iso: string }): React.JSX.Element {
  const { data } = useStore();
  const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, todayISO());
  const st = getDayStatus(iso, data.periods, state);
  const log = data.logs[iso];
  const bits: string[] = [];
  if (st.inPeriod) bits.push('🩸 Period day');
  if (st.predictedPeriod) bits.push('Predicted period');
  if (st.ovulation) bits.push('✨ Ovulation estimate');
  else if (st.fertile) bits.push('✦ Fertile window (est.)');
  if (st.cycleDay) bits.push(`Cycle day ${st.cycleDay}${st.phase ? ` · ${PHASE_META[st.phase].label}` : ''}`);
  if (log && (log.symptoms.length || log.moods.length)) bits.push(`${log.symptoms.length + log.moods.length} tracked`);
  if (!bits.length) return <div className="text-[13px] text-slate-400">Nothing logged yet.</div>;
  return <div className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">{bits.join('  ·  ')}</div>;
}

// ─── Day editor sheet ───────────────────────────────────────────────────────

function DaySheet({ iso, onClose, onClearRequest }: { iso: string | null; onClose: () => void; onClearRequest: () => void }): React.JSX.Element {
  const { data, actions } = useStore();
  const log = iso ? data.logs[iso] : undefined;
  const [flow, setFlow] = useState<FlowLevel>('none');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [energy, setEnergy] = useState<string>('');
  const [sleep, setSleep] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(false);

  React.useEffect(() => {
    if (iso) {
      const inside = findPeriodContaining(data.periods, iso);
      setFlow(log?.flow ?? (inside ? 'medium' : 'none'));
      setSymptoms(log?.symptoms ?? []);
      setMoods(log?.moods ?? []);
      setEnergy(log?.energy ?? '');
      setSleep(log?.sleep ?? '');
      setNotes(log?.notes ?? '');
    }
  }, [iso]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!iso) return <></>;
  const toggle = (list: string[], id: string, set: (v: string[]) => void): void => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };
  const save = (): void => {
    actions.upsertLog(iso, {
      flow,
      symptoms,
      moods,
      energy: (energy || undefined) as never,
      sleep: (sleep || undefined) as never,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    onClose();
  };
  const containing = findPeriodContaining(data.periods, iso);

  return (
    <>
      <Sheet open={!!iso} onClose={onClose} title={fmtLongYear(iso)} subtitle="Everything saves on this device only." wide>
        <div className="space-y-5">
          <SelectedLine iso={iso} />
          <div>
            <div className="mb-2 text-[13px] font-extrabold text-slate-500">Flow</div>
            <div className="flex flex-wrap gap-2">
              {FLOW_OPTIONS.map((f) => (
                <button key={f.id} className="chip !text-[13px]" aria-pressed={flow === f.id} onClick={() => setFlow(f.id)}>{f.label}</button>
              ))}
            </div>
            {flow !== 'none' && flow !== 'spotting' && <p className="mt-1.5 text-xs text-slate-400">Bleeding days automatically join your period history.</p>}
          </div>
          {data.settings.showPhysical && (
            <div>
              <div className="mb-2 text-[13px] font-extrabold text-slate-500">Symptoms</div>
              <div className="flex flex-wrap gap-2">
                {PHYSICAL_SYMPTOMS.map((s) => (
                  <button key={s.id} className="chip !text-[13px]" aria-pressed={symptoms.includes(s.id)} onClick={() => toggle(symptoms, s.id, setSymptoms)}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {data.settings.showMood && (
            <div>
              <div className="mb-2 text-[13px] font-extrabold text-slate-500">Mood</div>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button key={m.id} className="chip !text-[13px]" aria-pressed={moods.includes(m.id)} onClick={() => toggle(moods, m.id, setMoods)}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-[13px] font-extrabold text-slate-500">Energy</div>
              <div className="flex gap-1.5">
                {['low', 'normal', 'high'].map((e) => (
                  <button key={e} className="chip flex-1 !px-2 !text-[12px]" aria-pressed={energy === e} onClick={() => setEnergy(energy === e ? '' : e)}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-extrabold text-slate-500">Sleep</div>
              <div className="flex gap-1.5">
                {['poor', 'okay', 'good'].map((s) => (
                  <button key={s} className="chip flex-1 !px-2 !text-[12px]" aria-pressed={sleep === s} onClick={() => setSleep(sleep === s ? '' : s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="day-notes" className="mb-2 block text-[13px] font-extrabold text-slate-500">Private note</label>
            <textarea id="day-notes" className="field min-h-[70px]" placeholder="Felt tired today, had an exam, traveling…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </div>
          {log && (log.symptoms.length > 0 || log.moods.length > 0) && (
            <p className="text-xs text-slate-400">Logged: {[...log.symptoms, ...log.moods].map(trackerLabel).join(', ')}</p>
          )}
          <button onClick={save} className="btn-accent min-h-[52px] w-full rounded-2xl py-3.5 text-sm font-extrabold">Save day</button>
          <div className="flex gap-2">
            <button onClick={onClearRequest} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[13px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <Eraser size={15} /> Clear day
            </button>
            {containing && (
              <button onClick={() => setConfirmDeletePeriod(true)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-red-500/10 text-[13px] font-bold text-red-500">
                <Trash2 size={15} /> Remove period entry
              </button>
            )}
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirmDeletePeriod}
        onCancel={() => setConfirmDeletePeriod(false)}
        onConfirm={() => {
          if (containing) actions.deletePeriod(containing.id);
          setConfirmDeletePeriod(false);
          onClose();
        }}
        title="Remove this period entry?"
        body={`This removes the period ${containing ? `starting ${fmtShort(containing.start)}` : ''} from your history. Daily logs are kept.`}
        confirmLabel="Remove entry"
        danger
      />
    </>
  );
}

export { SectionTitle };
