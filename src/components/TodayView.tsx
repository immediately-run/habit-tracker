import { longDate, type Ymd } from '../lib/dates';
import type { Checkins, Habit } from '../lib/habits';
import HabitRow from './HabitRow';
import Icon from './Icon';

interface TodayViewProps {
  habits: Habit[];
  archived: Habit[];
  checkins: Checkins;
  now: Ymd;
  onToggle: (id: string, day: Ymd) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onUnarchive: (id: string) => void;
}

function TodayView({ habits, archived, checkins, now, onToggle, onOpen, onAdd, onUnarchive }: TodayViewProps) {
  const doneCount = habits.filter((h) => checkins[h.id]?.has(now)).length;
  const allDone = habits.length > 0 && doneCount === habits.length;
  return (
    <section className="view">
      <header className="view-head">
        <div>
          <p className="eyebrow">{longDate(now)}</p>
          <h1>{allDone ? 'All done today.' : habits.length ? `${doneCount} of ${habits.length} done.` : 'No habits yet.'}</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <Icon name="plus" size={16} />
          New habit
        </button>
      </header>

      {habits.length === 0 ? (
        <div className="empty">
          <p>Add a habit to start tracking. Tap the ring each day you do it; streaks and the year heatmap fill in from there.</p>
        </div>
      ) : (
        <ul className="habit-list">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              days={checkins[h.id] ?? new Set()}
              now={now}
              onToggle={() => onToggle(h.id, now)}
              onOpen={() => onOpen(h.id)}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="archived">
          <p className="eyebrow">Archived</p>
          <ul className="archived-list">
            {archived.map((h) => (
              <li key={h.id}>
                <button type="button" className="linkbtn" onClick={() => onOpen(h.id)}>
                  {h.name}
                </button>
                <button type="button" className="btn btn-ghost small" onClick={() => onUnarchive(h.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default TodayView;
