export type TabId = 'today' | 'week' | 'group';

interface TabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'group', label: 'Group' },
];

function Tabs({ active, onChange }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Views">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${active === t.id ? 'active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default Tabs;
