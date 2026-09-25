// ─── Mira · local analytics (Pattern Lab, Body Weather, Insights) ────────────
// Plain functions over local data. Careful, non-diagnostic language throughout.

import { MOODS, PHYSICAL_SYMPTOMS, trackerLabel, type DayLog, type PeriodEntry } from '../types';
import {
  addDaysISO,
  averageCycleLength,
  averagePeriodLength,
  cycleLengths,
  diffDays,
  fmtShort,
  getCycleState,
  mean,
  sortPeriods,
  stddev,
  summarizeCycles,
  todayISO,
  type CycleState,
} from './cycle';

// ─── helpers ────────────────────────────────────────────────────────────────

export interface AnalyticsInput {
  periods: PeriodEntry[];
  logs: Record<string, DayLog>;
  assumedCycle: number;
  assumedPeriod: number;
  today?: string;
}

function ctxOf(input: AnalyticsInput) {
  const today = input.today ?? todayISO();
  const state = getCycleState(input.periods, input.assumedCycle, input.assumedPeriod, today);
  return { today, state };
}

/** Map each logged date → cycle day number (1-based) within its cycle. */
export function cycleDayMap(periods: PeriodEntry[], today: string = todayISO()): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = sortPeriods(periods).filter((p) => p.start <= today);
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].start;
    const next = sorted[i + 1]?.start;
    const end = next ? addDaysISO(next, -1) : today;
    const n = Math.min(diffDays(start, end) + 1, 120);
    for (let d = 0; d < n; d++) map.set(addDaysISO(start, d), d + 1);
  }
  return map;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── Body Weather ───────────────────────────────────────────────────────────

export interface WeatherItem {
  id: string;
  label: string;
  emoji: string;
  /** 0..100, higher = "better" except pain (higher = more pain) */
  score: number;
  level: string;
  blurb: string;
  hasData: boolean;
}

export interface BodyWeather {
  items: WeatherItem[];
  headline: string;
  subline: string;
  coverage: number; // logged days in last 7
}

const ENERGY_SCORE = { low: 20, normal: 60, high: 92 } as const;
const SLEEP_SCORE = { poor: 18, okay: 58, good: 90 } as const;
const STRESS_SCORE = { low: 88, medium: 55, high: 22 } as const;
const PAIN_SYMPTOMS = new Set(['cramps', 'headache', 'backache', 'breast', 'nausea', 'dizziness']);
const LOW_MOODS = new Set(['irritated', 'sad', 'anxious', 'low-energy', 'sensitive']);
const UP_MOODS = new Set(['happy', 'calm', 'energetic']);

export function buildBodyWeather(input: AnalyticsInput): BodyWeather {
  const { today } = ctxOf(input);
  const recent: DayLog[] = [];
  for (let i = 0; i < 7; i++) {
    const log = input.logs[addDaysISO(today, -i)];
    if (log) recent.push(log);
  }
  const coverage = recent.length;

  const energies = recent.filter((l) => l.energy).map((l) => ENERGY_SCORE[l.energy!]);
  const energyAvg = mean(energies);
  const sleeps = recent.filter((l) => l.sleep).map((l) => SLEEP_SCORE[l.sleep!]);
  const sleepAvg = mean(sleeps);
  const sleepHours = recent.filter((l) => l.sleepHours != null).map((l) => l.sleepHours!);
  const waters = recent.filter((l) => l.water != null).map((l) => l.water!);
  const stresses = recent.filter((l) => l.stress).map((l) => STRESS_SCORE[l.stress!]);
  const painDays = recent.filter((l) => l.symptoms.some((s) => PAIN_SYMPTOMS.has(s))).length;
  const lowMoodCount = recent.reduce((a, l) => a + l.moods.filter((m) => LOW_MOODS.has(m)).length, 0);
  const upMoodCount = recent.reduce((a, l) => a + l.moods.filter((m) => UP_MOODS.has(m)).length, 0);
  const moodTotal = lowMoodCount + upMoodCount;

  const levelOf = (score: number, labels: [string, string, string]): string =>
    score >= 70 ? labels[2] : score >= 40 ? labels[1] : labels[0];

  const energyScore = energyAvg ?? -1;
  const sleepScoreVal = sleepAvg ?? -1;
  const waterAvg = mean(waters);
  const waterScore = waterAvg == null ? -1 : Math.min(100, Math.round((waterAvg / 8) * 100));
  const stressScore = mean(stresses) ?? -1;
  const painScore = recent.length ? Math.round((painDays / 7) * 100) : -1;
  const moodScore = moodTotal ? Math.round((upMoodCount / moodTotal) * 100) : -1;

  const items: WeatherItem[] = [
    {
      id: 'energy',
      label: 'Energy',
      emoji: energyScore >= 70 ? '☀️' : energyScore >= 40 ? '⛅' : '🌧️',
      score: energyScore,
      level: energyScore < 0 ? 'Unknown' : levelOf(energyScore, ['Low', 'Mixed', 'High']),
      blurb: energyScore < 0 ? 'Log energy in check-in to see this.' : energyScore >= 70 ? 'You have mostly logged solid energy.' : energyScore >= 40 ? 'Energy has been up and down.' : 'You have mostly logged low energy.',
      hasData: energyScore >= 0,
    },
    {
      id: 'mood',
      label: 'Mood',
      emoji: moodScore >= 65 ? '🌤️' : moodScore >= 40 ? '🌥️' : '🌧️',
      score: moodScore,
      level: moodScore < 0 ? 'Unknown' : levelOf(moodScore, ['Heavy', 'Mixed', 'Bright']),
      blurb: moodScore < 0 ? 'Log a mood to see this.' : moodScore >= 65 ? 'Uplifting moods dominate your logs.' : moodScore >= 40 ? 'A mix of moods lately.' : 'Heavier moods show up often in your logs.',
      hasData: moodScore >= 0,
    },
    {
      id: 'pain',
      label: 'Cramps & pain',
      emoji: painScore <= 15 ? '🍃' : painScore <= 40 ? '🌦️' : '⛈️',
      score: painScore,
      level: painScore < 0 ? 'Unknown' : painScore <= 15 ? 'Calm' : painScore <= 40 ? 'Present' : 'Stormy',
      blurb: painScore < 0 ? 'No recent logs to read.' : painDays === 0 ? 'No pain symptoms logged in the last 7 days.' : `Pain symptoms on ${painDays} of the last 7 days.`,
      hasData: painScore >= 0,
    },
    {
      id: 'sleep',
      label: 'Sleep',
      emoji: sleepScoreVal >= 70 ? '🌙' : sleepScoreVal >= 40 ? '🌗' : '🌑',
      score: sleepScoreVal,
      level: sleepScoreVal < 0 ? 'Unknown' : levelOf(sleepScoreVal, ['Rough', 'Okay', 'Restful']),
      blurb: sleepScoreVal < 0
        ? 'Log sleep to see this.'
        : `Logged sleep quality: ${levelOf(sleepScoreVal, ['rough', 'okay', 'restful']).toLowerCase()}${mean(sleepHours) != null ? ` · ~${(mean(sleepHours) ?? 0).toFixed(1)}h` : ''}.`,
      hasData: sleepScoreVal >= 0,
    },
    {
      id: 'hydration',
      label: 'Hydration',
      emoji: waterScore >= 70 ? '💧' : waterScore >= 40 ? '💦' : '🏜️',
      score: waterScore,
      level: waterScore < 0 ? 'Unknown' : levelOf(waterScore, ['Low', 'Moderate', 'Good']),
      blurb: waterScore < 0 ? 'Log water to see this.' : `About ${waterAvg!.toFixed(1)} glasses a day in your logs.`,
      hasData: waterScore >= 0,
    },
    {
      id: 'stress',
      label: 'Stress',
      emoji: stressScore >= 70 ? '🍃' : stressScore >= 40 ? '🌬️' : '🌪️',
      score: stressScore,
      level: stressScore < 0 ? 'Unknown' : stressScore >= 70 ? 'Low' : stressScore >= 40 ? 'Moderate' : 'High',
      blurb: stressScore < 0 ? 'Log stress to see this.' : stressScore >= 70 ? 'Mostly low stress in your logs.' : stressScore >= 40 ? 'Some stressful days logged.' : 'High stress shows up often in your logs.',
      hasData: stressScore >= 0,
    },
  ];

  const withData = items.filter((i) => i.hasData);
  let headline = 'Not enough sky to read yet';
  let subline = 'Do a quick check-in and your Body Weather will appear here.';
  if (withData.length >= 2) {
    const good = withData.filter((i) => (i.id === 'pain' ? i.score <= 20 : i.score >= 65)).length;
    const rough = withData.filter((i) => (i.id === 'pain' ? i.score > 40 : i.score >= 0 && i.score < 40)).length;
    if (rough >= 3) { headline = 'Stormy skies — be extra gentle'; subline = 'Several signals look rough in your recent logs.'; }
    else if (rough >= 1) { headline = 'Partly cloudy with bright spells'; subline = 'Mostly steady, with a few rough patches in your logs.'; }
    else if (good >= 4) { headline = 'Clear skies and steady winds'; subline = 'Your recent logs look balanced overall.'; }
    else { headline = 'Calm with passing clouds'; subline = 'Nothing dramatic in your recent logs.'; }
  }

  return { items, headline, subline, coverage };
}

// ─── Pattern Lab ────────────────────────────────────────────────────────────

export interface Pattern {
  id: string;
  category: 'cycles' | 'symptoms' | 'mood' | 'sleep' | 'energy' | 'habits';
  emoji: string;
  title: string;
  detail: string;
  strength: 'strong' | 'moderate' | 'early';
}

export function detectPatterns(input: AnalyticsInput): Pattern[] {
  const { today } = ctxOf(input);
  const patterns: Pattern[] = [];
  const logs = Object.values(input.logs);
  const summaries = summarizeCycles(input.periods, input.logs, input.assumedCycle, today);
  const closed = summaries.filter((s) => s.length != null);
  const lens = cycleLengths(input.periods).slice(-6);

  // 1 · cycle regularity
  if (lens.length >= 2) {
    const min = Math.min(...lens);
    const max = Math.max(...lens);
    const sd = stddev(lens);
    patterns.push({
      id: 'cycle-range',
      category: 'cycles',
      emoji: '🔁',
      title: `Your last ${lens.length} cycles were ${min}–${max} days.`,
      detail: sd <= 2
        ? `That's very consistent (variation ±${sd.toFixed(1)} days). Estimates based on your history should be fairly reliable — though cycles can still surprise you.`
        : sd <= 5
          ? `Moderately regular (variation ±${sd.toFixed(1)} days). Your estimates come with a wider window because of this natural variation.`
          : `Quite variable (variation ±${sd.toFixed(1)} days). Wider estimate windows are used for you. If big swings are new or worry you, consider mentioning them to a clinician.`,
      strength: lens.length >= 4 && sd <= 3 ? 'strong' : 'moderate',
    });
  } else if (input.periods.length >= 1 && logs.length > 0) {
    patterns.push({
      id: 'cycle-early',
      category: 'cycles',
      emoji: '🌱',
      title: 'Cycle history is just beginning.',
      detail: 'Log one more period and Mira can start comparing cycle lengths. Until then, estimates use your assumed cycle length.',
      strength: 'early',
    });
  }

  // 2 · period duration
  const durations = summaries.map((s) => s.periodDays).filter((d) => d >= 1 && d <= 15);
  if (durations.length >= 2) {
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    patterns.push({
      id: 'period-duration',
      category: 'cycles',
      emoji: '🩸',
      title: min === max
        ? `Your periods have consistently lasted ${min} days.`
        : `Your periods have lasted ${min}–${max} days.`,
      detail: `Based on your last ${durations.length} logged period${durations.length > 1 ? 's' : ''}. Small shifts of a day or two are common.`,
      strength: durations.length >= 3 ? 'moderate' : 'early',
    });
  }

  // need cycle-day mapping for timing patterns
  const dayMap = cycleDayMap(input.periods, today);
  const occurrences = (id: string): number[] => {
    const days: number[] = [];
    for (const log of logs) {
      if (log.symptoms.includes(id) || log.moods.includes(id)) {
        const d = dayMap.get(log.date);
        if (d != null) days.push(d);
      }
    }
    return days.sort((a, b) => a - b);
  };

  // 3 · cramps alongside periods
  const cyclesWithCramps = closed.filter((s) => (s.symptomCounts['cramps'] ?? 0) > 0).length;
  // also count current cycle
  const current = summaries.find((s) => s.isCurrent);
  const totalCyclesConsidered = closed.length + (current && !current.length ? 1 : 0);
  const crampCycles = cyclesWithCramps + (current && !current.length && (current.symptomCounts['cramps'] ?? 0) > 0 ? 1 : 0);
  if (totalCyclesConsidered >= 2 && crampCycles > 0) {
    patterns.push({
      id: 'cramps-frequency',
      category: 'symptoms',
      emoji: '🌊',
      title: `Cramps were reported in ${crampCycles} of your last ${totalCyclesConsidered} cycles.`,
      detail: crampCycles === totalCyclesConsidered
        ? 'Cramps appear in every cycle you have logged. Heat, rest and gentle movement help many people — and severe pain is always worth discussing with a clinician.'
        : 'Cramps show up in some cycles but not others in your logs. That ebb and flow is common.',
      strength: totalCyclesConsidered >= 3 ? 'moderate' : 'early',
    });
  }

  // 4 · symptom timing clusters (median + spread)
  for (const def of PHYSICAL_SYMPTOMS) {
    const days = occurrences(def.id);
    if (days.length < 4) continue;
    const med = median(days);
    // check clustering: share of occurrences within ±2 of median
    const near = days.filter((d) => Math.abs(d - med) <= 2).length / days.length;
    if (near >= 0.6) {
      const lo = Math.max(1, Math.round(med - 2));
      const hi = Math.round(med + 2);
      patterns.push({
        id: `timing-${def.id}`,
        category: 'symptoms',
        emoji: def.emoji,
        title: `You've often logged ${def.label.toLowerCase()} around day ${lo}–${hi}.`,
        detail: `${days.length} logs of ${def.label.toLowerCase()} cluster around cycle day ${Math.round(med)} in your history. This is a pattern in your logs, not a prediction — and it doesn't mean the timing causes the symptom.`,
        strength: days.length >= 6 && near >= 0.75 ? 'strong' : 'moderate',
      });
    }
    if (patterns.length > 14) break;
  }

  // 5 · mood around period vs rest
  const periodDaysLogged = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d <= input.assumedPeriod;
  });
  const otherDaysLogged = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d > input.assumedPeriod;
  });
  const lowRate = (arr: DayLog[]) => (arr.length ? arr.filter((l) => l.moods.some((m) => LOW_MOODS.has(m))).length / arr.length : 0);
  if (periodDaysLogged.length >= 3 && otherDaysLogged.length >= 5) {
    const rPeriod = lowRate(periodDaysLogged);
    const rOther = lowRate(otherDaysLogged);
    if (rPeriod - rOther >= 0.3) {
      patterns.push({
        id: 'mood-period',
        category: 'mood',
        emoji: '🌧️',
        title: 'Heavier moods cluster around your period days.',
        detail: `You've logged low or sensitive moods on ${Math.round(rPeriod * 100)}% of period days vs ${Math.round(rOther * 100)}% of other days. Logged together often — but that doesn't necessarily mean one causes the other.`,
        strength: periodDaysLogged.length >= 6 ? 'moderate' : 'early',
      });
    }
  }

  // 6 · sleep dip early in cycle
  const earlySleep = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d <= 3 && l.sleepHours != null;
  }).map((l) => l.sleepHours!);
  const restSleep = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d > 3 && l.sleepHours != null;
  }).map((l) => l.sleepHours!);
  if (earlySleep.length >= 3 && restSleep.length >= 5) {
    const eAvg = mean(earlySleep)!;
    const rAvg = mean(restSleep)!;
    if (rAvg - eAvg >= 0.75) {
      patterns.push({
        id: 'sleep-dip',
        category: 'sleep',
        emoji: '🌙',
        title: 'Sleep you log tends to be shorter at the start of your cycle.',
        detail: `About ${eAvg.toFixed(1)}h on days 1–3 vs ${rAvg.toFixed(1)}h on other days in your logs. A wind-down routine in that window might be worth trying.`,
        strength: earlySleep.length >= 5 ? 'moderate' : 'early',
      });
    }
  }

  // 6b · poor sleep quality overall frequency
  const poorSleep = logs.filter((l) => l.sleep === 'poor').length;
  const sleepLogs = logs.filter((l) => l.sleep).length;
  if (sleepLogs >= 7 && poorSleep / sleepLogs >= 0.4) {
    patterns.push({
      id: 'sleep-quality',
      category: 'sleep',
      emoji: '😴',
      title: `You've marked sleep as "poor" ${poorSleep} times recently.`,
      detail: `That's ${Math.round((poorSleep / sleepLogs) * 100)}% of your sleep logs. If poor sleep persists, it's worth mentioning to a clinician — rest affects everything.`,
      strength: 'moderate',
    });
  }

  // 7 · energy dip
  const earlyLow = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d <= input.assumedPeriod && l.energy === 'low';
  }).length;
  const periodEnergyLogs = logs.filter((l) => {
    const d = dayMap.get(l.date);
    return d != null && d <= input.assumedPeriod && l.energy;
  }).length;
  if (periodEnergyLogs >= 4 && earlyLow / periodEnergyLogs >= 0.6) {
    patterns.push({
      id: 'energy-dip',
      category: 'energy',
      emoji: '🪫',
      title: 'You usually report lower energy during your period.',
      detail: `Low energy on ${earlyLow} of ${periodEnergyLogs} logged period days. Planning lighter days there — if you can — lines up with your own history.`,
      strength: periodEnergyLogs >= 7 ? 'strong' : 'moderate',
    });
  }

  // 8 · co-occurrence: poor sleep + headache (same log)
  const poorSleepLogs = logs.filter((l) => l.sleep === 'poor' || (l.sleepHours != null && l.sleepHours < 6));
  const headacheOverall = logs.filter((l) => l.symptoms.includes('headache')).length / Math.max(1, logs.length);
  if (poorSleepLogs.length >= 4) {
    const withHeadache = poorSleepLogs.filter((l) => l.symptoms.includes('headache')).length;
    const rate = withHeadache / poorSleepLogs.length;
    if (rate >= 0.4 && rate >= headacheOverall * 1.5 && withHeadache >= 2) {
      patterns.push({
        id: 'co-sleep-headache',
        category: 'symptoms',
        emoji: '🔗',
        title: "You've logged headaches alongside poor sleep several times.",
        detail: `Headaches appear in ${Math.round(rate * 100)}% of your poor-sleep logs vs ${Math.round(headacheOverall * 100)}% overall. There's a pattern in your logged data — but this doesn't necessarily mean one causes the other.`,
        strength: withHeadache >= 4 ? 'moderate' : 'early',
      });
    }
  }

  // 9 · high stress + headache
  const stressLogs = logs.filter((l) => l.stress === 'high');
  if (stressLogs.length >= 4) {
    const withHeadache = stressLogs.filter((l) => l.symptoms.includes('headache') || l.symptoms.includes('cramps')).length;
    if (withHeadache / stressLogs.length >= 0.5) {
      patterns.push({
        id: 'co-stress-pain',
        category: 'symptoms',
        emoji: '🔗',
        title: "High-stress days often include pain symptoms in your logs.",
        detail: `${withHeadache} of ${stressLogs.length} high-stress logs also include headaches or cramps. Co-occurrence only — stress and pain often travel together without one causing the other.`,
        strength: 'early',
      });
    }
  }

  // 10 · logging habit
  let last14 = 0;
  for (let i = 0; i < 14; i++) if (input.logs[addDaysISO(today, -i)]) last14++;
  if (last14 >= 10) {
    patterns.push({
      id: 'habit-strong',
      category: 'habits',
      emoji: '🌟',
      title: `You've logged ${last14} of the last 14 days.`,
      detail: 'Consistent logging is what makes every estimate and pattern here more trustworthy. Nice rhythm.',
      strength: 'strong',
    });
  }

  // order: strong → moderate → early, capped
  const rank = { strong: 0, moderate: 1, early: 2 };
  return patterns.sort((a, b) => rank[a.strength] - rank[b.strength]).slice(0, 12);
}

// ─── Insight cards (dashboard) ──────────────────────────────────────────────

export interface Insight {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  tone: 'info' | 'good' | 'watch';
}

export function buildInsights(input: AnalyticsInput): Insight[] {
  const { today, state } = ctxOf(input);
  const insights: Insight[] = [];
  const logs = Object.values(input.logs);
  const summaries = summarizeCycles(input.periods, input.logs, input.assumedCycle, today);
  const current = summaries.find((s) => s.isCurrent);

  // data sufficiency first
  if (!input.periods.length) {
    insights.push({
      id: 'no-period',
      emoji: '🌱',
      title: "Log your first period to begin.",
      detail: 'Tap the + button or open the calendar and mark a period day. Everything stays on this device.',
      tone: 'info',
    });
    return insights;
  }
  if (logs.length < 3) {
    insights.push({
      id: 'thin-data',
      emoji: '📝',
      title: "You haven't logged enough data yet for reliable patterns.",
      detail: 'A 15-second check-in each day is enough. Patterns unlock after roughly a week of logs.',
      tone: 'info',
    });
  }

  // period timing
  if (state.daysUntilPeriod != null && state.daysUntilPeriod >= 0 && state.daysUntilPeriod <= 3) {
    insights.push({
      id: 'period-soon',
      emoji: '🔔',
      title: state.daysUntilPeriod === 0 ? 'Your estimated period is today.' : `Estimated period in ${state.daysUntilPeriod} day${state.daysUntilPeriod === 1 ? '' : 's'}.`,
      detail: `Window: ${fmtShort(state.nextWindow!.from)} – ${fmtShort(state.nextWindow!.to)} · ${state.confidence} confidence. Estimates, not guarantees.`,
      tone: 'watch',
    });
  }
  if (state.lateBy >= 3) {
    insights.push({
      id: 'late',
      emoji: '⏳',
      title: `Estimated period was ${state.lateBy} days ago.`,
      detail: 'Cycles vary with stress, travel, illness and more. If this is unusual for you, consider taking note of it.',
      tone: 'watch',
    });
  }

  // fertile window now?
  if (state.fertileWindow && today >= state.fertileWindow.from && today <= state.fertileWindow.to) {
    insights.push({
      id: 'fertile-now',
      emoji: '✨',
      title: 'You may be in your estimated fertile window.',
      detail: `Roughly ${fmtShort(state.fertileWindow.from)} – ${fmtShort(state.fertileWindow.to)}. This is an estimate — never use it for contraception.`,
      tone: 'info',
    });
  }

  // consistency praise
  const lens = cycleLengths(input.periods).slice(-4);
  if (lens.length >= 3 && stddev(lens) <= 2) {
    insights.push({
      id: 'consistent',
      emoji: '📏',
      title: 'Your cycle has been fairly consistent recently.',
      detail: `Last ${lens.length} cycles: ${lens.join(' · ')} days. That steadiness makes estimates more meaningful.`,
      tone: 'good',
    });
  }

  // symptom frequency this cycle vs history
  if (current && summaries.length >= 2) {
    const past = summaries.filter((s) => s !== current);
    for (const def of PHYSICAL_SYMPTOMS.slice(0, 8)) {
      const cur = current.symptomCounts[def.id] ?? 0;
      const pastAvg = mean(past.map((s) => s.symptomCounts[def.id] ?? 0)) ?? 0;
      if (cur >= pastAvg + 2 && cur >= 3) {
        insights.push({
          id: `freq-${def.id}`,
          emoji: def.emoji,
          title: `You've logged ${def.label.toLowerCase()} more this cycle.`,
          detail: `${cur} time${cur === 1 ? '' : 's'} so far vs ~${pastAvg.toFixed(1)} in past cycles. Just an observation from your logs.`,
          tone: 'watch',
        });
        break;
      }
    }
  }

  // streak
  let streak = 0;
  let cursor = input.logs[today] ? today : addDaysISO(today, -1);
  while (input.logs[cursor]) { streak++; cursor = addDaysISO(cursor, -1); }
  if (streak >= 3) {
    insights.push({
      id: 'streak',
      emoji: '🔥',
      title: `${streak}-day gentle streak.`,
      detail: 'Small daily logs compound into genuinely useful patterns. No pressure to be perfect.',
      tone: 'good',
    });
  }

  return insights.slice(0, 4);
}

// ─── Symptom forecast (likelihood windows from history) ─────────────────────

export interface SymptomForecast {
  symptomId: string;
  label: string;
  emoji: string;
  fromDay: number;
  toDay: number;
  frequency: string;
}

export function forecastSymptoms(input: AnalyticsInput): SymptomForecast[] {
  const { today } = ctxOf(input);
  const dayMap = cycleDayMap(input.periods, today);
  const out: SymptomForecast[] = [];
  for (const def of [...PHYSICAL_SYMPTOMS, ...MOODS]) {
    const days: number[] = [];
    for (const log of Object.values(input.logs)) {
      if (log.symptoms.includes(def.id) || log.moods.includes(def.id)) {
        const d = dayMap.get(log.date);
        if (d != null) days.push(d);
      }
    }
    if (days.length < 4) continue;
    const med = median(days.sort((a, b) => a - b));
    const near = days.filter((d) => Math.abs(d - med) <= 2).length / days.length;
    if (near >= 0.6) {
      out.push({
        symptomId: def.id,
        label: def.label,
        emoji: def.emoji,
        fromDay: Math.max(1, Math.round(med - 2)),
        toDay: Math.round(med + 2),
        frequency: near >= 0.8 ? 'often' : 'sometimes',
      });
    }
    if (out.length >= 4) break;
  }
  return out;
}

// ─── Gentle forecast (14-day outlook) ───────────────────────────────────────

export interface ForecastDay {
  date: string;
  label: string;
  kinds: Array<'period' | 'fertile' | 'ovulation' | 'symptom'>;
  symptomEmojis: string[];
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

export function gentleForecast(input: AnalyticsInput, days = 14): ForecastDay[] {
  const { today } = ctxOf(input);
  const state = getCycleState(input.periods, input.assumedCycle, input.assumedPeriod, today);
  const forecasts = forecastSymptoms(input);
  const dayMap = cycleDayMap(input.periods, today);
  void dayMap;
  const out: ForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(today, i);
    const kinds: ForecastDay['kinds'] = [];
    const symptomEmojis: string[] = [];
    // project cycle day
    let cycleDay: number | null = null;
    if (state.currentStart) {
      const raw = diffDays(state.currentStart, date) + 1;
      cycleDay = raw > 0 ? ((raw - 1) % state.avgCycle) + 1 : null;
    }
    if (state.nextWindow && date >= state.nextWindow.from && date <= state.nextWindow.to) kinds.push('period');
    if (state.fertileWindow && date >= state.fertileWindow.from && date <= state.fertileWindow.to) kinds.push('fertile');
    if (state.ovulationEstimate === date) kinds.push('ovulation');
    if (cycleDay != null) {
      for (const f of forecasts) {
        if (cycleDay >= f.fromDay && cycleDay <= f.toDay) {
          kinds.push('symptom');
          symptomEmojis.push(f.emoji);
        }
      }
    }
    const note = kinds.includes('period')
      ? 'Period possible'
      : kinds.includes('ovulation')
        ? 'Ovulation estimate'
        : kinds.includes('fertile')
          ? 'Fertile window (est.)'
          : kinds.includes('symptom')
            ? 'Often logged here'
            : '—';
    out.push({
      date,
      label: i === 0 ? 'Today' : fmtShort(date),
      kinds: [...new Set(kinds)],
      symptomEmojis: [...new Set(symptomEmojis)].slice(0, 3),
      confidence: state.confidence,
      note,
    });
  }
  return out;
}

export function stateFor(input: AnalyticsInput): CycleState {
  return ctxOf(input).state;
}

export { averageCycleLength, averagePeriodLength };
