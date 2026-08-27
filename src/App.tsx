// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useState } from 'react';
import { useHabits } from './hooks/useHabits';
import { useToday } from './hooks/useToday';
import type { Habit } from './lib/habits';
import TopBar from './components/TopBar';
import Tabs, { type TabId } from './components/Tabs';
import TodayView from './components/TodayView';
import WeekView from './components/WeekView';
import GroupView from './components/GroupView';
import HabitDetail from './components/HabitDetail';
import HabitForm from './components/HabitForm';
import SettingsDrawer from './components/SettingsDrawer';
import Icon from './components/Icon';

type Form = { mode: 'add' } | { mode: 'edit'; habit: Habit } | null;

function App() {
  const api = useHabits();
  const now = useToday();
  const [tab, setTab] = useState<TabId>('today');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const active = api.habits.filter((h) => !h.archived);
  const archived = api.config.showArchived ? api.habits.filter((h) => h.archived) : [];
  const openHabit = openId ? api.habits.find((h) => h.id === openId) ?? null : null;
  const groupName = api.config.groupName ?? api.group.store?.name ?? null;

  const goTab = (t: TabId) => {
    setOpenId(null);
    setTab(t);
  };

  let body;
  if (api.status === 'loading') {
    body = <p className="loading">Opening your habits…</p>;
  } else if (api.status === 'error') {
    body = (
      <div className="panel">
        <p className="error">{api.error}</p>
      </div>
    );
  } else if (openHabit) {
    body = (
      <HabitDetail
        habit={openHabit}
        days={api.checkins[openHabit.id] ?? new Set()}
        now={now}
        onBack={() => setOpenId(null)}
        onToggle={(day) => api.toggle(openHabit.id, day)}
        onEdit={() => setForm({ mode: 'edit', habit: openHabit })}
        onArchive={(a) => {
          void api.setArchived(openHabit.id, a);
          if (a) setOpenId(null);
        }}
      />
    );
  } else if (tab === 'today') {
    body = (
      <TodayView
        habits={active}
        archived={archived}
        checkins={api.checkins}
        now={now}
        onToggle={api.toggle}
        onOpen={setOpenId}
        onAdd={() => setForm({ mode: 'add' })}
        onUnarchive={(id) => void api.setArchived(id, false)}
      />
    );
  } else if (tab === 'week') {
    body = <WeekView habits={active} checkins={api.checkins} now={now} onToggle={api.toggle} onOpen={setOpenId} />;
  } else {
    body = (
      <GroupView
        group={api.group}
        groupName={groupName}
        login={api.login}
        habits={api.habits}
        checkins={api.checkins}
        now={now}
        onJoin={(how, name) => void api.joinGroup(how, name)}
        onLeave={() => void api.leaveGroup()}
        onRefresh={() => void api.refreshGroup()}
      />
    );
  }

  return (
    <div className="app">
      <TopBar groupName={groupName} onOpenSettings={() => setSettingsOpen(true)} />
      <Tabs active={tab} onChange={goTab} />
      {api.error && api.status === 'ready' ? (
        <div className="toast" role="alert">
          <span>{api.error}</span>
          <button type="button" className="iconbtn" aria-label="Dismiss" onClick={api.dismissError}>
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : null}
      <main>{body}</main>

      {form ? (
        <HabitForm
          initial={form.mode === 'edit' ? form.habit : undefined}
          onClose={() => setForm(null)}
          onSave={(input) => {
            if (form.mode === 'edit') void api.updateHabit({ ...form.habit, ...input, name: input.name.trim() });
            else void api.addHabit(input);
            setForm(null);
          }}
          onDelete={
            form.mode === 'edit'
              ? () => {
                  void api.deleteHabit(form.habit.id);
                  setForm(null);
                  setOpenId(null);
                }
              : undefined
          }
        />
      ) : null}
      {settingsOpen ? (
        <SettingsDrawer
          api={api}
          onClose={() => setSettingsOpen(false)}
          onGoToGroup={() => {
            setSettingsOpen(false);
            goTab('group');
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
