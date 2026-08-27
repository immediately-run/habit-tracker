// Habit + check-in model and its on-disk layout.
//
//   <root>/config.json                         app config (group space id, seeded flag)
//   <root>/habits/<habitId>.json               one habit's metadata
//   <root>/checkins/<habitId>/<YYYY-MM>.json   { days: [1, 3, 5] } — one month per file
//
// One file per habit per month keeps every write small and, in a shared space,
// every member only ever writes under their own subfolder (last-write-wins safe).
import fs from 'fs';
import { listFiles, readJson, writeJson, newId } from './store';
import { dayOfMonth, monthKey, type Ymd } from './dates';

export interface Habit {
  id: string;
  name: string;
  /** Palette id from src/data/palette.ts. */
  color: string;
  /** Target check-ins per week, 1–7. */
  targetPerWeek: number;
  archived: boolean;
  /** ISO timestamp. */
  created: string;
}

/** Days checked, as a set of "YYYY-MM-DD" strings, keyed by habit id. */
export type Checkins = Record<string, ReadonlySet<Ymd>>;

export interface AppConfig {
  seeded?: boolean;
  groupSpaceId?: string;
  groupName?: string;
  showArchived?: boolean;
}

interface MonthFile {
  days: number[];
}

const join = (...p: string[]) => p.join('/').replace(/\/+/g, '/');

export const configPath = (root: string) => join(root, 'config.json');
export const habitPath = (root: string, id: string) => join(root, 'habits', `${id}.json`);
export const checkinsDir = (root: string, id: string) => join(root, 'checkins', id);
export const monthPath = (root: string, id: string, month: string) =>
  join(checkinsDir(root, id), `${month}.json`);

export function newHabit(input: Pick<Habit, 'name' | 'color' | 'targetPerWeek'>): Habit {
  return {
    id: newId(),
    name: input.name.trim(),
    color: input.color,
    targetPerWeek: Math.min(7, Math.max(1, Math.round(input.targetPerWeek))),
    archived: false,
    created: new Date().toISOString(),
  };
}

// ── reading ────────────────────────────────────────────────────────────────────

export async function loadConfig(root: string): Promise<AppConfig> {
  return readJson<AppConfig>(configPath(root), {});
}

export async function loadHabits(root: string): Promise<Habit[]> {
  const names = await listFiles(join(root, 'habits'), '.json');
  const habits = await Promise.all(
    names.map((n) => readJson<Habit | null>(join(root, 'habits', n), null)),
  );
  return habits
    .filter((h): h is Habit => !!h && typeof h.id === 'string' && typeof h.name === 'string')
    .sort((a, b) => a.created.localeCompare(b.created));
}

/** Every checked day of one habit, across all its month files. */
export async function loadCheckins(root: string, habitId: string): Promise<Set<Ymd>> {
  const dir = checkinsDir(root, habitId);
  const months = await listFiles(dir, '.json');
  const out = new Set<Ymd>();
  await Promise.all(
    months.map(async (file) => {
      const month = file.replace(/\.json$/, '');
      const data = await readJson<MonthFile>(join(dir, file), { days: [] });
      for (const d of data.days ?? []) out.add(`${month}-${String(d).padStart(2, '0')}`);
    }),
  );
  return out;
}

export async function loadAll(root: string): Promise<{ habits: Habit[]; checkins: Checkins }> {
  const habits = await loadHabits(root);
  const sets = await Promise.all(habits.map((h) => loadCheckins(root, h.id)));
  const checkins: Checkins = {};
  habits.forEach((h, i) => (checkins[h.id] = sets[i]));
  return { habits, checkins };
}

// ── writing ────────────────────────────────────────────────────────────────────

export async function saveConfig(root: string, config: AppConfig): Promise<void> {
  await writeJson(configPath(root), config);
}

export async function saveHabit(root: string, habit: Habit): Promise<void> {
  await writeJson(habitPath(root, habit.id), habit);
}

/** Rewrite one month file from the in-memory set. */
export async function saveMonth(root: string, habitId: string, month: string, days: ReadonlySet<Ymd>): Promise<void> {
  const inMonth = [...days].filter((d) => monthKey(d) === month).map(dayOfMonth).sort((a, b) => a - b);
  await writeJson(monthPath(root, habitId, month), { days: inMonth } satisfies MonthFile);
}

/** Write every month file a habit has (used when mirroring into a group space). */
export async function saveAllMonths(root: string, habitId: string, days: ReadonlySet<Ymd>): Promise<void> {
  const months = new Set([...days].map(monthKey));
  await Promise.all([...months].map((m) => saveMonth(root, habitId, m, days)));
}

export async function deleteHabitFiles(root: string, habitId: string): Promise<void> {
  try {
    await fs.promises.unlink(habitPath(root, habitId));
  } catch {
    /* already gone */
  }
  try {
    await fs.promises.rm(checkinsDir(root, habitId), { recursive: true, force: true });
  } catch {
    /* already gone or rm unsupported — fall back to per-file unlink */
    const dir = checkinsDir(root, habitId);
    for (const f of await listFiles(dir)) {
      try {
        await fs.promises.unlink(join(dir, f));
      } catch {
        /* ignore */
      }
    }
  }
}

/** Remove every habit + check-in file under `root` (config is kept). */
export async function wipeData(root: string): Promise<void> {
  const habits = await listFiles(join(root, 'habits'), '.json');
  await Promise.all(habits.map((n) => deleteHabitFiles(root, n.replace(/\.json$/, ''))));
}

export function toggleDay(set: ReadonlySet<Ymd>, day: Ymd): Set<Ymd> {
  const next = new Set(set);
  if (next.has(day)) next.delete(day);
  else next.add(day);
  return next;
}
