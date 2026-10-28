# Setup log — what's done, what's next

Read this first if context was lost. Full design plan is in `PLAN.md`.

## Status as of 2026-10-28

Phase 1 (Three.js scene) and Phase 2 (single-player scoring loop) are done
and verified working in-browser. No AI, no server wiring, no multiplayer
yet. All work since the initial scaffold is on branch
`feature/threejs-scene` (NOT merged to `main` — user asked to keep working
on a branch for now, don't push straight to main).

## What exists

```
cricket-app/
  client/        Vite + TypeScript + Three.js + colyseus.js
    src/
      main.ts          Three.js scene (pitch/outfield/camera/lighting) + scoring UI overlay, wired to game.ts
      game.ts           pure game logic: MatchState, resolveBall (weighted random per shot type), playBall, oversDisplay
      game.test.ts       assert-based self-check for game.ts (run with `npx tsx src/game.test.ts`)
      network.ts        createRoom() / joinRoom(code) using colyseus.js Client — written but NOT yet called from UI
  server/        Colyseus 0.18 + TypeScript + express
    src/
      index.ts                Server + WebSocketTransport, defines room "cricket" on port 2567
      rooms/CricketRoom.ts     MatchState schema (score/wickets/ballsBowled) + CricketRoom (maxClients 2) — logic not yet ported from client/src/game.ts
  shared/
    types.ts       MatchStateDTO interface (not wired into client or server yet)
  PLAN.md          full game plan (tech stack, phases, room-code flow, improvements list)
  README.md        run instructions
```

Current gameplay: single-player only, one innings, 3 shot buttons (Defend/
Normal/Big Shot), each with its own weighted runs/wicket outcome table in
`game.ts`. Match is capped at `MAX_OVERS = 2` (12 balls) for fast testing —
bump this up once the loop feels right. No bowling/AI side yet — it's just
you batting against an invisible bowler.

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
git checkout feature/threejs-scene   # this is where all the game.ts/main.ts work lives
cd server && npm run dev      # starts Colyseus on ws://localhost:2567 (not used by the client yet)
cd client && npm run dev      # starts Vite dev server, open the printed URL — scoreboard + 3 shot buttons work
```

Run the game-logic self-check any time with `cd client && npx tsx src/game.test.ts`.

## Next steps (in order — see PLAN.md section 8 for full phase list)

1. ~~Replace `client/src/main.ts` default content with a Three.js scene~~ — done.
2. ~~Build single-player loop client-side only~~ — done (`game.ts` + UI overlay in `main.ts`).
3. Add rule-based AI as the "second player" client-side — AI picks a shot/
   line using the same kind of weighted logic as `game.ts`'s outcome tables,
   see PLAN.md section 5 for the exact heuristic (aggressive when behind
   rate, defensive when wickets low, randomness scaled by difficulty).
4. Port the outcome logic into `server/src/rooms/CricketRoom.ts` (basically
   move `game.ts`'s `playBall`/`resolveBall` server-side), make server
   authoritative, wire `client/src/network.ts` into the UI (Create Room
   button → `createRoom()`, Join box → `joinRoom(code)`).
5. Test two-tab multiplayer locally.
6. Deploy: server → Render.com free tier, client → Vercel/Netlify free tier.
7. Merge `feature/threejs-scene` into `main` once it's stable (not done yet
   — still iterating on this branch per user request).

## Decisions already made (don't re-ask)

- Language: TypeScript everywhere (user's preference, familiar).
- 3D engine: Three.js (not Unity/Babylon) — see PLAN.md section 2 for why.
- Multiplayer: Colyseus, room code = Colyseus room ID (no custom code system).
- AI: rule-based TS, not ML/LLM.
- Hosting: free tiers only for now (Render + Vercel/Netlify), no custom
  domain yet.
