# Setup log — what's done, what's next

Read this first if context was lost. Full design plan is in `PLAN.md`.

## Status as of 2026-10-28

Scaffold only — no gameplay, no 3D scene, no AI logic yet. Everything below
is verified to actually run (server boots, both `tsc --noEmit` pass clean).

## What exists

```
cricket-app/
  client/        Vite + TypeScript + Three.js + colyseus.js
    src/
      main.ts          default Vite starter content — NOT replaced yet
      network.ts        createRoom() / joinRoom(code) using colyseus.js Client
  server/        Colyseus 0.18 + TypeScript + express
    src/
      index.ts                Server + WebSocketTransport, defines room "cricket" on port 2567
      rooms/CricketRoom.ts     MatchState schema (score/wickets/ballsBowled) + CricketRoom (maxClients 2)
  shared/
    types.ts       MatchStateDTO interface (not wired into client or server yet)
  PLAN.md          full game plan (tech stack, phases, room-code flow, improvements list)
  README.md        run instructions
```

## Key library-version gotchas hit today (don't re-debug these)

- `npm install -D typescript` pulled a **v7 canary** by default — it removed
  `moduleResolution: "node"`. Pinned to `typescript@5` (5.9.3) instead. If
  reinstalling, pin to `^5`.
- **Colyseus is v0.18**, which changed its API from older tutorials you'll
  find online:
  - `new Server({ transport: new WebSocketTransport({ server: httpServer }) })`
    — NOT `new Server({ server: httpServer })`.
  - `WebSocketTransport` comes from `@colyseus/ws-transport` (already an
    installed transitive dep, didn't need explicit install).
  - `Room<{ state: MatchState }>` — NOT `Room<MatchState>`. The generic takes
    an options-shape object now, not the state class directly.

## How to run it right now

```
cd server && npm run dev      # starts Colyseus on ws://localhost:2567
cd client && npm run dev      # starts Vite dev server, open the printed URL
```

Nothing visible happens yet — `main.ts` is still the Vite template, and
`network.ts` functions aren't called from anywhere. That's the next step.

## Next steps (in order — see PLAN.md section 8 for full phase list)

1. Replace `client/src/main.ts` default content with a Three.js scene
   (empty stadium/pitch, camera) — Phase 1 of the plan.
2. Build single-player loop client-side only (no network) — bowl/bat
   buttons, score tracking in a local TS object.
3. Add rule-based AI as the "second player" client-side.
4. Port the outcome logic into `server/src/rooms/CricketRoom.ts`, make
   server authoritative, wire `client/src/network.ts` into the UI
   (Create Room button → `createRoom()`, Join box → `joinRoom(code)`).
5. Test two-tab multiplayer locally.
6. Deploy: server → Render.com free tier, client → Vercel/Netlify free tier.

## Decisions already made (don't re-ask)

- Language: TypeScript everywhere (user's preference, familiar).
- 3D engine: Three.js (not Unity/Babylon) — see PLAN.md section 2 for why.
- Multiplayer: Colyseus, room code = Colyseus room ID (no custom code system).
- AI: rule-based TS, not ML/LLM.
- Hosting: free tiers only for now (Render + Vercel/Netlify), no custom
  domain yet.
