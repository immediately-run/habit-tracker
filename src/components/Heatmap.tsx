import { useEffect, useRef } from 'react';
import { addDays, fromYmd, MONTH_SHORT, startOfWeek, type Ymd } from '../lib/dates';

interface HeatmapProps {
  days: ReadonlySet<Ymd>;
  now: Ymd;
  color: string;
  /** Tap a past day to toggle it (omit for read-only). */
  onToggle?: (day: Ymd) => void;
}

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const WEEKS = 52;
const LEFT = 30;
const TOP = 18;
const DOW = ['', 'Tue', '', 'Thu', '', 'Sat', ''];

/** GitHub-style contribution grid: 52 columns of ISO weeks ending in the current one. */
function Heatmap({ days, now, color, onToggle }: HeatmapProps) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const firstMonday = startOfWeek(addDays(now, -7 * (WEEKS - 1)));
  const width = LEFT + WEEKS * STEP;
  const height = TOP + 7 * STEP;

  const cells: Array<{ day: Ymd; x: number; y: number }> = [];
  const monthLabels: Array<{ x: number; text: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w += 1) {
    const monday = addDays(firstMonday, w * 7);
    const m = fromYmd(monday).getMonth();
    if (m !== lastMonth) {
      // Only label a month if its first column has room before the next label.
      if (monthLabels.length === 0 || LEFT + w * STEP - monthLabels[monthLabels.length - 1].x > 28) {
        monthLabels.push({ x: LEFT + w * STEP, text: MONTH_SHORT[m] });
      }
      lastMonth = m;
    }
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(monday, d);
      if (day > now) break;
      cells.push({ day, x: LEFT + w * STEP, y: TOP + d * STEP });
    }
  }

  return (
    <div className="heatmap-scroll" ref={scroller}>
      <svg
        className="heatmap"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Check-ins over the last 52 weeks"
      >
        {monthLabels.map((m) => (
          <text key={m.x} x={m.x} y={11} className="hm-label">
            {m.text}
          </text>
        ))}
        {DOW.map((t, i) =>
          t ? (
            <text key={t} x={0} y={TOP + i * STEP + CELL - 2} className="hm-label">
              {t}
            </text>
          ) : null,
        )}
        {cells.map((c) => {
          const on = days.has(c.day);
          return (
            <rect
              key={c.day}
              x={c.x}
              y={c.y}
              width={CELL}
              height={CELL}
              rx={2.5}
              className={`hm-cell ${on ? 'on' : ''} ${c.day === now ? 'today' : ''} ${onToggle ? 'tappable' : ''}`}
              style={on ? { fill: color } : undefined}
              onClick={onToggle ? () => onToggle(c.day) : undefined}
            >
              <title>{`${c.day}${on ? ' — done' : ''}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

export default Heatmap;
