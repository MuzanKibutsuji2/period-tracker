// ─── Mira · app shell ───────────────────────────────────────────────────────
// Navigation, theming, check-in, gentle reminders. Mobile-first, desktop-aware.

import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, History, Home, LineChart, Plus, Settings } from 'lucide-react';
import { ACCENTS } from './types';
import { StoreProvider, useStore } from './lib/store';
import { getCycleState, todayISO } from './lib/cycle';
import { Logo, PrivacyBadge } from './components/ui';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import InsightsView from './components/InsightsView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import Timeline from './components/Timeline';
import CheckIn from './components/CheckIn';

export type ViewKey = 'home' | 'calendar' | 'insights' | 'history' | 'settings' | 'timeline';

const NAV: { id: ViewKey; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: LineChart },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function Shell(): React.JSX.Element {
  const { data, corrupted, actions } = useStore();
  const [view, setView] = useState<ViewKey>('home');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  // ── theme + accent ──
  useEffect(() => {
    const root = document.documentElement;
    const apply = (): void => {
      const mode = data.settings.theme;
      const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
      const a = ACCENTS[data.settings.accent];
      root.style.setProperty('--accent', a.hex);
      root.style.setProperty('--accent-soft', a.soft);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e0e16' : '#f6f5fb');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [data.settings.theme, data.settings.accent]);

  // ── gentle reminders (local evaluation, Notification API only) ──
  useEffect(() => {
    if (!data.onboarded) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!data.settings.reminders.periodSoon && !data.settings.reminders.fertileWindow) return;
    try {
      const today = todayISO();
      const firedRaw = localStorage.getItem('mira.notified') ?? '{}';
      const fired = JSON.parse(firedRaw) as Record<string, string>;
      const state = getCycleState(data.periods, data.settings.assumedCycleLength, data.settings.assumedPeriodLength, today);
      const fire = (key: string, title: string, body: string): void => {
        if (fired[key] === today) return;
        new Notification(title, { body, tag: key });
        fired[key] = today;
        localStorage.setItem('mira.notified', JSON.stringify(fired));
      };
      if (data.settings.reminders.periodSoon && state.daysUntilPeriod != null && state.daysUntilPeriod >= 0 && state.daysUntilPeriod <= 2) {
        fire('period', '🌙 Mira · gentle heads-up', state.daysUntilPeriod === 0 ? 'Your estimated period window includes today.' : `Your estimated period window starts in ~${state.daysUntilPeriod} days.`);
      }
      if (data.settings.reminders.fertileWindow && state.fertileWindow && today >= state.fertileWindow.from && today <= state.fertileWindow.to) {
        fire('fertile', '✨ Mira · gentle heads-up', 'You may be in your estimated fertile window. Estimates only.');
      }
    } catch {
      // notifications are best-effort
    }
  }, [data.onboarded, data.periods, data.settings]);

  if (!data.onboarded) return <Onboarding />;

  const go = (v: ViewKey): void => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const editDay = (iso: string): void => {
    setFocusDate(iso);
    setView('calendar');
    window.scrollTo({ top: 0 });
  };

  const activeNav: ViewKey = view === 'timeline' ? 'home' : view;

  return (
    <div className="min-h-dvh">
      {/* desktop top bar */}
      <header className="no-print sticky top-0 z-40 hidden border-b border-slate-200/60 bg-white/80 backdrop-blur md:block dark:border-white/5 dark:bg-[#0e0e16]/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <button onClick={() => go('home')} className="flex items-center gap-2.5" aria-label="Mira home">
            <Logo size={34} />
            <span className="font-display text-xl font-semibold">Mira</span>
          </button>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={activeNav === n.id ? 'page' : undefined}
                className={`flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold transition ${
                  activeNav === n.id ? 'accent-soft-bg accent-text' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                }`}
              >
                <n.icon size={16} /> {n.label}
              </button>
            ))}
            <button onClick={() => setCheckinOpen(true)} className="btn-accent ml-2 flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold">
              <Plus size={16} /> Check-in
            </button>
          </nav>
        </div>
      </header>

      {/* mobile top bar */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between bg-[#f6f5fb]/85 px-5 py-3 backdrop-blur md:hidden dark:bg-[#0e0e16]/85">
        <button onClick={() => go('home')} className="flex items-center gap-2" aria-label="Mira home">
          <Logo size={30} />
          <span className="font-display text-lg font-semibold">Mira</span>
        </button>
        <PrivacyBadge compact />
      </header>

      {corrupted && (
        <div className="no-print mx-auto mt-3 max-w-3xl px-4">
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            Your saved data looked corrupted, so Mira started fresh — the old copy was kept aside in this browser.
            You can re-import a backup in Settings.{' '}
            <button onClick={actions.dismissCorruptionNotice} className="font-extrabold underline">Dismiss</button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl px-4 pt-4 md:max-w-4xl md:px-6 md:pt-8">
        {view === 'timeline' && (
          <button onClick={() => go('home')} className="no-print mb-3 inline-flex h-10 items-center gap-1.5 rounded-2xl bg-white px-4 text-[13px] font-extrabold text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-300">
            <ArrowLeft size={15} /> Back home
          </button>
        )}
        {view === 'home' && <Dashboard onCheckIn={() => setCheckinOpen(true)} onGo={go} />}
        {view === 'calendar' && <CalendarView focusDate={focusDate} onConsumeFocus={() => setFocusDate(null)} />}
        {view === 'insights' && <InsightsView />}
        {view === 'history' && <HistoryView />}
        {view === 'settings' && <SettingsView />}
        {view === 'timeline' && <Timeline onEditDay={editDay} />}
      </main>

      {/* mobile bottom nav */}
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-white/10 dark:bg-[#14141c]/95">
        <div className="grid grid-cols-5 px-1">
          {NAV.map((n) => {
            const active = activeNav === n.id;
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition ${active ? 'accent-text' : 'text-slate-400'}`}
              >
                <n.icon size={21} strokeWidth={active ? 2.5 : 2} />
                {n.label}
                {active && <span className="accent-bg h-1 w-6 rounded-full" aria-hidden />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* mobile check-in FAB */}
      <button
        onClick={() => setCheckinOpen(true)}
        aria-label="Quick check-in"
        className="btn-accent no-print fixed bottom-[76px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-soft md:hidden"
      >
        <Plus size={24} />
      </button>

      {checkinOpen && <CheckIn open onClose={() => setCheckinOpen(false)} />}
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
