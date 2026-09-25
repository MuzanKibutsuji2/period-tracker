// ─── Mira · Settings ────────────────────────────────────────────────────────
// Personalization + privacy controls. Export / import / delete live here.

import React, { useRef, useState } from 'react';
import { Bell, Download, FileUp, Moon, Palette, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { ACCENTS, ALL_TRACKERS, DEFAULT_SETTINGS, type AccentKey, type ThemeMode } from '../types';
import { useStore } from '../lib/store';
import { validateHistory } from '../lib/cycle';
import { buildExport, downloadTextFile, exportFilename, parseImport } from '../lib/backup';
import { Confirm, Disclaimer, Notice, PrivacyBadge, SectionTitle } from './ui';

function Toggle({ on, onFlip, label }: { on: boolean; onFlip: () => void; label: string }): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onFlip}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? 'accent-bg' : 'bg-slate-200 dark:bg-white/15'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

function Row({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3">
      <div>
        <div className="text-[14px] font-bold">{label}</div>
        {sub && <div className="mt-0.5 text-[12px] text-slate-400">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export default function SettingsView(): React.JSX.Element {
  const { data, actions } = useStore();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifState, setNotifState] = useState<string | null>(null);
  const historyIssues = validateHistory(data.periods);

  const doExport = (): void => {
    downloadTextFile(exportFilename(), buildExport(data));
  };

  const onFile = async (f: File | undefined): Promise<void> => {
    if (!f) return;
    const text = await f.text();
    const res = parseImport(text);
    if (!res.ok) {
      setImportMsg({ tone: 'bad', text: res.errors.join(' ') });
      return;
    }
    if (res.warnings.length) {
      setPendingImport(text); // confirm before replacing
    } else {
      actions.importData(res.data!);
      setImportMsg({ tone: 'good', text: `Imported ${res.data!.periods.length} periods and ${Object.keys(res.data!.logs).length} logged days. Your previous on-device data was replaced.` });
    }
  };

  const confirmPendingImport = (): void => {
    if (!pendingImport) return;
    const res = parseImport(pendingImport);
    if (res.ok && res.data) {
      actions.importData(res.data);
      setImportMsg({ tone: 'info', text: `Imported with ${res.warnings.length} cleanup note${res.warnings.length === 1 ? '' : 's'}: ${res.warnings.slice(0, 3).join(' ')}` });
    }
    setPendingImport(null);
  };

  const enableNotifications = async (): Promise<void> => {
    if (!('Notification' in window)) {
      setNotifState('This browser does not support notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifState(perm === 'granted' ? 'Notifications enabled — Mira will gently flag estimate windows.' : 'Notifications blocked. You can enable them later in browser settings.');
  };

  const setTheme = (theme: ThemeMode): void => actions.updateSettings({ theme });
  const setAccent = (accent: AccentKey): void => actions.updateSettings({ accent });

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      <div>
        <h1 className="font-display text-[26px] font-semibold">Settings</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">Make Mira yours. Everything applies instantly.</p>
      </div>

      {/* assumptions */}
      <section>
        <SectionTitle title="📏 Your typical cycle" sub="Starting assumptions — real history overrides these" />
        <div className="card divide-y divide-slate-100 px-5 dark:divide-white/5">
          <div className="py-4">
            <div className="flex justify-between text-[14px] font-bold"><span>Cycle length</span><span className="accent-text">{s.assumedCycleLength} days</span></div>
            <input type="range" min={15} max={90} value={s.assumedCycleLength} onChange={(e) => actions.updateSettings({ assumedCycleLength: Number(e.target.value) })} className="mt-3" aria-label="Assumed cycle length" />
          </div>
          <div className="py-4">
            <div className="flex justify-between text-[14px] font-bold"><span>Period length</span><span className="accent-text">{s.assumedPeriodLength} days</span></div>
            <input type="range" min={1} max={15} value={s.assumedPeriodLength} onChange={(e) => actions.updateSettings({ assumedPeriodLength: Number(e.target.value) })} className="mt-3" aria-label="Assumed period length" />
          </div>
        </div>
      </section>

      {/* tracking */}
      <section>
        <SectionTitle title="🧩 Tracking categories" sub="Hide whole groups or single trackers from check-ins" />
        <div className="card divide-y divide-slate-100 px-5 dark:divide-white/5">
          <Row label="Physical symptoms" sub="Cramps, headache, bloating…" right={<Toggle on={s.showPhysical} onFlip={() => actions.updateSettings({ showPhysical: !s.showPhysical })} label="Show physical symptoms" />} />
          <Row label="Moods" sub="Happy, calm, irritated…" right={<Toggle on={s.showMood} onFlip={() => actions.updateSettings({ showMood: !s.showMood })} label="Show moods" />} />
          <Row label="Lifestyle" sub="Water, stress, exercise" right={<Toggle on={s.showLifestyle} onFlip={() => actions.updateSettings({ showLifestyle: !s.showLifestyle })} label="Show lifestyle" />} />
          <div className="py-3">
            <div className="mb-2 text-[13px] font-bold text-slate-500">Hide individual trackers</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TRACKERS.map((t) => {
                const hidden = s.hiddenTrackers.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => actions.toggleHiddenTracker(t.id)}
                    aria-pressed={!hidden}
                    title={hidden ? `Show ${t.label}` : `Hide ${t.label}`}
                    className={`rounded-full px-3 py-2 text-[12px] font-bold transition ${hidden ? 'bg-slate-100 text-slate-400 line-through dark:bg-white/5' : 'accent-soft-bg accent-text'}`}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* appearance */}
      <section>
        <SectionTitle title="🎨 Appearance" sub="Light, dark, and your color" />
        <div className="card space-y-4 p-5">
          <div className="flex gap-2" role="group" aria-label="Theme">
            {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Auto', Palette]] as [ThemeMode, string, typeof Sun][]).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                aria-pressed={s.theme === id}
                className={`flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-extrabold transition ${s.theme === id ? 'btn-accent' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-2 text-[13px] font-bold text-slate-500">Accent color</div>
            <div className="flex gap-2.5" role="group" aria-label="Accent color">
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setAccent(k)}
                  aria-label={`${ACCENTS[k].label} accent`}
                  aria-pressed={s.accent === k}
                  title={ACCENTS[k].label}
                  className={`h-11 w-11 rounded-full transition ${s.accent === k ? 'ring-[3px] ring-offset-2 ring-offset-white dark:ring-offset-[#17171f]' : 'opacity-70 hover:opacity-100'}`}
                  style={{ background: ACCENTS[k].gradient, ['--tw-ring-color' as string]: ACCENTS[k].hex }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2" role="group" aria-label="First day of week">
            {([1, 0] as const).map((d) => (
              <button
                key={d}
                onClick={() => actions.updateSettings({ firstDayOfWeek: d })}
                aria-pressed={s.firstDayOfWeek === d}
                className={`h-11 flex-1 rounded-2xl text-[13px] font-extrabold ${s.firstDayOfWeek === d ? 'btn-accent' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}
              >
                Week starts {d === 1 ? 'Monday' : 'Sunday'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* notifications */}
      <section>
        <SectionTitle title="🔔 Gentle reminders" sub="Optional browser notifications — still 100% on-device" />
        <div className="card divide-y divide-slate-100 px-5 dark:divide-white/5">
          <Row label="Period window approaching" sub="A quiet heads-up ~2 days before your estimate" right={<Toggle on={s.reminders.periodSoon} onFlip={() => actions.updateSettings({ reminders: { ...s.reminders, periodSoon: !s.reminders.periodSoon } })} label="Period reminders" />} />
          <Row label="Fertile window" sub="Not for contraception — estimates only" right={<Toggle on={s.reminders.fertileWindow} onFlip={() => actions.updateSettings({ reminders: { ...s.reminders, fertileWindow: !s.reminders.fertileWindow } })} label="Fertile window reminders" />} />
          <div className="py-3">
            <button onClick={enableNotifications} className="accent-soft-bg accent-text flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-extrabold">
              <Bell size={15} /> Enable browser notifications
            </button>
            {notifState && <p className="mt-2 text-center text-xs text-slate-400">{notifState}</p>}
          </div>
        </div>
      </section>

      {/* data */}
      <section>
        <SectionTitle title="💾 Your data" sub="Portable, private, and always deletable" />
        <div className="card space-y-2.5 p-5">
          <div className="flex items-center gap-2"><PrivacyBadge /><span className="text-xs text-slate-400">{data.periods.length} periods · {Object.keys(data.logs).length} logged days</span></div>
          {historyIssues.length > 0 && (
            <Notice tone="warn">
              <strong>History check:</strong>
              <ul className="mt-1 list-disc pl-4">{historyIssues.slice(0, 4).map((h) => <li key={h}>{h}</li>)}</ul>
            </Notice>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={doExport} className="btn-accent flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-extrabold">
              <Download size={15} /> Export JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="accent-soft-bg accent-text flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-extrabold">
              <FileUp size={15} /> Import
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Import backup file" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          {importMsg && <Notice tone={importMsg.tone === 'good' ? 'good' : importMsg.tone === 'bad' ? 'bad' : 'info'}>{importMsg.text}</Notice>}
          <button onClick={() => actions.updateSettings({ ...DEFAULT_SETTINGS, theme: s.theme, accent: s.accent })} className="h-11 w-full rounded-2xl bg-slate-100 text-[13px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
            Reset preferences to defaults
          </button>
          <button onClick={() => setConfirmDelete(true)} className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-red-500/10 text-[13px] font-extrabold text-red-500">
            <Trash2 size={15} /> Delete all my data
          </button>
        </div>
      </section>

      {/* privacy */}
      <section>
        <SectionTitle title="🛡️ Privacy, plainly" />
        <div className="card space-y-2 p-5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" /> Mira has no servers, no accounts and no analytics. Your data lives only in this browser's local storage.</p>
          <p>· Export a JSON backup before switching devices or clearing browser data.</p>
          <p>· Anyone with access to this browser profile could open Mira — use your device lock for privacy.</p>
          <p>· Deleting all data is immediate and irreversible.</p>
        </div>
      </section>

      <div className="card p-5 text-center">
        <div className="font-display text-lg font-semibold">Mira v1.0</div>
        <p className="mt-0.5 text-xs text-slate-400">Made with care · on-device only · no account, ever</p>
        <div className="mt-3"><Disclaimer /></div>
      </div>

      <Confirm
        open={pendingImport != null}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmPendingImport}
        title="Import with cleanups?"
        body="The backup has a few entries that need cleaning (invalid dates will be skipped or fixed). Your current on-device data will be replaced. Continue?"
        confirmLabel="Import anyway"
      />
      <Confirm
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { actions.resetAll(); setConfirmDelete(false); }}
        title="Delete everything?"
        body="This permanently erases all periods, logs, notes and settings on this device. There is no undo. Consider exporting a backup first."
        confirmLabel="Delete all data"
        danger
      />
    </div>
  );
}
