import Icon from './Icon';

interface CheckButtonProps {
  checked: boolean;
  /** Hex color of the habit. */
  color: string;
  label: string;
  size?: 'lg' | 'sm';
  disabled?: boolean;
  onToggle: () => void;
}

/** The big tap target: a ring in the habit's color that fills when checked. */
function CheckButton({ checked, color, label, size = 'lg', disabled, onToggle }: CheckButtonProps) {
  return (
    <button
      type="button"
      className={`check ${size} ${checked ? 'on' : ''}`}
      style={{ ['--hc' as string]: color }}
      aria-pressed={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
    >
      <Icon name="check" size={size === 'lg' ? 26 : 16} strokeWidth={3} />
    </button>
  );
}

export default CheckButton;
