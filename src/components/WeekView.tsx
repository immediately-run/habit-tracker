import { useState } from 'react';
import { colorHex } from '../data/palette';
import { addDays, shortDate, startOfWeek, WEEKDAY_SHORT, weekDays, type Ymd } from '../lib/dates';
import type { Checkins, Habit } from '../lib/habits';
import CheckButton from './CheckButton';
import Icon from './Icon';

interface WeekViewProps {
  habits: Habit[];
  checkins: Checkins;
  now: Ymd;
  onToggle: (id: string, day: Ymd) => void;
  onOpen: (id: string) => void;
}

function WeekView({ habits, checkins, now, onToggle, onOpen }: WeekViewProps) {
  const [offset, setOffset] = useState(0);
  const monday = addDays(startOfWeek(now), offset * 7);
  const days = weekDays(monday);
  const label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${shortDate(monday)} – ${shortDate(days[6])}`;

  return (
    <section className="view">
      <header className="view-head">
        <div>
          <p className="eyebrow">
            {shortDate(monday)} – {shortDate(days[6])}
          </p>
          <h1>{label}.</h1>
        </div>
        <div className="week-nav">
          <button type="button" className="iconbtn" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
            <Icon name="chevron-left" />
          </button>
          <button type="button" className="iconbtn" aria-label="Next week" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}>
            <Icon name="chevron-right" />
          </button>
        </div>
      </header>

      {habits.length === 0 ? (
        <div className="empty">
          <p>No active habits. Add one on the Today tab.</p>
        </div>
      ) : (
        <div className="week-grid" role="table" aria-label="Week grid" style={{ ['--cols' as string]: 7 }}>
          <div className="wg-row wg-head" role="row">
            <div className="wg-name" role="columnheader" />
            {days.map((d, i) => (
              <div key={d} className={`wg-day ${d === now ? 'today' : ''} ${d > now ? 'future' : ''}`} role="columnheader">
                <span className="wg-dow">{WEEKDAY_SHORT[i].slice(0, 2)}</span>
                <span className="wg-dom">{Number(d.slice(8, 10))}</span>
              </div>
            ))}
          </div>
          {habits.map((h) => {
            const set = checkins[h.id] ?? new Set<Ymd>();
            const hex = colorHex(h.color);
            const doneInWeek = days.filter((d) => set.has(d)).length;
            return (
              <div key={h.id} className="wg-row" role="row">
                <button type="button" className="wg-name linkbtn" onClick={() => onOpen(h.id)}>
                  <span className="dot" style={{ background: hex }} aria-hidden="true" />
                  <span className="wg-name-text">{h.name}</span>
                  <span className="wg-count">
                    {doneInWeek}/{h.targetPerWeek}
                  </span>
                </button>
                {days.map((d) => (
                  <div key={d} className="wg-cell" role="cell">
                    <CheckButton
                      size="sm"
                      checked={set.has(d)}
                      color={hex}
                      label={`${h.name} on ${shortDate(d)}`}
                      disabled={d > now}
                      onToggle={() => onToggle(h.id, d)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default WeekView;
