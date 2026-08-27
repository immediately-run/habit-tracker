# Habit tracker

Daily habits, streaks and a year heatmap — stored in your own files.

An [immediately.run](https://immediately.run) example app: React + TypeScript that
loads straight from this repo and runs in your browser, with no server of its own.
Everything you track is plain JSON in a folder that belongs to you.

**Try it:** <https://immediately.run/present/github/immediately-run/habit-tracker/main/files/src/App.tsx>

## What it does

- **Today** — every active habit with a big tap-to-check ring, its current streak,
  best streak, completion rate over the last 30 days and progress against its
  weekly target.
- **Habit detail** — a GitHub-style 52-week heatmap (tap a day to toggle it),
  streak stats, edit (name, color, target days per week), archive/restore, delete.
- **Week** — a 7-column grid of habits × days; tap any past day to toggle it.
  Future days are locked. Step back through earlier weeks.
- **Group** — an optional accountability group backed by a shared space: everyone
  in it sees each other's habits, today's status and streaks.
- **Settings** — a bottom sheet with the group controls, a "show archived" toggle,
  where your data lives, and "Reset sample data".

On first run the app seeds three sample habits with about three weeks of random
history so the heatmap and streaks aren't empty. Delete them, edit them, or reset
them from Settings.

## How data is stored

Private data lives in the app's per-user settings folder (the host gives the app
its own private mount; nothing is shared unless you opt in):

```
<private>/config.json                          seeded flag, group space id, display prefs
<private>/habits/<habitId>.json                { id, name, color, targetPerWeek, archived, created }
<private>/checkins/<habitId>/<YYYY-MM>.json    { "days": [1, 3, 5, …] }  — one month per file
```

A check-in write touches exactly one small month file, so writes stay tiny and
the data is trivially readable (and editable) with any text editor.

## Accountability group (multi-user)

Open the **Group** tab and either pick an existing shared space or create a new
one. The app remembers the space and re-opens it on the next launch without a
prompt. Inside the space each member only ever writes under their own folder, so
concurrent members never overwrite each other:

```
<shared>/members/<login>/habits/<habitId>.json
<shared>/members/<login>/checkins/<habitId>/<YYYY-MM>.json
<shared>/status/<login>.json                   today summary + streaks (what the Group tab reads)
```

Other members' changes are picked up by polling the `status/` folder every three
seconds (shared spaces emit no remote change events). Inviting people to the space
happens in the platform's Spaces UI — the app itself cannot add members. Leaving
the group only forgets the space in this app; your files in it stay put.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173 — persists to ./devfs-playground/ (git-ignored)
npm run build    # type-check + production build
npm run lint     # includes the React Fast Refresh rule immediately.run relies on
```

Under `vite dev` there is no host, so the "private" and "shared" stores are both
folders under `devfs-playground/` and the group member is called `someone`.
To exercise the real host (consent prompts, spaces, sign-in) mount the working
tree with the CLI: `immediately.run dev . --origin https://local.immediately.run`.

## SDK features used

- `@immediately-run/sdk/mounts` — `openSettings` (private store), `requestMount`
  (pick a shared space), `createSpace`, `mount('space:<id>')` (re-open a
  remembered space).
- `@immediately-run/sdk/auth` — `useAuth` for the member login.
- `fs` (async ZenFS surface) — all reads and writes, plus directory polling.

## License

MIT — see [LICENSE](LICENSE).
