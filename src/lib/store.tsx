// ─── Mira · local-only store ────────────────────────────────────────────────
// React context + localStorage persistence. No network calls, ever.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  uid,
  type DayLog,
  type FlowLevel,
  type PeriodEntry,
  type StoreData,
  type TrackerSettings,
} from '../types';
import { addDaysISO, diffDays, findPeriodContaining, periodDayList, sortPeriods, todayISO } from './cycle';

const STORAGE_KEY = 'mira.cycle.v1';
const CORRUPT_PREFIX = 'mira.corrupted.';

export function freshStore(): StoreData {
  return {
    version: 1,
    onboarded: false,
    createdAt: Date.now(),
    periods: [],
    logs: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function sanitizeLoaded(raw: unknown): StoreData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.periods) || typeof r.logs !== 'object' || r.logs === null) return null;
  const settings = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Record<string, unknown>;
  return {
    version: 1,
    onboarded: r.onboarded === true,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    periods: (r.periods as PeriodEntry[]).filter((p) => p && typeof p.start === 'string'),
    logs: r.logs as Record<string, DayLog>,
    settings: { ...DEFAULT_SETTINGS, ...settings } as TrackerSettings,
  };
}

function loadInitial(): { data: StoreData; corrupted: boolean } {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return { data: freshStore(), corrupted: false };
    const parsed = JSON.parse(text);
    // support both raw StoreData and full export payloads
    const candidate = (parsed as { data?: unknown })?.data ?? parsed;
    const clean = sanitizeLoaded(candidate);
    if (clean) return { data: clean, corrupted: false };
    // corrupt — stash it aside instead of destroying
    try {
      localStorage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, text);
    } catch { /* storage full — nothing we can do */ }
    return { data: freshStore(), corrupted: true };
  } catch {
    return { data: freshStore(), corrupted: true };
  }
}

// ─── sample data (for "explore with sample data") ───────────────────────────
// Deterministic-ish generator producing ~3 realistic cycles. Clearly labelled.

function mulberry(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSampleData(): StoreData {
  const rnd = mulberry(42);
  const today = todayISO();
  const starts = [addDaysISO(today, -70), addDaysISO(today, -42), addDaysISO(today, -13)];
  const periods: PeriodEntry[] = starts.map((s, i) => ({
    id: uid() + i,
    start: s,
    end: addDaysISO(s, i === 1 ? 4 : 5),
  }));
  const logs: Record<string, DayLog> = {};
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  for (const [ci, start] of starts.entries()) {
    const len = ci === 0 ? 28 : ci === 1 ? 29 : 14; // current cycle partial
    for (let d = 0; d < len; d++) {
      if (rnd() < 0.25) continue; // some days unlogged — realistic
      const date = addDaysISO(start, d);
      if (date > today) continue;
      const inPeriod = d <= 5;
      const premenstrual = d >= len - 5 && ci < 2;
      const symptoms: string[] = [];
      if (inPeriod && rnd() < 0.7) symptoms.push('cramps');
      if (inPeriod && rnd() < 0.35) symptoms.push('fatigue');
      if (inPeriod && rnd() < 0.3) symptoms.push('backache');
      if (premenstrual && rnd() < 0.5) symptoms.push('headache');
      if (premenstrual && rnd() < 0.4) symptoms.push('bloating');
      if (rnd() < 0.08) symptoms.push(pick(['acne', 'nausea', 'dizziness']));
      const moods: string[] = [];
      if (inPeriod && rnd() < 0.5) moods.push(pick(['irritated', 'low-energy', 'sad', 'sensitive']));
      else if (premenstrual && rnd() < 0.45) moods.push(pick(['anxious', 'irritated', 'sensitive']));
      else if (rnd() < 0.55) moods.push(pick(['happy', 'calm', 'energetic', 'calm']));
      const flow: FlowLevel = !inPeriod ? (rnd() < 0.03 ? 'spotting' : 'none') : d === 0 || d === 5 ? 'light' : d <= 2 ? 'heavy' : 'medium';
      logs[date] = {
        date,
        flow,
        symptoms: [...new Set(symptoms)],
        moods: [...new Set(moods)],
        energy: inPeriod ? pick(['low', 'low', 'normal']) : premenstrual ? pick(['low', 'normal', 'normal']) : pick(['normal', 'high', 'normal']),
        sleep: inPeriod && rnd() < 0.4 ? 'poor' : pick(['okay', 'good', 'good', 'okay']),
        sleepHours: Math.round((inPeriod ? 5.5 + rnd() * 2 : 6.5 + rnd() * 2.2) * 2) / 2,
        water: Math.round(3 + rnd() * 5),
        exerciseMin: rnd() < 0.35 ? Math.round(15 + rnd() * 40) : undefined,
        stress: premenstrual ? pick(['medium', 'high', 'medium']) : pick(['low', 'low', 'medium']),
        updatedAt: Date.now(),
      };
    }
  }
  return {
    version: 1,
    onboarded: true,
    createdAt: Date.now(),
    periods,
    logs,
    settings: { ...DEFAULT_SETTINGS, assumedCycleLength: 28, assumedPeriodLength: 5 },
  };
}

// ─── context ────────────────────────────────────────────────────────────────

interface StoreActions {
  completeOnboarding: (opts: { lastPeriodStart: string | null; cycleLength: number; periodLength: number }) => void;
  loadSampleData: () => void;
  upsertLog: (date: string, patch: Partial<DayLog>) => void;
  deleteLog: (date: string) => void;
  addPeriod: (start: string, end: string | null) => void;
  updatePeriod: (id: string, start: string, end: string | null) => void;
  deletePeriod: (id: string) => void;
  updateSettings: (patch: Partial<TrackerSettings>) => void;
  toggleHiddenTracker: (id: string) => void;
  importData: (data: StoreData) => void;
  resetAll: () => void;
  dismissCorruptionNotice: () => void;
}

interface StoreCtx {
  data: StoreData;
  corrupted: boolean;
  actions: StoreActions;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [initial] = useState(loadInitial);
  const [data, setData] = useState<StoreData>(initial.data);
  const [corrupted, setCorrupted] = useState(initial.corrupted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable — app keeps working in-memory
    }
  }, [data]);

  /** Keep period entries in sync when a day's flow changes. */
  const syncPeriodForFlow = useCallback((periods: PeriodEntry[], date: string, flow: FlowLevel): PeriodEntry[] => {
    const isBleeding = flow === 'light' || flow === 'medium' || flow === 'heavy';
    const existing = findPeriodContaining(periods, date);
    if (isBleeding && !existing) {
      // merge with adjacent entries when possible
      const prevDay = addDaysISO(date, -1);
      const nextDay = addDaysISO(date, 1);
      const prev = periods.find((p) => (p.end ?? todayISO()) === prevDay);
      const next = periods.find((p) => p.start === nextDay);
      if (prev && next && prev.id !== next.id) {
        return periods.filter((p) => p.id !== prev.id && p.id !== next.id).concat({ ...prev, end: next.end });
      }
      if (prev) return periods.map((p) => (p.id === prev.id ? { ...p, end: date } : p));
      if (next) return periods.map((p) => (p.id === next.id ? { ...p, start: date } : p));
      return [...periods, { id: uid(), start: date, end: date }];
    }
    if (!isBleeding && existing) {
      const days = periodDayList(existing);
      if (days.length === 1) return periods.filter((p) => p.id !== existing.id);
      if (existing.start === date) return periods.map((p) => (p.id === existing.id ? { ...p, start: addDaysISO(date, 1) } : p));
      const end = existing.end ?? todayISO();
      if (end === date) {
        const newEnd = addDaysISO(date, -1);
        return periods.map((p) => (p.id === existing.id ? { ...p, end: newEnd < p.start ? p.start : newEnd } : p));
      }
      // middle day removed → split into two entries
      const before: PeriodEntry = { ...existing, end: addDaysISO(date, -1) };
      const after: PeriodEntry = { id: uid(), start: addDaysISO(date, 1), end: existing.end };
      return periods.map((p) => (p.id === existing.id ? before : p)).concat(after);
    }
    return periods;
  }, []);

  const actions: StoreActions = useMemo(() => ({
    completeOnboarding: ({ lastPeriodStart, cycleLength, periodLength }) => {
      const validStart = lastPeriodStart && lastPeriodStart <= todayISO() ? lastPeriodStart : null;
      setData((d) => ({
        ...d,
        onboarded: true,
        periods: validStart
          ? [{ id: uid(), start: validStart, end: addDaysISO(validStart, Math.max(0, periodLength - 1)) }]
          : [],
        settings: { ...d.settings, assumedCycleLength: cycleLength, assumedPeriodLength: periodLength },
      }));
    },
    loadSampleData: () => setData(buildSampleData()),
    upsertLog: (date, patch) => {
      setData((d) => {
        const prev: DayLog = d.logs[date] ?? { date, flow: 'none', symptoms: [], moods: [], updatedAt: Date.now() };
        const next: DayLog = {
          ...prev,
          ...patch,
          date,
          symptoms: patch.symptoms ?? prev.symptoms,
          moods: patch.moods ?? prev.moods,
          updatedAt: Date.now(),
        };
        const periods = patch.flow !== undefined && patch.flow !== prev.flow
          ? syncPeriodForFlow(d.periods, date, patch.flow)
          : d.periods;
        return { ...d, logs: { ...d.logs, [date]: next }, periods: sortPeriods(periods) };
      });
    },
    deleteLog: (date) => {
      setData((d) => {
        const logs = { ...d.logs };
        const prev = logs[date];
        delete logs[date];
        const periods = prev && (prev.flow === 'light' || prev.flow === 'medium' || prev.flow === 'heavy')
          ? syncPeriodForFlow(d.periods, date, 'none')
          : d.periods;
        return { ...d, logs, periods };
      });
    },
    addPeriod: (start, end) => {
      setData((d) => ({ ...d, periods: sortPeriods([...d.periods, { id: uid(), start, end }]) }));
    },
    updatePeriod: (id, start, end) => {
      setData((d) => ({
        ...d,
        periods: sortPeriods(d.periods.map((p) => (p.id === id ? { ...p, start, end } : p))),
      }));
    },
    deletePeriod: (id) => {
      setData((d) => ({ ...d, periods: d.periods.filter((p) => p.id !== id) }));
    },
    updateSettings: (patch) => {
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },
    toggleHiddenTracker: (id) => {
      setData((d) => {
        const hidden = d.settings.hiddenTrackers.includes(id)
          ? d.settings.hiddenTrackers.filter((h) => h !== id)
          : [...d.settings.hiddenTrackers, id];
        return { ...d, settings: { ...d.settings, hiddenTrackers: hidden } };
      });
    },
    importData: (imported) => setData({ ...imported, onboarded: true }),
    resetAll: () => {
      setData({ ...freshStore(), onboarded: true });
      setCorrupted(false);
    },
    dismissCorruptionNotice: () => setCorrupted(false),
  }), [syncPeriodForFlow]);

  const value = useMemo(() => ({ data, corrupted, actions }), [data, corrupted, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Days between earliest data and today, for "days tracked" stats. */
export function dataSpanDays(data: StoreData): number {
  const dates = [...data.periods.map((p) => p.start), ...Object.keys(data.logs)].sort();
  if (!dates.length) return 0;
  return Math.max(1, diffDays(dates[0], todayISO()) + 1);
}
