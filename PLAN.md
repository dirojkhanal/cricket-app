# Cricket 3D Multiplayer Game — Build Plan

Status: planning only, no code yet.

## 1. Goal

A 3D cricket game, playable in the browser, with:
- Multiplayer (1v1, real-time)
- Single-player vs AI opponent
- Hosted for free

## 2. Tech stack (TypeScript end-to-end)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere (client, server, shared code) | Familiar to you, one language for the whole project. |
| 3D engine | **Three.js** | Native TS support, huge community/docs, free, runs in any browser. Import animated player models as `.glb`/`.gltf` (e.g. from Mixamo, free). |
| Build tool | **Vite** | Instant dev server, TS + Three.js work out of the box, zero config. |
| Multiplayer server | **Colyseus** | Written in TypeScript specifically for this use case — authoritative rooms, state sync, built-in matchmaking. No need to hand-roll WebSocket protocol. |
| AI opponent | Plain TS module (rule-based) | Runs on the server, acts like a "fake player" in the Colyseus room. No ML/LLM, no extra cost. |
| Frontend hosting (free) | **Vercel** or **Netlify** (free tier) | Static hosting for the built Three.js app. Auto HTTPS, free `*.vercel.app` or `*.netlify.app` subdomain. |
| Backend hosting (free) | **Render.com** free web service | Runs the Colyseus WebSocket server. Free tier sleeps after inactivity (~15 min) and wakes on next request — acceptable for a hobby project. |
| Domain | Skip for now — free subdomains only | A `.app` domain costs ~$15–20/year, not free. Revisit once the game is working. |

Skipped on purpose: Unity/C# (not familiar to you), Photon (paid beyond free tier, not TS), LLM-based AI (cost + latency for no real benefit here). Add these only if the TS stack hits a real wall.

## 3. Architecture

```
cricket-game/
  client/              Three.js + TS + Vite — the game you see in browser
    src/
      scenes/           stadium, pitch, camera setup
      entities/         batter, bowler, ball, fielders
      ui/               scoreboard, menus, shot/line-length selectors
      network/          Colyseus client connection
      main.ts
    index.html
    vite.config.ts

  server/              Colyseus + TS — multiplayer rooms + AI
    src/
      rooms/           CricketRoom.ts (match state, turn logic)
      ai/              AI opponent decision logic
      logic/           bowling/batting outcome rules, scoring, overs/wickets
      index.ts         Colyseus server entry point

  shared/              TS types/interfaces used by BOTH client and server
    types.ts           MatchState, ShotType, BallOutcome, etc.
```

One repo (monorepo), two deployable pieces: `client` (static site) and `server` (always-on-ish Node process).

## 4. Core gameplay loop

1. Bowler picks line/length (human or AI).
2. Batter picks shot type + timing (human or AI).
3. Server computes outcome (runs/wicket/dot ball) from a simple rules table + some randomness weighted by timing accuracy.
4. State broadcast to both clients, 3D animation plays (bowl → hit → fielding → run).
5. Repeat for 6 balls/over, swap innings, track score/wickets/overs until match ends.

Server is authoritative — client never decides the outcome, only sends intent (chosen shot/line). Prevents cheating and keeps both players in sync.

## 5. AI opponent design (rule-based)

Inputs: current score, wickets lost, overs remaining, required run rate, difficulty setting.

Logic (example for AI batting):
- Behind required rate → bias toward aggressive shots (higher risk/reward).
- Wickets in hand low → bias toward defensive shots.
- Add randomness scaled by difficulty (easy = more random/mistakes, hard = near-optimal choice).

Logic (example for AI bowling):
- Vary line/length instead of repeating, slight bias toward batter's apparent weakness (track which shot types conceded runs this innings).

This is a lookup table + weighted random pick — maybe 100–150 lines of TS, no external AI service needed.

## 6. Multiplayer flow — room code (Colyseus)

Exact flow you asked for:

1. **Player A** clicks "Create Room" → client asks Colyseus to create a `CricketRoom` → server generates a short room code (e.g. 6 chars, like `KX72AB`) → shown on Player A's screen.
2. Player A shares that code with Player B (text/voice, outside the app).
3. **Player B** types the code into an "Enter Code" box on their device → client calls `client.joinById(code)` → both players now in the same Colyseus room.
4. Room holds authoritative `MatchState`, synced automatically to both devices by Colyseus.
5. Match starts once both are in — Player A bats/bowls first, then they alternate turns each ball; each client only sends its chosen shot/line as an "intent" message, server resolves the outcome and pushes the new state to both.
6. If Player A instead clicks "Play vs AI" (no code needed), the room fills the second seat with the AI module instead of waiting for a real Player B.

Implementation note: the "room code" IS the Colyseus room ID — no separate code-generation system needed, Colyseus already gives each room a unique ID you can display as the join code.

## 7. Hosting steps (free), high-level

1. Push `client/` and `server/` as two folders in one GitHub repo (or two repos).
2. Deploy `server/` to Render.com as a free "Web Service" (Node + WebSocket support) → get a URL like `cricket-server.onrender.com`.
3. Deploy `client/` to Vercel or Netlify, pointing the Colyseus client connection at the Render server URL → get a URL like `cricket-game.vercel.app`.
4. Done — fully free, publicly playable link.

Note: Render's free tier sleeps when idle and takes ~30-60s to wake on the first request after sleeping. Fine for a hobby/demo project; if that's annoying later, a small paid tier ($7/mo) removes the sleep.

## 8. Build order (phases)

1. **Static 3D scene** — stadium/pitch in Three.js, camera, no gameplay yet.
2. **Single-player loop** — bowl → bat → outcome → score, all client-side, no network/AI yet.
3. **Rule-based AI** — swap the "second player" for the AI module, still client-side for speed of iteration.
4. **Move logic to server** — port the outcome rules into Colyseus, make server authoritative.
5. **Real multiplayer** — two browser tabs/devices playing via Colyseus rooms.
6. **Deploy** — Render (server) + Vercel/Netlify (client), test the public link end-to-end.
7. **Polish** — animations, sound, mobile touch controls, UI pass.

## 9. Rough timeline (solo, part-time)

- Phases 1–3 (playable vs AI, local): ~2–3 weeks
- Phases 4–5 (real multiplayer): ~2 weeks
- Phase 6 (deploy): ~2–3 days
- Phase 7 (polish): ongoing

Total to "working, shareable link": ~5–6 weeks.

## 10. Future upgrades (not now)

- Buy a `.app` domain and point it at Vercel once the game is stable.
- Swap rule-based AI for an LLM-driven commentary/strategy layer if desired.
- Add more game modes (T20 full match, tournaments, leaderboards with a free DB like Supabase).

## 11. Things to improve later (beyond the MVP)

Not needed to get a working game — only worth doing once the basic room-code multiplayer + AI loop actually works end to end.

**Reliability**
- Reconnect handling: if Player B refreshes/loses wifi mid-match, let them rejoin the same room code instead of the match dying.
- Room expiry: auto-close empty rooms after a few minutes so they don't pile up on the free server.
- Handle Render free-tier "cold start" (server asleep) with a simple "connecting..." spinner on the client instead of looking broken.

**Gameplay**
- Rematch button at end of match (same two players, new room, no re-typing codes).
- Short highlights/replay of the last ball (useful since 3D animation can be missed if you're reading UI).
- Difficulty selector for AI (easy/medium/hard) exposed in the UI, not just internal logic.

**Social / UX**
- In-room text chat or quick emotes between the two players.
- Spectator link (3rd person can watch via the room code, read-only).
- Shareable post-match scorecard/result (copy link or image).

**Polish**
- Sound effects (bat hit, crowd, umpire calls) and basic commentary text.
- Mobile touch controls tested properly (shot/line selection by tap/swipe, not just desktop clicks).
- Loading screen for 3D assets (stadium/player models can take a few seconds first load).

**Security / abuse prevention**
- Basic rate-limiting on room creation (stop one person spamming hundreds of rooms on the free server).
- Validate all client "intent" messages server-side (never trust the client's claimed shot/outcome — already covered by the authoritative-server design, just flagging it as something to double check during implementation).

**Ops**
- Simple error logging (even just console + Render logs) so you can tell why a match broke without guessing.
- A basic uptime check/ping so you notice if the free server tier goes down.
