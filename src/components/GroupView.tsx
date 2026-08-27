import { useState } from 'react';
import type { Ymd } from '../lib/dates';
import { buildStatus } from '../lib/group';
import type { Checkins, Habit } from '../lib/habits';
import type { GroupState } from '../hooks/useHabits';
import Icon from './Icon';
import MemberCard from './MemberCard';

interface GroupViewProps {
  group: GroupState;
  groupName: string | null;
  login: string;
  habits: Habit[];
  checkins: Checkins;
  now: Ymd;
  onJoin: (how: 'pick' | 'create', name?: string) => void;
  onLeave: () => void;
  onRefresh: () => void;
}

function GroupView({ group, groupName, login, habits, checkins, now, onJoin, onLeave, onRefresh }: GroupViewProps) {
  const [newName, setNewName] = useState('');

  if (!group.store) {
    return (
      <section className="view">
        <header className="view-head">
          <div>
            <p className="eyebrow">Accountability group</p>
            <h1>Keep each other honest.</h1>
          </div>
        </header>
        <div className="panel stack">
          <p>
            A group is a shared space. Everyone in it sees each other's habits, today's status and streaks; your
            check-ins stay in your own folder inside it. Invite people from the platform's Spaces UI — the app itself
            can't add members.
          </p>
          {group.error ? <p className="error">{group.error}</p> : null}
          <div className="row wrap">
            <button type="button" className="btn btn-primary" disabled={group.busy} onClick={() => onJoin('pick')}>
              <Icon name="users" size={16} />
              Open a shared space
            </button>
          </div>
          <form
            className="row wrap"
            onSubmit={(e) => {
              e.preventDefault();
              onJoin('create', newName);
            }}
          >
            <input
              className="input"
              placeholder="New group name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="New group name"
            />
            <button type="submit" className="btn btn-ghost" disabled={group.busy}>
              <Icon name="plus" size={16} />
              Create group space
            </button>
          </form>
          {group.busy ? <p className="muted small">Waiting for the host…</p> : null}
        </div>
      </section>
    );
  }

  // My own card comes from live local state; others from their status files.
  const me = buildStatus(login, habits, checkins);
  const others = group.members.filter((m) => m.login !== login);

  return (
    <section className="view">
      <header className="view-head">
        <div>
          <p className="eyebrow">Accountability group</p>
          <h1>{groupName ?? group.store.name ?? 'Group'}.</h1>
        </div>
        <div className="row">
          <button type="button" className="iconbtn" aria-label="Refresh" onClick={onRefresh}>
            <Icon name="refresh" />
          </button>
          <button type="button" className="btn btn-ghost small" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>
      {group.error ? <p className="error">{group.error}</p> : null}
      <div className="members">
        <MemberCard member={me} isMe now={now} />
        {others.map((m) => (
          <MemberCard key={m.login} member={m} isMe={false} now={now} />
        ))}
      </div>
      {others.length === 0 ? (
        <p className="muted small">
          Nobody else has checked in yet. Share this space from the platform's Spaces UI; members appear here within a
          few seconds of their first check-in.
        </p>
      ) : null}
    </section>
  );
}

export default GroupView;
