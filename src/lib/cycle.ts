// ─── Mira · date helpers + cycle math ───────────────────────────────────────
// All dates are local-midnight YYYY-MM-DD strings. No timezones, no surprises.

import type { CycleSummary, DayLog, PeriodEntry, PhaseKey } from '../types';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── dates ────────────────────────────────────────────────────────────────

export function isValidISO(s: string): boolean {
  if (!ISO_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole calendar days from a → b (b - a). */
export function diffDays(a: string, b: string): number {
  const da = parseISO(a);
  const db = parseISO(b);
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtShort(s: string): string {
  if (!isValidISO(s)) return s;
  const d = parseISO(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtLong(s: string): string {
  if (!isValidISO(s)) return s;
  const d = parseISO(s);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtLongYear(s: string): string {
  if (!isValidISO(s)) return s;
  const d = parseISO(s);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtWeekday(s: string): string {
  if (!isValidISO(s)) return '';
  return DAYS[parseISO(s).getDay()];
}

export function monthLabel(year: number, month0: number): string {
  return `${MONTHS_LONG[month0]} ${year}`;
}

// ─── periods ──────────────────────────────────────────────────────────────

export function sortPeriods(periods: PeriodEntry[]): PeriodEntry[] {
  return [...periods].sort((a, b) => a.start.localeCompare(b.start));
}

/** Inclusive bleeding days for an entry (open-ended counts through today). */
export function periodDayList(p: PeriodEntry, today: string = todayISO()): string[] {
  const end = p.end ?? (p.start > today ? p.start : today);
  const n = diffDays(p.start, end);
  if (n < 0) return [];
  const out: string[] = [];
  for (let i = 0; i <= Math.min(n, 30); i++) out.push(addDaysISO(p.start, i));
  return out;
}

export function periodDuration(p: PeriodEntry, today: string = todayISO()): number {
  if (p.end) return diffDays(p.start, p.end) + 1;
  if (p.start > today) return 0;
  return diffDays(p.start, today) + 1;
}

export function findPeriodContaining(periods: PeriodEntry[], dateISO: string): PeriodEntry | undefined {
  const today = todayISO();
  return periods.find((p) => {
    const end = p.end ?? today;
    return p.start <= dateISO && dateISO <= end;
  });
}

/** Lengths between consecutive period starts (oldest first). */
export function cycleLengths(periods: PeriodEntry[]): number[] {
  const sorted = sortPeriods(periods);
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = diffDays(sorted[i - 1].start, sorted[i].start);
    if (len >= 10 && len <= 120) out.push(len);
  }
  return out;
}

export function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums)!;
  const v = nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

export function averageCycleLength(periods: PeriodEntry[], assumption: number): { value: number; basedOn: number } {
  const lens = cycleLengths(periods).slice(-6);
  if (!lens.length) return { value: assumption, basedOn: 0 };
  return { value: Math.round(mean(lens)!), basedOn: lens.length };
}

export function averagePeriodLength(periods: PeriodEntry[], assumption: number): { value: number; basedOn: number } {
  const closed = sortPeriods(periods).filter((p) => p.end);
  const today = todayISO();
  const durs = closed.slice(-6).map((p) => periodDuration(p, today)).filter((d) => d >= 1 && d <= 15);
  if (!durs.length) return { value: assumption, basedOn: 0 };
  return { value: Math.round(mean(durs)!), basedOn: durs.length };
}

// ─── current cycle + phases ───────────────────────────────────────────────

export interface CycleState {
  hasData: boolean;
  currentStart: string | null;
  /** 1-based day number within current cycle */
  cycleDay: number | null;
  phase: PhaseKey | null;
  avgCycle: number;
  avgCycleBasedOn: number;
  avgPeriod: number;
  avgPeriodBasedOn: number;
  variability: number; // stddev of recent cycle lengths
  nextPeriodStart: string | null;
  /** estimated window around next period (inclusive) */
  nextWindow: { from: string; to: string } | null;
  ovulationEstimate: string | null;
  fertileWindow: { from: string; to: string } | null;
  daysUntilPeriod: number | null;
  confidence: 'high' | 'medium' | 'low';
  lateBy: number; // days past avg (0 if not late)
}

export function getPhase(day: number, avgCycle: number, avgPeriod: number): PhaseKey {
  if (day <= avgPeriod) return 'period';
  const ov = avgCycle - 14;
  if (day >= ov - 1 && day <= ov + 1 && ov > avgPeriod + 1) return 'ovulation';
  if (day < ov - 1) {
    const span = ov - 1 - avgPeriod;
    if (span <= 1) return 'recovery';
    const mid = avgPeriod + Math.ceil(span / 2);
    return day <= mid ? 'recovery' : 'mid';
  }
  return day > avgCycle - 4 ? 'premenstrual' : 'late';
}

export const PHASE_META: Record<PhaseKey, { label: string; tagline: string; emoji: string }> = {
  period: { label: 'Period', tagline: 'Bleeding phase — rest is productive.', emoji: '🩸' },
  recovery: { label: 'Recovery', tagline: 'Easing out of your period.', emoji: '🌱' },
  mid: { label: 'Mid-cycle', tagline: 'Energy often builds here.', emoji: '🌤️' },
  ovulation: { label: 'Ovulation (estimated)', tagline: 'Fertility likely peaks around now.', emoji: '✨' },
  late: { label: 'Late cycle', tagline: 'Winding toward your next period.', emoji: '🍂' },
  premenstrual: { label: 'Premenstrual', tagline: 'Your next period may be close.', emoji: '🌙' },
};

export function getCycleState(
  periods: PeriodEntry[],
  assumedCycle: number,
  assumedPeriod: number,
  today: string = todayISO()
): CycleState {
  const sorted = sortPeriods(periods).filter((p) => p.start <= today);
  const { value: avgCycle, basedOn: avgCycleBasedOn } = averageCycleLength(periods, assumedCycle);
  const { value: avgPeriod, basedOn: avgPeriodBasedOn } = averagePeriodLength(periods, assumedPeriod);
  const variability = stddev(cycleLengths(periods).slice(-6));

  if (!sorted.length) {
    return {
      hasData: false,
      currentStart: null,
      cycleDay: null,
      phase: null,
      avgCycle,
      avgCycleBasedOn,
      avgPeriod,
      avgPeriodBasedOn,
      variability,
      nextPeriodStart: null,
      nextWindow: null,
      ovulationEstimate: null,
      fertileWindow: null,
      daysUntilPeriod: null,
      confidence: 'low',
      lateBy: 0,
    };
  }

  const currentStart = sorted[sorted.length - 1].start;
  const cycleDay = diffDays(currentStart, today) + 1;
  const phase = getPhase(cycleDay, avgCycle, avgPeriod);

  const nextPeriodStart = addDaysISO(currentStart, avgCycle);
  const spread = avgCycleBasedOn >= 3 ? Math.max(1, Math.min(4, Math.round(variability))) : 2;
  const nextWindow = { from: addDaysISO(nextPeriodStart, -spread), to: addDaysISO(nextPeriodStart, spread) };
  const ovulationEstimate = addDaysISO(nextPeriodStart, -14);
  const fertileWindow = { from: addDaysISO(ovulationEstimate, -5), to: ovulationEstimate };
  const daysUntilPeriod = diffDays(today, nextPeriodStart);
  const lateBy = Math.max(0, -daysUntilPeriod);

  const confidence: CycleState['confidence'] =
    avgCycleBasedOn >= 4 && variability <= 2.5 ? 'high' : avgCycleBasedOn >= 2 && variability <= 5 ? 'medium' : 'low';

  return {
    hasData: true,
    currentStart,
    cycleDay,
    phase,
    avgCycle,
    avgCycleBasedOn,
    avgPeriod,
    avgPeriodBasedOn,
    variability,
    nextPeriodStart,
    nextWindow,
    ovulationEstimate,
    fertileWindow,
    daysUntilPeriod,
    confidence,
    lateBy,
  };
}

// ─── day classification (for calendar) ────────────────────────────────────

export interface DayStatus {
  inPeriod: boolean;
  predictedPeriod: boolean;
  fertile: boolean;
  ovulation: boolean;
  cycleDay: number | null;
  phase: PhaseKey | null;
}

export function getDayStatus(
  dateISO: string,
  periods: PeriodEntry[],
  state: CycleState
): DayStatus {
  const inPeriod = !!findPeriodContaining(periods, dateISO);
  const predictedPeriod =
    !inPeriod && !!state.nextWindow && dateISO >= state.nextWindow.from && dateISO <= state.nextWindow.to && dateISO >= todayISO();
  const fertile =
    !!state.fertileWindow && dateISO >= state.fertileWindow.from && dateISO <= state.fertileWindow.to;
  const ovulation = state.ovulationEstimate === dateISO;

  let cycleDay: number | null = null;
  let phase: PhaseKey | null = null;
  if (state.currentStart && dateISO >= state.currentStart) {
    // for future dates, project the cycle day within the predicted cycle
    const raw = diffDays(state.currentStart, dateISO) + 1;
    cycleDay = ((raw - 1) % state.avgCycle) + 1;
    phase = getPhase(cycleDay, state.avgCycle, state.avgPeriod);
  } else if (state.currentStart) {
    // past: find which cycle it belonged to
    const sorted = sortPeriods(periods);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (dateISO >= sorted[i].start) {
        cycleDay = diffDays(sorted[i].start, dateISO) + 1;
        phase = getPhase(cycleDay, state.avgCycle, state.avgPeriod);
        break;
      }
    }
  }
  return { inPeriod, predictedPeriod, fertile, ovulation, cycleDay, phase };
}

// ─── summaries ────────────────────────────────────────────────────────────

export function summarizeCycles(
  periods: PeriodEntry[],
  logs: Record<string, DayLog>,
  avgCycle: number,
  today: string = todayISO()
): CycleSummary[] {
  const sorted = sortPeriods(periods).filter((p) => p.start <= today);
  return sorted.map((p, i) => {
    const next = sorted[i + 1];
    const end = next ? addDaysISO(next.start, -1) : today;
    const length = next ? diffDays(p.start, next.start) : null;
    const totalDays = Math.max(1, diffDays(p.start, end) + 1);
    const symptomCounts: Record<string, number> = {};
    const moodCounts: Record<string, number> = {};
    let loggedDays = 0;
    let sleepSum = 0;
    let sleepN = 0;
    let waterSum = 0;
    let waterN = 0;
    let lowEnergyDays = 0;
    let highEnergyDays = 0;
    for (let d = 0; d < totalDays; d++) {
      const iso = addDaysISO(p.start, d);
      const log = logs[iso];
      if (!log) continue;
      loggedDays++;
      for (const s of log.symptoms) symptomCounts[s] = (symptomCounts[s] ?? 0) + 1;
      for (const m of log.moods) moodCounts[m] = (moodCounts[m] ?? 0) + 1;
      if (log.sleepHours != null) { sleepSum += log.sleepHours; sleepN++; }
      if (log.water != null) { waterSum += log.water; waterN++; }
      if (log.energy === 'low') lowEnergyDays++;
      if (log.energy === 'high') highEnergyDays++;
    }
    void avgCycle;
    return {
      index: i + 1,
      start: p.start,
      end,
      length,
      periodDays: periodDuration(p, today),
      loggedDays,
      symptomCounts,
      moodCounts,
      avgSleepHours: sleepN ? Math.round((sleepSum / sleepN) * 10) / 10 : null,
      avgWater: waterN ? Math.round((waterSum / waterN) * 10) / 10 : null,
      lowEnergyDays,
      highEnergyDays,
      isCurrent: i === sorted.length - 1,
    };
  });
}

export function loggingStreak(logs: Record<string, DayLog>, today: string = todayISO()): number {
  let streak = 0;
  let cursor = today;
  if (!logs[cursor]) cursor = addDaysISO(cursor, -1); // allow today to be unlogged
  while (logs[cursor]) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

// ─── validation ───────────────────────────────────────────────────────────

export interface PeriodValidation {
  ok: boolean;
  errors: string[];
}

export function validatePeriodInput(start: string, end: string | null, today: string = todayISO()): PeriodValidation {
  const errors: string[] = [];
  if (!start || !isValidISO(start)) errors.push('Please choose a valid start date.');
  if (end !== null && end !== '' && !isValidISO(end)) errors.push('Please choose a valid end date.');
  if (errors.length) return { ok: false, errors };
  if (start > today) errors.push('Period start cannot be in the future.');
  if (end) {
    if (end < start) errors.push('End date cannot be before the start date.');
    if (end > today) errors.push('End date cannot be in the future.');
    const dur = diffDays(start, end) + 1;
    if (dur > 15) errors.push('That period would be unusually long (over 15 days). Please check the dates.');
    if (dur < 1) errors.push('That date range is not possible. Please check the dates.');
  }
  return { ok: errors.length === 0, errors };
}

/** Sanity-check a whole history (used after import). */
export function validateHistory(periods: PeriodEntry[]): string[] {
  const problems: string[] = [];
  const sorted = sortPeriods(periods);
  for (const p of sorted) {
    if (!isValidISO(p.start)) problems.push(`Invalid start date: ${p.start}`);
    if (p.end && !isValidISO(p.end)) problems.push(`Invalid end date: ${p.end}`);
    if (p.end && p.end < p.start) problems.push(`Period ending before it starts (${p.start}).`);
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = diffDays(sorted[i - 1].start, sorted[i].start);
    if (gap < 10) problems.push(`Two periods only ${gap} days apart (${fmtShort(sorted[i - 1].start)} → ${fmtShort(sorted[i].start)}). One may be a duplicate.`);
    if (gap > 120) problems.push(`A gap of ${gap} days between periods — unusually long, but kept as-is.`);
  }
  return problems;
}
