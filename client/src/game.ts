export type ShotType = "defend" | "normal" | "big";

export interface MatchState {
  score: number;
  wickets: number;
  balls: number; // legal balls bowled this innings
  isOut: boolean;
}

export const MAX_WICKETS = 10;
export const MAX_OVERS = 2; // short match for quick testing
export const MAX_BALLS = MAX_OVERS * 6;

export interface BallOutcome {
  runs: number;
  wicketLost: boolean;
}

// weighted outcome table per shot type: [runs, weight][]
const OUTCOME_TABLES: Record<ShotType, [number, number][]> = {
  defend: [
    [0, 70],
    [1, 25],
    [-1, 5], // -1 = wicket
  ],
  normal: [
    [0, 35],
    [1, 30],
    [2, 15],
    [4, 15],
    [-1, 5],
  ],
  big: [
    [0, 25],
    [4, 20],
    [6, 25],
    [-1, 30],
  ],
};

function weightedPick(table: [number, number][]): number {
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of table) {
    if (roll < weight) return value;
    roll -= weight;
  }
  return table[0][0];
}

// --- AI bowler: picks line/length each ball, biases batting risk ---

export type Line = "off" | "straight" | "leg";
export type Length = "short" | "good" | "full";
export interface Delivery {
  line: Line;
  length: Length;
}

const LINES: Line[] = ["off", "straight", "leg"];
const LENGTHS: Length[] = ["short", "good", "full"];

// good length is hardest to score off and easiest to get out to;
// short/full are easier to hit big but concede more boundaries
const LENGTH_RISK: Record<Length, { wicketMult: number; boundaryMult: number }> = {
  good: { wicketMult: 1.5, boundaryMult: 0.6 },
  short: { wicketMult: 0.8, boundaryMult: 1.3 },
  full: { wicketMult: 0.8, boundaryMult: 1.3 },
};

export function pickDelivery(previous?: Delivery): Delivery {
  let next: Delivery;
  do {
    next = {
      line: LINES[Math.floor(Math.random() * LINES.length)],
      length: LENGTHS[Math.floor(Math.random() * LENGTHS.length)],
    };
  } while (previous && next.line === previous.line && next.length === previous.length);
  return next;
}

export function resolveBall(shot: ShotType, delivery: Delivery): BallOutcome {
  const risk = LENGTH_RISK[delivery.length];
  const table: [number, number][] = OUTCOME_TABLES[shot].map(([value, weight]) => {
    if (value === -1) return [value, weight * risk.wicketMult];
    if (value >= 4) return [value, weight * risk.boundaryMult];
    return [value, weight];
  });
  const result = weightedPick(table);
  return result === -1
    ? { runs: 0, wicketLost: true }
    : { runs: result, wicketLost: false };
}

export function createMatchState(): MatchState {
  return { score: 0, wickets: 0, balls: 0, isOut: false };
}

export function playBall(state: MatchState, shot: ShotType, delivery: Delivery): BallOutcome {
  const outcome = resolveBall(shot, delivery);
  state.score += outcome.runs;
  state.balls += 1;
  if (outcome.wicketLost) state.wickets += 1;
  if (state.wickets >= MAX_WICKETS || state.balls >= MAX_BALLS) {
    state.isOut = true;
  }
  return outcome;
}

export function oversDisplay(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}
