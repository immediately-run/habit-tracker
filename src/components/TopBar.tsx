import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

interface TopBarProps {
  groupName: string | null;
  onOpenSettings: () => void;
}

function TopBar({ groupName, onOpenSettings }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden="true" />
        <span className="brand-name">Habits</span>
      </div>
      {groupName ? (
        <span className="group-badge" title="Accountability group">
          <Icon name="users" size={14} />
          {groupName}
        </span>
      ) : null}
      <div className="topbar-actions">
        <ThemeSwitch />
        <button type="button" className="iconbtn" aria-label="Settings" onClick={onOpenSettings}>
          <Icon name="settings" size={20} />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
