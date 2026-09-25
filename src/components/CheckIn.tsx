// ─── Mira · Smart Check-in ──────────────────────────────────────────────────
// The whole point: a full daily log in ~15 seconds. Few taps, no typing needed.

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { FLOW_OPTIONS, MOODS, PHYSICAL_SYMPTOMS, type EnergyLevel, type SleepQuality, type StressLevel } from '../types';
import { useStore } from '../lib/store';
import { fmtLong, todayISO } from '../lib/cycle';
import { Sheet } from './ui';

function ChipRow<T extends string>({
  label,
  options,
  value,
  onPick,
  multi,
}: {
  label: string;
  options: { id: T; label: string; emoji?: string }[];
  value: T | T[];
  onPick: (id: T) => void;
  multi?: boolean;
}): React.JSX.Element {
  const active = (id: T): boolean => (multi ? (value as T[]).includes(id) : value === id);
  return (
    <div>
      <div className="mb-2 text-[13px] font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} className="chip !min-h-[44px] !text-[13px]" aria-pressed={active(o.id)} onClick={() => onPick(o.id)}>
            {o.emoji && <span aria-hidden>{o.emoji}</span>} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CheckIn({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date?: string;
}): React.JSX.Element {
  const { data, actions } = useStore();
  const day = date ?? todayISO();
  const existing = data.logs[day];
  const hidden = useMemo(() => new Set(data.settings.hiddenTrackers), [data.settings.hiddenTrackers]);

  const [flow, setFlow] = useState(existing?.flow ?? 'none');
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(existing?.energy);
  const [moods, setMoods] = useState<string[]>(existing?.moods ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [sleep, setSleep] = useState<SleepQuality | undefined>(existing?.sleep);
  const [water, setWater] = useState<number | undefined>(existing?.water);
  const [stress, setStress] = useState<StressLevel | undefined>(existing?.stress);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (list: string[], id: string, set: (v: string[]) => void): void => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const save = (): void => {
    actions.upsertLog(day, {
      flow,
      energy,
      moods,
      symptoms,
      sleep,
      water,
      stress,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    setSaved(true);
    setTimeout(onClose, 650);
  };

  const visibleMoods = MOODS.filter((m) => !hidden.has(m.id));
  const visibleSymptoms = PHYSICAL_SYMPTOMS.filter((s) => !hidden.has(s.id));

  return (
    <Sheet open={open} onClose={onClose} title="How are you today?" subtitle={`${fmtLong(day)} · takes ~15 seconds`} wide>
      {saved ? (
        <div className="anim-fade-up flex flex-col items-center py-10 text-center">
          <div className="btn-accent flex h-16 w-16 items-center justify-center rounded-full"><Check size={28} /></div>
          <h3 className="mt-4 font-display text-xl font-semibold">Logged. Nicely done.</h3>
          <p className="mt-1 text-sm text-slate-500">Your Body Weather just got a little smarter.</p>
        </div>
      ) : (
        <div className="space-y-6 pb-2">
          <ChipRow
            label="Flow"
            options={FLOW_OPTIONS.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji === '—' || f.emoji === '·' ? undefined : f.emoji }))}
            value={flow}
            onPick={(id) => setFlow(id)}
          />
          <ChipRow
            label="Energy"
            options={[
              { id: 'low' as EnergyLevel, label: 'Low', emoji: '🪫' },
              { id: 'normal' as EnergyLevel, label: 'Normal', emoji: '🔋' },
              { id: 'high' as EnergyLevel, label: 'High', emoji: '⚡' },
            ]}
            value={energy as EnergyLevel}
            onPick={(id) => setEnergy(energy === id ? undefined : id)}
          />
          {data.settings.showMood && visibleMoods.length > 0 && (
            <ChipRow
              label="Mood (pick any)"
              multi
              options={visibleMoods.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji }))}
              value={moods}
              onPick={(id) => toggle(moods, id, setMoods)}
            />
          )}
          {data.settings.showPhysical && visibleSymptoms.length > 0 && (
            <ChipRow
              label="Symptoms (optional)"
              multi
              options={visibleSymptoms.map((s) => ({ id: s.id, label: s.label, emoji: s.emoji }))}
              value={symptoms}
              onPick={(id) => toggle(symptoms, id, setSymptoms)}
            />
          )}

          <button
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300"
          >
            {showMore ? 'Hide extras' : 'Sleep, water, stress…'}
            <ChevronDown size={16} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>

          {showMore && (
            <div className="anim-fade-up space-y-6">
              <ChipRow
                label="Last night's sleep"
                options={[
                  { id: 'poor' as SleepQuality, label: 'Poor', emoji: '🌑' },
                  { id: 'okay' as SleepQuality, label: 'Okay', emoji: '🌗' },
                  { id: 'good' as SleepQuality, label: 'Good', emoji: '🌙' },
                ]}
                value={sleep as SleepQuality}
                onPick={(id) => setSleep(sleep === id ? undefined : id)}
              />
              {data.settings.showLifestyle && (
                <>
                  <div>
                    <div className="mb-2 text-[13px] font-extrabold text-slate-500 dark:text-slate-400">Water (glasses)</div>
                    <div className="flex items-center gap-3">
                      <button aria-label="Less water" onClick={() => setWater(Math.max(0, (water ?? 4) - 1))} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"><Minus size={16} /></button>
                      <div className="min-w-[64px] text-center font-display text-2xl font-semibold">💧 {water ?? '–'}</div>
                      <button aria-label="More water" onClick={() => setWater(Math.min(15, (water ?? 4) + 1))} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"><Plus size={16} /></button>
                    </div>
                  </div>
                  <ChipRow
                    label="Stress"
                    options={[
                      { id: 'low' as StressLevel, label: 'Low', emoji: '🍃' },
                      { id: 'medium' as StressLevel, label: 'Medium', emoji: '🌬️' },
                      { id: 'high' as StressLevel, label: 'High', emoji: '🌪️' },
                    ]}
                    value={stress as StressLevel}
                    onPick={(id) => setStress(stress === id ? undefined : id)}
                  />
                </>
              )}
              <div>
                <label htmlFor="checkin-notes" className="mb-2 block text-[13px] font-extrabold text-slate-500 dark:text-slate-400">Note (optional)</label>
                <textarea
                  id="checkin-notes"
                  className="field min-h-[76px] resize-y"
                  placeholder="Anything worth remembering? Exam, travel, bad sleep…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          )}

          <button onClick={save} className="btn-accent flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
            <Check size={18} /> Save check-in
          </button>
          <p className="text-center text-xs text-slate-400">Tip: hide trackers you never use in Settings → Tracking.</p>
        </div>
      )}
    </Sheet>
  );
}
