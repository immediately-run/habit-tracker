import { useState } from 'react';
import { DEFAULT_COLOR, PALETTE } from '../data/palette';
import type { Habit } from '../lib/habits';
import Icon from './Icon';
import Modal from './Modal';

interface HabitFormProps {
  initial?: Habit;
  onSave: (input: Pick<Habit, 'name' | 'color' | 'targetPerWeek'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function HabitForm({ initial, onSave, onDelete, onClose }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [target, setTarget] = useState(initial?.targetPerWeek ?? 7);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = name.trim().length > 0;

  return (
    <Modal title={initial ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ name, color, targetPerWeek: target });
        }}
      >
        <label className="field">
          <span>Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read 20 minutes"
            maxLength={60}
            autoFocus
          />
        </label>

        <div className="field">
          <span>Color</span>
          <div className="swatches" role="radiogroup" aria-label="Color">
            {PALETTE.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                title={c.label}
                className={`swatch ${color === c.id ? 'on' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Target days per week</span>
          <div className="segments" role="radiogroup" aria-label="Target days per week">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={target === n}
                className={`seg ${target === n ? 'on' : ''}`}
                onClick={() => setTarget(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="muted small">{target === 7 ? 'Every day' : `${target} day${target === 1 ? '' : 's'} a week`}</span>
        </div>

        <div className="row between wrap">
          {onDelete ? (
            confirmDelete ? (
              <span className="row">
                <span className="muted small">Delete for good?</span>
                <button type="button" className="btn btn-danger small" onClick={onDelete}>
                  Delete
                </button>
                <button type="button" className="btn btn-ghost small" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost small" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={14} />
                Delete
              </button>
            )
          ) : (
            <span />
          )}
          <span className="row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              {initial ? 'Save' : 'Add habit'}
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

export default HabitForm;
