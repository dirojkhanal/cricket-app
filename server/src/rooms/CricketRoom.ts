import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import {
  ShotType, Line, Length, Delivery, BallOutcome,
  GamePhase, MAX_WICKETS, MAX_BALLS,
} from "../../../shared/types";

// --- outcome logic ---

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

const LINES: Line[]     = ["off", "straight", "leg"];
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

// --- schema ---

export class MatchState extends Schema {
  @type("number") score = 0;
  @type("number") wickets = 0;
  @type("number") balls = 0;
  @type("boolean") isOver = false;
  @type("string")  phase: GamePhase = "waiting";
  @type("number")  playerCount = 0;
  @type("boolean") batterReady = false;
  @type("boolean") bowlerReady = false;
  @type("string")  deliveryLine: Line = "straight";
  @type("string")  deliveryLength: Length = "good";
  @type("number")  lastRuns = 0;
  @type("boolean") lastWicket = false;
}

// --- room ---

export class CricketRoom extends Room<MatchState> {
  maxClients = 2;

  private vsAI = false;
  private clientRoles = new Map<string, "batter" | "bowler">();
  private pendingShot: ShotType | null = null;
  private pendingDelivery: Delivery | null = null;
  private currentDelivery: Delivery = { line: "straight", length: "good" };

  onCreate(options: { vsAI?: boolean } = {}) {
    this.vsAI = !!options.vsAI;
    this.setState(new MatchState());
    this.currentDelivery = pickDelivery();
    this.state.deliveryLine   = this.currentDelivery.line;
    this.state.deliveryLength = this.currentDelivery.length;

    this.onMessage("shot", (client, msg: { shot: ShotType }) => {
      if (this.clientRoles.get(client.sessionId) !== "batter") return;
      if (this.state.phase !== "playing" || this.state.isOver) return;
      if (this.state.batterReady) return; // already submitted this ball
      this.pendingShot = msg.shot;
      this.state.batterReady = true;
      this.maybeResolve();
    });

    this.onMessage("delivery", (client, msg: { line: Line; length: Length }) => {
      if (this.clientRoles.get(client.sessionId) !== "bowler") return;
      if (this.state.phase !== "playing" || this.state.isOver) return;
      if (this.state.bowlerReady) return;
      this.pendingDelivery = { line: msg.line, length: msg.length };
      this.state.bowlerReady = true;
      this.maybeResolve();
    });
  }

  onJoin(client: Client) {
    const idx = this.state.playerCount;
    const role = idx === 0 ? "batter" : "bowler";
    this.clientRoles.set(client.sessionId, role);
    this.state.playerCount += 1;
    client.send("role", { role });
    console.log(`${client.sessionId} joined as ${role} in ${this.roomId}`);

    const readyToStart = this.vsAI
      ? this.state.playerCount === 1
      : this.state.playerCount === 2;

    if (readyToStart) {
      this.state.phase = "playing";
      // vs AI: bowler intent comes from AI immediately
      if (this.vsAI) {
        this.pendingDelivery = this.currentDelivery;
        this.state.bowlerReady = true;
      }
    }
  }

  onLeave(client: Client) {
    console.log(`${client.sessionId} left ${this.roomId}`);
  }

  private maybeResolve() {
    if (!this.pendingShot || !this.pendingDelivery) return;
    const shot = this.pendingShot;
    const delivery = this.pendingDelivery;
    this.pendingShot = null;
    this.pendingDelivery = null;

    const outcome = resolveBall(shot, delivery);
    const s = this.state;
    s.score  += outcome.runs;
    s.balls  += 1;
    if (outcome.wicketLost) s.wickets += 1;
    s.lastRuns   = outcome.runs;
    s.lastWicket = outcome.wicketLost;
    s.isOver = s.wickets >= MAX_WICKETS || s.balls >= MAX_BALLS;
    if (s.isOver) {
      s.phase = "over";
    } else {
      this.currentDelivery = pickDelivery(this.currentDelivery);
      s.deliveryLine   = this.currentDelivery.line;
      s.deliveryLength = this.currentDelivery.length;
    }

    // reset ready flags for next ball
    s.batterReady = false;
    s.bowlerReady = false;

    // vs AI: pre-load next delivery so batter can go immediately
    if (this.vsAI && !s.isOver) {
      this.pendingDelivery = this.currentDelivery;
      s.bowlerReady = true;
    }
  }
}
