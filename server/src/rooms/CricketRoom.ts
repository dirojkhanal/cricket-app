import { Room, Client } from "colyseus";
import { Schema, type } from "@colyseus/schema";

export class MatchState extends Schema {
  @type("number") score = 0;
  @type("number") wickets = 0;
  @type("number") ballsBowled = 0;
}

export class CricketRoom extends Room<{ state: MatchState }> {
  maxClients = 2;

  onCreate() {
    this.setState(new MatchState());
  }

  onJoin(client: Client) {
    console.log(`${client.sessionId} joined room ${this.roomId}`);
  }

  onLeave(client: Client) {
    console.log(`${client.sessionId} left room ${this.roomId}`);
  }
}
