# Setup log — what's done, what's next

Read this first if context was lost. Full design plan is in `PLAN.md`.

## Status as of 2026-10-29

Phases 1–3 are done and verified working in-browser: Three.js scene,
single-player scoring loop, and a rule-based AI bowler. All of this is
merged into `main` (was on `feature/ai-opponent`, merged + pushed). No
server wiring, no multiplayer yet.

## What exists

```
cricket-app/
  client/        Vite + TypeScript + Three.js + colyseus.js
    src/
      main.ts          Three.js scene (pitch/outfield/camera/lighting) + scoring UI overlay, wired to game.ts
      game.ts           pure game logic: MatchState, ShotType, AI bowler (Line/Length/Delivery, pickDelivery),
                         resolveBall (weighted random per shot, modified by delivery risk), playBall, oversDisplay
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

Current gameplay: single-player, batting only, 3 shot buttons (Defend/
Normal/Big Shot). Before each ball the AI bowler picks a line (off/
straight/leg) and length (short/good/full), never repeating the exact
previous delivery, shown on screen as "AI bowls: ...". Good-length
deliveries raise wicket risk and cut boundary odds; short/full are easier
to score off. Match is capped at `MAX_OVERS = 2` (12 balls) for fast
testing — bump this up once the loop feels right.

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
git checkout main
cd server && npm run dev      # starts Colyseus on ws://localhost:2567 (not used by the client yet)
cd client && npm run dev      # starts Vite dev server, open the printed URL — scoreboard + 3 shot buttons work
```

Run the game-logic self-check any time with `cd client && npx tsx src/game.test.ts`.

## Next steps (in order — see PLAN.md section 8 for full phase list)

1. ~~Replace `client/src/main.ts` default content with a Three.js scene~~ — done.
2. ~~Build single-player loop client-side only~~ — done (`game.ts` + UI overlay in `main.ts`).
3. ~~Add rule-based AI as the "second player" client-side~~ — done (AI bowler
   in `game.ts`: `pickDelivery`/`Delivery`/`LENGTH_RISK`, see PLAN.md
   section 5 for the full heuristic this is a slice of).
4. Port the outcome logic into `server/src/rooms/CricketRoom.ts` (basically
   move `game.ts`'s `playBall`/`resolveBall` server-side), make server
   authoritative, wire `client/src/network.ts` into the UI (Create Room
   button → `createRoom()`, Join box → `joinRoom(code)`).
5. Test two-tab multiplayer locally.
6. Deploy: server → Render.com free tier, client → Vercel/Netlify free tier.
7. ~~Merge AI-opponent work into `main`~~ — done.

## Decisions already made (don't re-ask)

- Language: TypeScript everywhere (user's preference, familiar).
- 3D engine: Three.js (not Unity/Babylon) — see PLAN.md section 2 for why.
- Multiplayer: Colyseus, room code = Colyseus room ID (no custom code system).
- AI: rule-based TS, not ML/LLM.
- Hosting: free tiers only for now (Render + Vercel/Netlify), no custom
  domain yet.
