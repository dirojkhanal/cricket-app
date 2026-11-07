export type ShotType = "defend" | "normal" | "big";
export type Line = "off" | "straight" | "leg";
export type Length = "short" | "good" | "full";

export interface Delivery {
  line: Line;
  length: Length;
}

export interface BallOutcome {
  runs: number;
  wicketLost: boolean;
}

// Sent from server → client on every state sync
export interface MatchStateDTO {
  score: number;
  wickets: number;
  balls: number;
  isOver: boolean;
  deliveryLine: Line;
  deliveryLength: Length;
  lastRuns: number;
  lastWicket: boolean;
}

export const MAX_WICKETS = 10;
export const MAX_OVERS = 2;
export const MAX_BALLS = MAX_OVERS * 6;
