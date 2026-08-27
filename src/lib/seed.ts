// First-run sample data so the heatmap and streaks have something to show.
import { addDays, today, type Ymd } from './dates';
import { newHabit, type Checkins, type Habit } from './habits';

const SAMPLES: Array<{ name: string; color: string; targetPerWeek: number; p: number }> = [
  { name: 'Read 20 minutes', color: 'violet', targetPerWeek: 7, p: 0.8 },
  { name: 'Morning walk', color: 'teal', targetPerWeek: 5, p: 0.65 },
  { name: 'Write in journal', color: 'amber', targetPerWeek: 3, p: 0.45 },
];

/** Deterministic-enough pseudo random so a reseed looks similar but not identical. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function buildSampleData(historyDays = 22): { habits: Habit[]; checkins: Checkins } {
  const rand = rng(Date.now());
  const now = today();
  const habits: Habit[] = [];
  const checkins: Checkins = {};
  SAMPLES.forEach((s, i) => {
    const habit = newHabit(s);
    // Keep creation order stable (newId is time-based; ids are sortable anyway).
    habit.created = new Date(Date.now() - (SAMPLES.length - i) * 1000).toISOString();
    habits.push(habit);
    const days = new Set<Ymd>();
    for (let d = historyDays; d >= 1; d -= 1) {
      if (rand() < s.p) days.add(addDays(now, -d));
    }
    // Make the first sample "hot": a live streak of the last few days.
    if (i === 0) for (let d = 1; d <= 5; d += 1) days.add(addDays(now, -d));
    checkins[habit.id] = days;
  });
  return { habits, checkins };
}
