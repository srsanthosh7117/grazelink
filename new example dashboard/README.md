# AaduTrack — Goat Collar Dashboard (Prototype)

A simple interactive **3D dashboard** for the goat tracking collar project. It's a
standalone frontend that runs against **mock data** shaped exactly like the records
your collar firmware will produce (Device ID, Goat ID, timestamp, lat/lng, accuracy,
battery %, status) — so swapping in your real backend later is a one-file change.

## What's in it

- **3D interactive globe** (drag to rotate, scroll to zoom) showing every collar as a
  pin. Click a pin — or a goat in the roster — to fly the camera in and draw that
  goat's grazing trail as a glowing path.
- **Status colors match the physical collar's LED spec exactly**: blue = Wi-Fi
  sync, yellow = grazing mode, red = low/critical battery, grey = offline — same
  priority order (Red > Blue > Yellow) as the firmware's LED Manager.
- **Stat cards**: herd size, currently grazing, currently syncing, low battery count,
  last shed sync.
- **Goat detail panel**: distance traveled today, start/end fix, and the full
  20-minute-interval timeline for the selected goat.

## Run it in VS Code

1. Unzip this folder and open it in VS Code (`File → Open Folder`).
2. Open a terminal in VS Code (`` Ctrl+` ``) and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the URL Vite prints (usually `http://localhost:5173`).

Recommended VS Code extensions: **ES7+ React/Redux snippets**, **Tailwind CSS
IntelliSense**, **ESLint**.

## Connecting it to your real backend

Everything currently comes from one place: `src/data/mockData.ts` →
`generateHerd()`. Once Phase 3 (backend APIs) exists:

1. Replace the `useState(() => generateHerd(8))` call in `src/App.tsx` with a
   `fetch('/api/goats')` (or React Query, if you add it).
2. Keep the shape in `src/types.ts` (`Goat`, `TrailPoint`) as your contract with the
   API — it already mirrors the local storage record fields from the firmware spec.
3. The shed coordinates used to center the globe live in `SHED` at the top of
   `src/data/mockData.ts` — point that at your real shed's GPS fix.

## Project structure

```
src/
  App.tsx                 # layout + state
  types.ts                # Goat / TrailPoint / HerdSummary contracts
  statusMeta.ts            # LED-color <-> status mapping, time formatting
  data/mockData.ts         # mock herd generator (swap for a real API call)
  components/
    Header.tsx
    StatsCards.tsx
    GoatList.tsx           # roster sidebar
    GoatDetailPanel.tsx    # selected goat's trail + stats
    Globe3D.tsx             # the 3D globe (react-globe.gl)
    Legend.tsx
    StatusBadge.tsx
    BatteryBadge.tsx
```

## Notes

- This is a **frontend-only prototype** — no auth, no real backend, no database.
  It's meant to give you (and anyone you show it to) a tangible feel for the
  dashboard described in Phase 5 of the project brief, before Phases 3–5 are
  actually built.
- The 3D globe is `react-globe.gl` (a React wrapper around `three-globe`/three.js).
  It renders a stylized dark sphere rather than a satellite texture, since a single
  farm doesn't need literal Earth imagery — just something that reads as "the
  herd's world."
- Mock data is deterministically seeded, so the herd looks the same on every
  reload instead of jumping around randomly.
