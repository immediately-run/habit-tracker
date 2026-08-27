import { useState } from 'react';
import type { HabitsApi } from '../hooks/useHabits';
import Icon from './Icon';
import Modal from './Modal';

interface SettingsDrawerProps {
  api: HabitsApi;
  onClose: () => void;
  onGoToGroup: () => void;
}

function SettingsDrawer({ api, onClose, onGoToGroup }: SettingsDrawerProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const groupName = api.config.groupName ?? api.group.store?.name ?? null;

  return (
    <Modal title="Settings" onClose={onClose} variant="sheet">
      <div className="stack">
        <section className="settings-section">
          <h3>Accountability group</h3>
          {api.config.groupSpaceId ? (
            <>
              <p className="muted small">
                Sharing with <b>{groupName ?? 'a shared space'}</b> as <b>{api.login}</b>.
                {api.group.error ? ` ${api.group.error}` : ''}
              </p>
              <div className="row wrap">
                <button type="button" className="btn btn-ghost small" onClick={onGoToGroup}>
                  <Icon name="users" size={14} />
                  Open group
                </button>
                <button type="button" className="btn btn-ghost small" onClick={() => void api.leaveGroup()}>
                  Leave group
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted small">Not sharing. Your habits live only in your private folder.</p>
              <button type="button" className="btn btn-ghost small" onClick={onGoToGroup}>
                <Icon name="users" size={14} />
                Set up a group
              </button>
            </>
          )}
        </section>

        <section className="settings-section">
          <h3>Display</h3>
          <label className="row toggle">
            <input
              type="checkbox"
              checked={!!api.config.showArchived}
              onChange={(e) => void api.setConfig({ showArchived: e.target.checked || undefined })}
            />
            <span>Show archived habits on the Today tab</span>
          </label>
        </section>

        <section className="settings-section">
          <h3>Data</h3>
          <p className="muted small">
            Everything is plain JSON in your private app folder: one file per habit under <code>habits/</code>, one file per
            habit-month under <code>checkins/</code>.
          </p>
          {api.privateRoot ? <code className="path">{api.privateRoot}</code> : null}
          {confirmReset ? (
            <div className="row wrap">
              <span className="muted small">Replace all habits and history with fresh sample data?</span>
              <button
                type="button"
                className="btn btn-danger small"
                disabled={resetting}
                onClick={() => {
                  setResetting(true);
                  void api.resetSampleData().finally(() => {
                    setResetting(false);
                    setConfirmReset(false);
                  });
                }}
              >
                {resetting ? 'Resetting…' : 'Yes, reset'}
              </button>
              <button type="button" className="btn btn-ghost small" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost small" onClick={() => setConfirmReset(true)}>
              <Icon name="rotate-ccw" size={14} />
              Reset sample data
            </button>
          )}
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="muted small">
            Habit tracker — an immediately.run example app. Daily habits, streaks and a year heatmap, stored in your own
            files.
          </p>
        </section>
      </div>
    </Modal>
  );
}

export default SettingsDrawer;
