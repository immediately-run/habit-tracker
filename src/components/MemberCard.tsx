import { colorHex } from '../data/palette';
import { shortDate, type Ymd } from '../lib/dates';
import type { MemberStatus } from '../lib/group';
import Icon from './Icon';

interface MemberCardProps {
  member: MemberStatus;
  isMe: boolean;
  now: Ymd;
}

function MemberCard({ member, isMe, now }: MemberCardProps) {
  const done = member.habits.filter((h) => h.doneToday).length;
  const stale = member.date !== now;
  return (
    <article className={`member ${isMe ? 'me' : ''}`}>
      <header className="member-head">
        <h3>
          {member.login}
          {isMe ? <span className="pill">you</span> : null}
        </h3>
        <span className="muted small">
          {member.habits.length ? `${done}/${member.habits.length} today` : 'no habits'}
          {stale ? ` · as of ${shortDate(member.date)}` : ''}
        </span>
      </header>
      {member.habits.length ? (
        <ul className="member-habits">
          {member.habits.map((h) => (
            <li key={h.id} className={h.doneToday ? 'done' : ''}>
              <span className="mini-check" style={{ ['--hc' as string]: colorHex(h.color) }} aria-hidden="true">
                {h.doneToday ? <Icon name="check" size={12} strokeWidth={3} /> : null}
              </span>
              <span className="member-habit-name">{h.name}</span>
              <span className="chip" title="Current streak">
                <Icon name="flame" size={12} />
                {h.currentStreak}d
              </span>
              <span className="chip" title="This week">
                {h.weekDone}/{h.targetPerWeek}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default MemberCard;
