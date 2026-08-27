import { colorHex } from '../data/palette';
import type { Ymd } from '../lib/dates';
import type { Habit } from '../lib/habits';
import { computeStats } from '../lib/stats';
import CheckButton from './CheckButton';
import Heatmap from './Heatmap';
import Icon from './Icon';
import StatTile from './StatTile';

interface HabitDetailProps {
  habit: Habit;
  days: ReadonlySet<Ymd>;
  now: Ymd;
  onBack: () => void;
  onToggle: (day: Ymd) => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
}

function HabitDetail({ habit, days, now, onBack, onToggle, onEdit, onArchive }: HabitDetailProps) {
  const s = computeStats(days, now);
  const hex = colorHex(habit.color);
  return (
    <section className="view">
      <div className="detail-nav">
        <button type="button" className="linkbtn" onClick={onBack}>
          <Icon name="chevron-left" size={16} />
          Back
        </button>
        <div className="detail-actions">
          <button type="button" className="btn btn-ghost small" onClick={onEdit}>
            <Icon name="pencil" size={14} />
            Edit
          </button>
          <button type="button" className="btn btn-ghost small" onClick={() => onArchive(!habit.archived)}>
            <Icon name="archive" size={14} />
            {habit.archived ? 'Restore' : 'Archive'}
          </button>
        </div>
      </div>

      <header className="detail-head">
        <CheckButton
          checked={s.doneToday}
          color={hex}
          label={s.doneToday ? 'Uncheck today' : 'Check today'}
          onToggle={() => onToggle(now)}
          disabled={habit.archived}
        />
        <div>
          <h1>
            <span className="dot" style={{ background: hex }} aria-hidden="true" />
            {habit.name}
            {habit.archived ? <span className="pill">Archived</span> : null}
          </h1>
          <p className="muted">
            Target {habit.targetPerWeek}× a week · {s.total} check-in{s.total === 1 ? '' : 's'} total
          </p>
        </div>
      </header>

      <div className="stats">
        <StatTile label="Current streak" value={`${s.currentStreak}d`} accent={hex} />
        <StatTile label="Best streak" value={`${s.bestStreak}d`} />
        <StatTile label="Last 30 days" value={`${s.rate30}%`} hint={`${Math.round((s.rate30 / 100) * 30)} of 30 days`} />
        <StatTile label="This week" value={`${s.weekDone}/${habit.targetPerWeek}`} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Last 52 weeks</h3>
          <span className="muted small">{habit.archived ? 'Read-only while archived' : 'Tap a day to toggle it'}</span>
        </div>
        <Heatmap days={days} now={now} color={hex} onToggle={habit.archived ? undefined : onToggle} />
      </div>
    </section>
  );
}

export default HabitDetail;
