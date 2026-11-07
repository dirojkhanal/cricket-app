import { Room, Client } from "colyseus";
import { Schema, type } from "@colyseus/schema";
import {
  ShotType, Line, Length, Delivery, BallOutcome,
  MAX_WICKETS, MAX_BALLS,
} from "../../../shared/types";

// --- outcome logic (authoritative, server-only) ---

const OUTCOME_TABLES: Record<ShotType, [number, number][]> = {
  defend: [[0, 70], [1, 25], [-1, 5]],
  normal: [[0, 35], [1, 30], [2, 15], [4, 15], [-1, 5]],
  big:    [[0, 25], [4, 20], [6, 25], [-1, 30]],
};

const LENGTH_RISK: Record<Length, { wicketMult: number; boundaryMult: number }> = {
  good:  { wicketMult: 1.5, boundaryMult: 0.6 },
  short: { wicketMult: 0.8, boundaryMult: 1.3 },
  full:  { wicketMult: 0.8, boundaryMult: 1.3 },
};

const LINES: Line[]   = ["off", "straight", "leg"];
const LENGTHS: Length[] = ["short", "good", "full"];

function weightedPick(table: [number, number][]): number {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [v, w] of table) { if (roll < w) return v; roll -= w; }
  return table[0][0];
}

function pickDelivery(prev?: Delivery): Delivery {
  let d: Delivery;
  do {
    d = {
      line:   LINES[Math.floor(Math.random() * LINES.length)],
      length: LENGTHS[Math.floor(Math.random() * LENGTHS.length)],
    };
  } while (prev && d.line === prev.line && d.length === prev.length);
  return d;
}

function resolveBall(shot: ShotType, delivery: Delivery): BallOutcome {
  const risk = LENGTH_RISK[delivery.length];
  const table: [number, number][] = OUTCOME_TABLES[shot].map(([v, w]) => {
    if (v === -1) return [v, w * risk.wicketMult];
    if (v >= 4)   return [v, w * risk.boundaryMult];
    return [v, w];
  });
  const r = weightedPick(table);
  return r === -1 ? { runs: 0, wicketLost: true } : { runs: r, wicketLost: false };
}

// --- Colyseus schema ---

export class MatchState extends Schema {
  @type("number") score = 0;
  @type("number") wickets = 0;
  @type("number") balls = 0;
  @type("boolean") isOver = false;
  @type("string") deliveryLine: Line = "straight";
  @type("string") deliveryLength: Length = "good";
  @type("number") lastRuns = 0;
  @type("boolean") lastWicket = false;
}

export class CricketRoom extends Room<{ state: MatchState }> {
  maxClients = 2;
  private delivery: Delivery = { line: "straight", length: "good" };

  onCreate(_options: Record<string, unknown> = {}) {
    const state = new MatchState();
    this.setState(state);
    this.delivery = pickDelivery();
    state.deliveryLine   = this.delivery.line;
    state.deliveryLength = this.delivery.length;

    this.onMessage("shot", (client, msg: { shot: ShotType }) => {
      if (state.isOver) return;
      const outcome = resolveBall(msg.shot, this.delivery);
      state.score += outcome.runs;
      state.balls += 1;
      if (outcome.wicketLost) state.wickets += 1;
      state.lastRuns    = outcome.runs;
      state.lastWicket  = outcome.wicketLost;
      state.isOver = state.wickets >= MAX_WICKETS || state.balls >= MAX_BALLS;
      if (!state.isOver) {
        this.delivery = pickDelivery(this.delivery);
        state.deliveryLine   = this.delivery.line;
        state.deliveryLength = this.delivery.length;
      }
    });
  }

  onJoin(client: Client) {
    console.log(`${client.sessionId} joined ${this.roomId}`);
  }

  onLeave(client: Client) {
    console.log(`${client.sessionId} left ${this.roomId}`);
  }
}
