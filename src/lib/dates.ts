// Calendar helpers. All dates are local-time "YYYY-MM-DD" strings (a habit day is
// the user's local day), so nothing here touches UTC.

export type Ymd = string; // "2026-08-27"

const pad = (n: number) => String(n).padStart(2, '0');

export function toYmd(d: Date): Ymd {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromYmd(ymd: Ymd): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const today = (): Ymd => toYmd(new Date());

export function addDays(ymd: Ymd, days: number): Ymd {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** "YYYY-MM" — the check-in file a day lives in. */
export const monthKey = (ymd: Ymd): string => ymd.slice(0, 7);

/** Day-of-month as a number (1–31). */
export const dayOfMonth = (ymd: Ymd): number => Number(ymd.slice(8, 10));

export const isFuture = (ymd: Ymd): boolean => ymd > today();

/** 0 = Monday … 6 = Sunday (ISO week, Monday first). */
export function weekdayIndex(ymd: Ymd): number {
  return (fromYmd(ymd).getDay() + 6) % 7;
}

/** Monday of the ISO week containing `ymd`. */
export function startOfWeek(ymd: Ymd): Ymd {
  return addDays(ymd, -weekdayIndex(ymd));
}

/** The 7 days of the ISO week starting at `monday`. */
export function weekDays(monday: Ymd): Ymd[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "27 Aug" style label. */
export function shortDate(ymd: Ymd): string {
  const d = fromYmd(ymd);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** "Mon 27 Aug" style label. */
export function longDate(ymd: Ymd): string {
  return `${WEEKDAY_SHORT[weekdayIndex(ymd)]} ${shortDate(ymd)}`;
}
