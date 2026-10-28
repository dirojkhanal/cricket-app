import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { CricketRoom } from "./rooms/CricketRoom";

const port = Number(process.env.PORT) || 2567;
const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("cricket", CricketRoom);

gameServer.listen(port);
console.log(`Cricket server listening on ws://localhost:${port}`);
