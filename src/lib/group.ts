// Accountability group layout inside a shared space:
//
//   <shared>/members/<login>/habits/<id>.json               mirrored habit meta
//   <shared>/members/<login>/checkins/<id>/<YYYY-MM>.json   mirrored month files
//   <shared>/status/<login>.json                            today summary (what the Group tab shows)
//
// Every member writes ONLY under paths containing their own login, so concurrent
// members never rewrite each other's files. The Group tab polls `status/` (one
// flat directory) — nested changes don't bump a parent's mtime, so the summary
// file is what makes polling cheap and reliable.
import { listFiles, readJson, writeJson } from './store';
import { saveAllMonths, saveHabit, type Checkins, type Habit } from './habits';
import { computeStats } from './stats';
import { today, type Ymd } from './dates';

export interface MemberHabitStatus {
  id: string;
  name: string;
  color: string;
  targetPerWeek: number;
  doneToday: boolean;
  currentStreak: number;
  bestStreak: number;
  weekDone: number;
}

export interface MemberStatus {
  login: string;
  /** Local day the summary describes (members may be in different time zones). */
  date: Ymd;
  updatedAt: string;
  habits: MemberHabitStatus[];
}

const join = (...p: string[]) => p.join('/').replace(/\/+/g, '/');

export const memberRoot = (shared: string, login: string) => join(shared, 'members', login);
export const statusDir = (shared: string) => join(shared, 'status');
export const statusPath = (shared: string, login: string) => join(statusDir(shared), `${login}.json`);

/** A login is used as a folder name — keep it filesystem-safe. */
export function safeLogin(login: string | undefined): string {
  const clean = (login ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  return clean || 'someone';
}

export function buildStatus(login: string, habits: Habit[], checkins: Checkins): MemberStatus {
  const now = today();
  return {
    login,
    date: now,
    updatedAt: new Date().toISOString(),
    habits: habits
      .filter((h) => !h.archived)
      .map((h) => {
        const s = computeStats(checkins[h.id] ?? new Set(), now);
        return {
          id: h.id,
          name: h.name,
          color: h.color,
          targetPerWeek: h.targetPerWeek,
          doneToday: s.doneToday,
          currentStreak: s.currentStreak,
          bestStreak: s.bestStreak,
          weekDone: s.weekDone,
        };
      }),
  };
}

export async function writeStatus(shared: string, login: string, habits: Habit[], checkins: Checkins): Promise<void> {
  await writeJson(statusPath(shared, login), buildStatus(login, habits, checkins));
}

/** Full mirror of my private data into my member folder (on join and re-open). */
export async function mirrorAll(shared: string, login: string, habits: Habit[], checkins: Checkins): Promise<void> {
  const root = memberRoot(shared, login);
  await Promise.all(
    habits.map(async (h) => {
      await saveHabit(root, h);
      await saveAllMonths(root, h.id, checkins[h.id] ?? new Set());
    }),
  );
  await writeStatus(shared, login, habits, checkins);
}

export async function loadStatuses(shared: string): Promise<MemberStatus[]> {
  const dir = statusDir(shared);
  const files = await listFiles(dir, '.json');
  const all = await Promise.all(files.map((f) => readJson<MemberStatus | null>(join(dir, f), null)));
  return all
    .filter((s): s is MemberStatus => !!s && typeof s.login === 'string' && Array.isArray(s.habits))
    .sort((a, b) => a.login.localeCompare(b.login));
}
