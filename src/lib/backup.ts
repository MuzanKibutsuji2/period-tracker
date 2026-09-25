// ─── Mira · export / import / backup ─────────────────────────────────────────
// Portable JSON format, validated defensively so a bad file never corrupts state.

import { DEFAULT_SETTINGS, type FlowLevel, type StoreData } from '../types';
import { isValidISO } from './cycle';

export const EXPORT_VERSION = 1;

export interface ExportPayload {
  app: 'mira-cycle-companion';
  version: number;
  exportedAt: string;
  data: StoreData;
}

export function buildExport(data: StoreData): string {
  const payload: ExportPayload = {
    app: 'mira-cycle-companion',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportFilename(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `mira-backup-${stamp}.json`;
}

export interface ImportResult {
  ok: boolean;
  data?: StoreData;
  errors: string[];
  warnings: string[];
}

const FLOWS: FlowLevel[] = ['none', 'spotting', 'light', 'medium', 'heavy'];

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Parse + sanitize an imported file. Never throws; returns structured errors. */
export function parseImport(text: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['That file is not valid JSON. Please choose a Mira backup file (.json).'], warnings };
  }

  const root = (raw as { data?: unknown }).data ?? raw;
  if (typeof root !== 'object' || root === null) {
    return { ok: false, errors: ['That file does not look like a Mira backup.'], warnings };
  }
  const r = root as Record<string, unknown>;

  // periods
  const periods: StoreData['periods'] = [];
  if (r.periods !== undefined) {
    if (!Array.isArray(r.periods)) {
      errors.push('Backup is malformed: "periods" should be a list.');
    } else {
      for (const [i, p] of (r.periods as unknown[]).entries()) {
        if (typeof p !== 'object' || p === null) { warnings.push(`Skipped period #${i + 1} (unreadable).`); continue; }
        const { id, start, end } = p as Record<string, unknown>;
        if (typeof start !== 'string' || !isValidISO(start)) { warnings.push(`Skipped a period with an invalid start date (${String(start)}).`); continue; }
        if (end !== null && end !== undefined && (typeof end !== 'string' || !isValidISO(end))) {
          warnings.push(`Cleared an invalid end date for the period starting ${start}.`);
          periods.push({ id: typeof id === 'string' ? id : `imported-${i}`, start, end: null });
          continue;
        }
        if (typeof end === 'string' && end < start) {
          warnings.push(`Cleared an end date before its start (${start}).`);
          periods.push({ id: typeof id === 'string' ? id : `imported-${i}`, start, end: null });
          continue;
        }
        periods.push({ id: typeof id === 'string' ? id : `imported-${i}`, start, end: (end as string) ?? null });
      }
    }
  }

  // logs
  const logs: StoreData['logs'] = {};
  if (r.logs !== undefined) {
    if (typeof r.logs !== 'object' || r.logs === null || Array.isArray(r.logs)) {
      errors.push('Backup is malformed: "logs" should be an object of dates.');
    } else {
      for (const [date, entry] of Object.entries(r.logs as Record<string, unknown>)) {
        if (!isValidISO(date)) { warnings.push(`Skipped log with invalid date "${date}".`); continue; }
        if (typeof entry !== 'object' || entry === null) { warnings.push(`Skipped log for ${date} (unreadable).`); continue; }
        const e = entry as Record<string, unknown>;
        const flow: FlowLevel = FLOWS.includes(e.flow as FlowLevel) ? (e.flow as FlowLevel) : 'none';
        logs[date] = {
          date,
          flow,
          symptoms: asStringArray(e.symptoms),
          moods: asStringArray(e.moods),
          energy: e.energy === 'low' || e.energy === 'normal' || e.energy === 'high' ? e.energy : undefined,
          sleep: e.sleep === 'poor' || e.sleep === 'okay' || e.sleep === 'good' ? e.sleep : undefined,
          sleepHours: typeof e.sleepHours === 'number' && e.sleepHours >= 0 && e.sleepHours <= 24 ? e.sleepHours : undefined,
          water: typeof e.water === 'number' && e.water >= 0 && e.water <= 20 ? Math.round(e.water) : undefined,
          exerciseMin: typeof e.exerciseMin === 'number' && e.exerciseMin >= 0 && e.exerciseMin <= 1440 ? Math.round(e.exerciseMin) : undefined,
          stress: e.stress === 'low' || e.stress === 'medium' || e.stress === 'high' ? e.stress : undefined,
          appetite: e.appetite === 'low' || e.appetite === 'normal' || e.appetite === 'high' || e.appetite === 'cravings' ? e.appetite : undefined,
          notes: typeof e.notes === 'string' ? e.notes.slice(0, 5000) : undefined,
          updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
        };
      }
    }
  }

  if (errors.length) return { ok: false, errors, warnings };

  // settings (lenient — fall back to defaults per field)
  const s = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Record<string, unknown>;
  const num = (v: unknown, fb: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fb;
  const data: StoreData = {
    version: 1,
    onboarded: true,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    periods,
    logs,
    settings: {
      ...DEFAULT_SETTINGS,
      assumedCycleLength: num(s.assumedCycleLength, 28, 15, 90),
      assumedPeriodLength: num(s.assumedPeriodLength, 5, 1, 15),
      firstDayOfWeek: s.firstDayOfWeek === 0 ? 0 : 1,
      theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : 'system',
      accent: typeof s.accent === 'string' && ['iris', 'lagoon', 'marigold', 'sky', 'clay', 'moss'].includes(s.accent)
        ? (s.accent as StoreData['settings']['accent'])
        : 'iris',
      units: s.units === 'us' ? 'us' : 'metric',
      showPhysical: s.showPhysical !== false,
      showMood: s.showMood !== false,
      showLifestyle: s.showLifestyle !== false,
      hiddenTrackers: asStringArray(s.hiddenTrackers),
      checkinCollapsed: asStringArray(s.checkinCollapsed),
      reminders: {
        periodSoon: (s.reminders as { periodSoon?: unknown } | undefined)?.periodSoon === true,
        fertileWindow: (s.reminders as { fertileWindow?: unknown } | undefined)?.fertileWindow === true,
      },
    },
  };

  if (!periods.length && !Object.keys(logs).length) {
    warnings.push('This backup contains no periods or logs — settings were still restored.');
  }
  return { ok: true, data, errors, warnings };
}
