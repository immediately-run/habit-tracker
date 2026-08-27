import { colorHex } from '../data/palette';
import type { Ymd } from '../lib/dates';
import type { Habit } from '../lib/habits';
import { computeStats } from '../lib/stats';
import CheckButton from './CheckButton';
import Icon from './Icon';

interface HabitRowProps {
  habit: Habit;
  days: ReadonlySet<Ymd>;
  now: Ymd;
  onToggle: () => void;
  onOpen: () => void;
}

function HabitRow({ habit, days, now, onToggle, onOpen }: HabitRowProps) {
  const s = computeStats(days, now);
  const hex = colorHex(habit.color);
  const weekPct = Math.min(100, Math.round((s.weekDone / habit.targetPerWeek) * 100));
  return (
    <li className={`habit-row ${s.doneToday ? 'done' : ''}`}>
      <CheckButton
        checked={s.doneToday}
        color={hex}
        label={s.doneToday ? `Uncheck ${habit.name} for today` : `Check ${habit.name} for today`}
        onToggle={onToggle}
      />
      <button type="button" className="habit-main" onClick={onOpen}>
        <span className="habit-name">{habit.name}</span>
        <span className="habit-meta">
          <span className="chip" title="Current streak">
            <Icon name="flame" size={13} />
            {s.currentStreak}d
          </span>
          <span className="chip" title="Best streak">
            ★ {s.bestStreak}d
          </span>
          <span className="chip" title="Completion, last 30 days">
            {s.rate30}%
          </span>
        </span>
        <span className="week-bar" aria-label={`${s.weekDone} of ${habit.targetPerWeek} this week`}>
          <span className="week-fill" style={{ width: `${weekPct}%`, background: hex }} />
        </span>
        <span className="week-text">
          {s.weekDone}/{habit.targetPerWeek} this week
        </span>
      </button>
      <span className="habit-go" aria-hidden="true">
        <Icon name="chevron-right" />
      </span>
    </li>
  );
}

export default HabitRow;
