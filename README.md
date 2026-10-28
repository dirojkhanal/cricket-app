# Cricket App

Scaffold set up per `../cricket-game-plan.md`.

## Structure
- `client/` — Three.js + TypeScript + Vite (the game in the browser)
- `server/` — Colyseus + TypeScript (multiplayer rooms + AI, room code = room ID)
- `shared/` — types shared between client and server

## Run locally

Server:
```
cd server
npm run dev
```

Client (separate terminal):
```
cd client
npm run dev
```

Client dev server prints a localhost URL — open it in two browser tabs to test multiplayer.
