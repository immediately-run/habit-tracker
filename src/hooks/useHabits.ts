// The app's single source of truth: habits + check-ins in the private store, with
// optional mirroring into an accountability-group space. Every write goes to the
// private root and (when a group is open) to `<shared>/members/<login>/…`; a
// per-path queue serialises writes so two quick toggles can't clobber a month file.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import {
  createSharedStore,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  pollDir,
  type Store,
} from '../lib/store';
import {
  deleteHabitFiles,
  loadAll,
  loadConfig,
  newHabit,
  saveAllMonths,
  saveConfig,
  saveHabit,
  saveMonth,
  toggleDay,
  wipeData,
  type AppConfig,
  type Checkins,
  type Habit,
} from '../lib/habits';
import { buildSampleData } from '../lib/seed';
import { loadStatuses, memberRoot, mirrorAll, safeLogin, statusDir, writeStatus, type MemberStatus } from '../lib/group';
import { monthKey, type Ymd } from '../lib/dates';

export type BootStatus = 'loading' | 'ready' | 'error';

export interface GroupState {
  store: Store | null;
  members: MemberStatus[];
  /** Opening / joining in progress. */
  busy: boolean;
  /** Human-readable problem with the group space (lost grant, read-only, …). */
  error: string | null;
}

export interface HabitsApi {
  status: BootStatus;
  error: string | null;
  habits: Habit[];
  checkins: Checkins;
  config: AppConfig;
  /** Where private data lives (shown in settings). */
  privateRoot: string | null;
  login: string;
  group: GroupState;

  addHabit: (input: Pick<Habit, 'name' | 'color' | 'targetPerWeek'>) => Promise<void>;
  updateHabit: (habit: Habit) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggle: (id: string, day: Ymd) => void;
  resetSampleData: () => Promise<void>;
  setConfig: (patch: Partial<AppConfig>) => Promise<void>;

  joinGroup: (how: 'pick' | 'create', name?: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
  refreshGroup: () => Promise<void>;
  dismissError: () => void;
}

/** Turn an SDK `{ code, message }` rejection into UI text ('' = user cancelled). */
const errMsg = (e: unknown): string => {
  if (e && typeof e === 'object') {
    const o = e as { code?: string; message?: string };
    if (o.code === 'cancelled') return '';
    if (o.code === 'forbidden') return 'The host did not allow that (forbidden).';
    if (o.code === 'auth-required') return 'Sign in to use shared spaces.';
    if (o.message) return o.message;
  }
  return String(e);
};

/** The remembered group space, once opened. `forId` ties it to the config value. */
interface OpenedGroup {
  forId: string;
  store: Store | null;
  error: string | null;
}

export function useHabits(): HabitsApi {
  const auth = useAuth();

  const [status, setStatus] = useState<BootStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [privateStore, setPrivateStore] = useState<Store | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkins>({});
  const [config, setConfigState] = useState<AppConfig>({});
  // The host hands stage apps `user: null` (identity is elevated), so a member
  // name from settings is the fallback — otherwise every member is "someone"
  // and they all write into the same folder.
  const login = safeLogin((auth.status === 'signed-in' && auth.user?.login) || config.displayName);
  const [opened, setOpenedState] = useState<OpenedGroup | null>(null);
  // Mirrored in a ref so the "open the remembered space" effect can tell that
  // joinGroup already opened this id (with the mount the host just handed us).
  const openedRef = useRef<OpenedGroup | null>(null);
  const setOpened = useCallback((o: OpenedGroup | null) => {
    openedRef.current = o;
    setOpenedState(o);
  }, []);
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // "Latest" copies updated synchronously in handlers, so queued writers (which
  // run as microtasks BEFORE React commits the new state) serialise fresh data.
  const latest = useRef<{ habits: Habit[]; checkins: Checkins; roots: string[] }>({ habits: [], checkins: {}, roots: [] });
  const queues = useRef<Record<string, Promise<void>>>({});

  const commitHabits = useCallback((next: Habit[]) => {
    latest.current.habits = next;
    setHabits(next);
  }, []);
  const commitCheckins = useCallback((next: Checkins) => {
    latest.current.checkins = next;
    setCheckins(next);
  }, []);

  /** Run `fn` after any pending write with the same key. Errors surface via setError. */
  const enqueue = useCallback((key: string, fn: () => Promise<void>) => {
    const prev = queues.current[key] ?? Promise.resolve();
    const next = prev.then(fn).catch((e: unknown) => {
      const msg = errMsg(e);
      if (msg) setError(`Could not save: ${msg}`);
    });
    queues.current[key] = next;
    return next;
  }, []);

  // ── derived group state ───────────────────────────────────────────────────────
  const groupSpaceId = config.groupSpaceId;
  const groupStore = groupSpaceId && opened?.forId === groupSpaceId ? opened.store : null;
  const groupOpening = !!groupSpaceId && status === 'ready' && opened?.forId !== groupSpaceId;
  const groupError = joinError ?? (groupSpaceId && opened?.forId === groupSpaceId ? opened.error : null);

  /** Private root first, then the group member folder when a group is writable. */
  const roots = useMemo(() => {
    const out: string[] = [];
    if (privateStore) out.push(privateStore.root);
    if (groupStore && groupStore.mode === 'rw') out.push(memberRoot(groupStore.root, login));
    return out;
  }, [privateStore, groupStore, login]);
  useEffect(() => {
    latest.current.roots = roots;
  }, [roots]);

  // ── boot ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await openPrivateStore('data');
        const cfg = await loadConfig(store.root);
        let data = await loadAll(store.root);
        // Bail BEFORE seeding: a superseded run (StrictMode re-mount, fast
        // unmount) must not race the live one into writing the samples twice.
        if (cancelled) return;
        if (data.habits.length === 0 && !cfg.seeded) {
          data = buildSampleData();
          await Promise.all(
            data.habits.map(async (h) => {
              await saveHabit(store.root, h);
              await saveAllMonths(store.root, h.id, data.checkins[h.id]);
            }),
          );
          cfg.seeded = true;
          await saveConfig(store.root, cfg);
        }
        if (cancelled) return;
        latest.current.roots = [store.root];
        setPrivateStore(store);
        setConfigState(cfg);
        commitHabits(data.habits);
        commitCheckins(data.checkins);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(errMsg(e) || 'Could not open the private store.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commitHabits, commitCheckins]);

  // ── config ────────────────────────────────────────────────────────────────────
  const setConfig = useCallback(
    async (patch: Partial<AppConfig>) => {
      if (!privateStore) return;
      const next = { ...config, ...patch };
      for (const k of Object.keys(next) as (keyof AppConfig)[]) if (next[k] === undefined) delete next[k];
      setConfigState(next);
      await enqueue('config', () => saveConfig(privateStore.root, next));
    },
    [privateStore, config, enqueue],
  );

  // ── habits CRUD ───────────────────────────────────────────────────────────────
  const writeHabit = useCallback(
    (habit: Habit) =>
      enqueue(`habit:${habit.id}`, async () => {
        await Promise.all(latest.current.roots.map((r) => saveHabit(r, habit)));
      }),
    [enqueue],
  );

  const addHabit = useCallback(
    async (input: Pick<Habit, 'name' | 'color' | 'targetPerWeek'>) => {
      const habit = newHabit(input);
      commitHabits([...latest.current.habits, habit]);
      commitCheckins({ ...latest.current.checkins, [habit.id]: new Set() });
      await writeHabit(habit);
    },
    [writeHabit, commitHabits, commitCheckins],
  );

  const updateHabit = useCallback(
    async (habit: Habit) => {
      commitHabits(latest.current.habits.map((h) => (h.id === habit.id ? habit : h)));
      await writeHabit(habit);
    },
    [writeHabit, commitHabits],
  );

  const setArchived = useCallback(
    async (id: string, archived: boolean) => {
      const h = latest.current.habits.find((x) => x.id === id);
      if (h) await updateHabit({ ...h, archived });
    },
    [updateHabit],
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      commitHabits(latest.current.habits.filter((h) => h.id !== id));
      const next = { ...latest.current.checkins };
      delete next[id];
      commitCheckins(next);
      await enqueue(`habit:${id}`, async () => {
        await Promise.all(latest.current.roots.map((r) => deleteHabitFiles(r, id)));
      });
    },
    [enqueue, commitHabits, commitCheckins],
  );

  // ── check-ins ─────────────────────────────────────────────────────────────────
  const toggle = useCallback(
    (id: string, day: Ymd) => {
      const nextSet = toggleDay(latest.current.checkins[id] ?? new Set(), day);
      commitCheckins({ ...latest.current.checkins, [id]: nextSet });
      const month = monthKey(day);
      void enqueue(`month:${id}:${month}`, async () => {
        const days = latest.current.checkins[id] ?? new Set<Ymd>();
        await Promise.all(latest.current.roots.map((r) => saveMonth(r, id, month, days)));
      });
    },
    [enqueue, commitCheckins],
  );

  // ── sample data ───────────────────────────────────────────────────────────────
  const resetSampleData = useCallback(async () => {
    if (!privateStore) return;
    const data = buildSampleData();
    commitHabits(data.habits);
    commitCheckins(data.checkins);
    await enqueue('reset', async () => {
      const roots = latest.current.roots;
      await Promise.all(roots.map((r) => wipeData(r)));
      await Promise.all(
        roots.flatMap((r) =>
          data.habits.map(async (h) => {
            await saveHabit(r, h);
            await saveAllMonths(r, h.id, data.checkins[h.id]);
          }),
        ),
      );
    });
  }, [privateStore, enqueue, commitHabits, commitCheckins]);

  // ── group: open the remembered space at boot / when the id changes ────────────
  /** Login the open group store was last fully mirrored for (a rename re-mirrors). */
  const mirroredLogin = useRef<string | null>(null);

  /** Mirror my data into a (just opened) group store and describe the result. */
  const activateGroup = useCallback(
    async (forId: string, store: Store): Promise<OpenedGroup> => {
      let err: string | null = store.mode === 'ro' ? 'You only have read access to this space, so your own check-ins are not shared.' : null;
      if (store.mode === 'rw') {
        try {
          mirroredLogin.current = login;
          await mirrorAll(store.root, login, latest.current.habits, latest.current.checkins);
        } catch (e) {
          err = `Could not write to the group space: ${errMsg(e)}`;
        }
      }
      return { forId, store, error: err };
    },
    [login],
  );

  useEffect(() => {
    if (status !== 'ready' || !groupSpaceId) return;
    // Just joined in this session: joinGroup already opened it with the mount the
    // host returned — re-mounting by id is not only redundant, it FAILS for a
    // space this app created (createSpace grants no durable mount; only a
    // powerbox pick does), which would turn a successful create into
    // "no longer available".
    if (openedRef.current?.forId === groupSpaceId) return;
    let cancelled = false;
    (async () => {
      const store = await openRememberedSpace(groupSpaceId, '');
      if (cancelled) return;
      if (!store) {
        setOpened({ forId: groupSpaceId, store: null, error: 'The group space is no longer available. Leave the group or pick it again.' });
        return;
      }
      const o = await activateGroup(groupSpaceId, store);
      if (!cancelled) setOpened(o);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, groupSpaceId, activateGroup, setOpened]);

  // ── group: poll the status folder (no remote watch events on shared spaces) ───
  const refreshGroup = useCallback(async () => {
    if (!groupStore) return;
    try {
      setMembers(await loadStatuses(groupStore.root));
    } catch {
      /* transient */
    }
  }, [groupStore]);

  useEffect(() => {
    if (!groupStore) return;
    // First read is deferred a tick so the effect body itself never sets state.
    const first = setTimeout(() => void refreshGroup(), 0);
    const stop = pollDir(statusDir(groupStore.root), () => void refreshGroup(), 3000);
    return () => {
      clearTimeout(first);
      stop();
    };
  }, [groupStore, refreshGroup]);

  // ── group: a renamed member gets a full mirror under the new folder ───────────
  useEffect(() => {
    if (!groupStore || groupStore.mode !== 'rw' || mirroredLogin.current === login) return;
    mirroredLogin.current = login;
    void enqueue('mirror', () => mirrorAll(groupStore.root, login, latest.current.habits, latest.current.checkins));
  }, [groupStore, login, enqueue]);

  // ── group: publish my summary whenever my data changes (debounced) ────────────
  useEffect(() => {
    if (!groupStore || groupStore.mode !== 'rw' || status !== 'ready') return;
    const t = setTimeout(() => {
      void enqueue('status', () => writeStatus(groupStore.root, login, habits, checkins));
    }, 400);
    return () => clearTimeout(t);
  }, [groupStore, status, login, habits, checkins, enqueue]);

  const joinGroup = useCallback(
    async (how: 'pick' | 'create', name?: string) => {
      setJoinError(null);
      setJoinBusy(true);
      try {
        const store =
          how === 'create' ? await createSharedStore(name?.trim() || 'Accountability group') : await pickSharedStore();
        if (!store.spaceId) throw new Error('The picked folder is not a space.');
        setOpened(await activateGroup(store.spaceId, store));
        await setConfig({ groupSpaceId: store.spaceId, groupName: store.name ?? name?.trim() });
      } catch (e) {
        const msg = errMsg(e);
        if (msg) setJoinError(msg);
      } finally {
        setJoinBusy(false);
      }
    },
    [setConfig, activateGroup, setOpened],
  );

  const leaveGroup = useCallback(async () => {
    setJoinError(null);
    setMembers([]);
    setOpened(null);
    await setConfig({ groupSpaceId: undefined, groupName: undefined });
  }, [setConfig, setOpened]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    status,
    error,
    habits,
    checkins,
    config,
    privateRoot: privateStore?.root ?? null,
    login,
    group: { store: groupStore, members, busy: joinBusy || groupOpening, error: groupError },
    addHabit,
    updateHabit,
    setArchived,
    deleteHabit,
    toggle,
    resetSampleData,
    setConfig,
    joinGroup,
    leaveGroup,
    refreshGroup,
    dismissError,
  };
}
