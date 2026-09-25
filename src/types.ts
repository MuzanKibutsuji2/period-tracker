// ─── Mira · core data models ──────────────────────────────────────────────
// Everything is local-only. This file defines the shapes persisted to localStorage.

export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type EnergyLevel = 'low' | 'normal' | 'high';
export type SleepQuality = 'poor' | 'okay' | 'good';
export type StressLevel = 'low' | 'medium' | 'high';
export type AppetiteLevel = 'low' | 'normal' | 'high' | 'cravings';

export interface DayLog {
  /** YYYY-MM-DD (local) */
  date: string;
  flow: FlowLevel;
  symptoms: string[];
  moods: string[];
  energy?: EnergyLevel;
  sleep?: SleepQuality;
  sleepHours?: number;
  water?: number; // glasses 0..12
  exerciseMin?: number;
  stress?: StressLevel;
  appetite?: AppetiteLevel;
  notes?: string;
  updatedAt: number;
}

export interface PeriodEntry {
  id: string;
  /** YYYY-MM-DD of first bleeding day */
  start: string;
  /** YYYY-MM-DD of last bleeding day (null = ongoing / unknown) */
  end: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentKey = 'iris' | 'lagoon' | 'marigold' | 'sky' | 'clay' | 'moss';

export interface TrackerSettings {
  assumedCycleLength: number;
  assumedPeriodLength: number;
  /** 0 = Sunday, 1 = Monday */
  firstDayOfWeek: 0 | 1;
  theme: ThemeMode;
  accent: AccentKey;
  units: 'metric' | 'us';
  showPhysical: boolean;
  showMood: boolean;
  showLifestyle: boolean;
  /** symptom/mood ids the user hid from quick check-in */
  hiddenTrackers: string[];
  /** sections the adaptive check-in learned to collapse */
  checkinCollapsed: string[];
  reminders: { periodSoon: boolean; fertileWindow: boolean };
}

export interface StoreData {
  version: 1;
  onboarded: boolean;
  createdAt: number;
  periods: PeriodEntry[];
  logs: Record<string, DayLog>;
  settings: TrackerSettings;
}

export type PhaseKey = 'period' | 'recovery' | 'mid' | 'ovulation' | 'late' | 'premenstrual';

export interface CycleSummary {
  index: number; // 1-based, oldest first
  start: string;
  /** end of cycle (day before next start, or today if current) */
  end: string;
  length: number | null; // null while current cycle is ongoing
  periodDays: number;
  loggedDays: number;
  symptomCounts: Record<string, number>;
  moodCounts: Record<string, number>;
  avgSleepHours: number | null;
  avgWater: number | null;
  lowEnergyDays: number;
  highEnergyDays: number;
  isCurrent: boolean;
}

// ─── Catalogues ────────────────────────────────────────────────────────────

export interface TrackerDef {
  id: string;
  label: string;
  group: 'physical' | 'mood' | 'lifestyle';
  emoji: string;
}

export const PHYSICAL_SYMPTOMS: TrackerDef[] = [
  { id: 'cramps', label: 'Cramps', group: 'physical', emoji: '🌊' },
  { id: 'headache', label: 'Headache', group: 'physical', emoji: '💫' },
  { id: 'bloating', label: 'Bloating', group: 'physical', emoji: '🎈' },
  { id: 'backache', label: 'Back pain', group: 'physical', emoji: '🪨' },
  { id: 'breast', label: 'Breast tenderness', group: 'physical', emoji: '🌸' },
  { id: 'fatigue', label: 'Fatigue', group: 'physical', emoji: '🪫' },
  { id: 'acne', label: 'Acne', group: 'physical', emoji: '✨' },
  { id: 'nausea', label: 'Nausea', group: 'physical', emoji: '🍃' },
  { id: 'dizziness', label: 'Dizziness', group: 'physical', emoji: '🌀' },
  { id: 'cravings symptom', label: 'Cravings', group: 'physical', emoji: '🍫' },
];

export const MOODS: TrackerDef[] = [
  { id: 'happy', label: 'Happy', group: 'mood', emoji: '😊' },
  { id: 'calm', label: 'Calm', group: 'mood', emoji: '😌' },
  { id: 'energetic', label: 'Energetic', group: 'mood', emoji: '⚡' },
  { id: 'irritated', label: 'Irritated', group: 'mood', emoji: '😤' },
  { id: 'sad', label: 'Sad', group: 'mood', emoji: '🌧️' },
  { id: 'anxious', label: 'Anxious', group: 'mood', emoji: '😟' },
  { id: 'low-energy', label: 'Low energy', group: 'mood', emoji: '😮‍💨' },
  { id: 'sensitive', label: 'Sensitive', group: 'mood', emoji: '💧' },
];

export const ALL_TRACKERS: TrackerDef[] = [...PHYSICAL_SYMPTOMS, ...MOODS];

export function trackerLabel(id: string): string {
  return ALL_TRACKERS.find((t) => t.id === id)?.label ?? id;
}

export const ACCENTS: Record<AccentKey, { label: string; hex: string; soft: string; gradient: string }> = {
  iris: { label: 'Iris', hex: '#7C6CF0', soft: 'rgba(124,108,240,.12)', gradient: 'linear-gradient(135deg,#7C6CF0,#B388FF)' },
  lagoon: { label: 'Lagoon', hex: '#0EA795', soft: 'rgba(14,167,149,.12)', gradient: 'linear-gradient(135deg,#0EA795,#5EEAD4)' },
  marigold: { label: 'Marigold', hex: '#D9932B', soft: 'rgba(217,147,43,.14)', gradient: 'linear-gradient(135deg,#D9932B,#FCD34D)' },
  sky: { label: 'Sky', hex: '#3E9BE0', soft: 'rgba(62,155,224,.12)', gradient: 'linear-gradient(135deg,#3E9BE0,#93C5FD)' },
  clay: { label: 'Clay', hex: '#D9634E', soft: 'rgba(217,99,78,.12)', gradient: 'linear-gradient(135deg,#D9634E,#FCA5A5)' },
  moss: { label: 'Moss', hex: '#5FA860', soft: 'rgba(95,168,96,.14)', gradient: 'linear-gradient(135deg,#5FA860,#A7F3D0)' },
};

export const FLOW_OPTIONS: { id: FlowLevel; label: string; emoji: string }[] = [
  { id: 'none', label: 'None', emoji: '—' },
  { id: 'spotting', label: 'Spotting', emoji: '·' },
  { id: 'light', label: 'Light', emoji: '💧' },
  { id: 'medium', label: 'Medium', emoji: '💧💧' },
  { id: 'heavy', label: 'Heavy', emoji: '🌊' },
];

export const DEFAULT_SETTINGS: TrackerSettings = {
  assumedCycleLength: 28,
  assumedPeriodLength: 5,
  firstDayOfWeek: 1,
  theme: 'system',
  accent: 'iris',
  units: 'metric',
  showPhysical: true,
  showMood: true,
  showLifestyle: true,
  hiddenTrackers: [],
  checkinCollapsed: [],
  reminders: { periodSoon: false, fertileWindow: false },
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
