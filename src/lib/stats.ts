// Streaks and completion rates, computed from a habit's set of checked days.
import { addDays, startOfWeek, today, weekDays, type Ymd } from './dates';

export interface HabitStats {
  /** Consecutive checked days ending today (or yesterday, if today is still open). */
  currentStreak: number;
  bestStreak: number;
  /** Checked days in the last 30 days, 0–100. */
  rate30: number;
  /** Check-ins in the current ISO week (Mon–today). */
  weekDone: number;
  doneToday: boolean;
  total: number;
}

export function computeStats(days: ReadonlySet<Ymd>, now: Ymd = today()): HabitStats {
  const doneToday = days.has(now);

  // Current streak: walk back from today; an unchecked today doesn't break the
  // streak yet (the day isn't over), so start from yesterday in that case.
  let currentStreak = 0;
  let cursor = doneToday ? now : addDays(now, -1);
  while (days.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Best streak: scan sorted days for the longest run of consecutive dates.
  const sorted = [...days].filter((d) => d <= now).sort();
  let bestStreak = 0;
  let run = 0;
  let prev: Ymd | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
    prev = d;
  }

  let hit30 = 0;
  for (let i = 0; i < 30; i += 1) if (days.has(addDays(now, -i))) hit30 += 1;

  const weekDone = weekDays(startOfWeek(now)).filter((d) => d <= now && days.has(d)).length;

  return {
    currentStreak,
    bestStreak,
    rate30: Math.round((hit30 / 30) * 100),
    weekDone,
    doneToday,
    total: sorted.length,
  };
}
