import { createMatchState, playBall, oversDisplay, MAX_BALLS, MAX_WICKETS } from "./game";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
}

// innings ends exactly at MAX_BALLS if no wickets fall (force "defend" which rarely gets out, so loop a few times to tolerate variance isn't needed — just check the cap logic directly)
{
  const state = createMatchState();
  state.balls = MAX_BALLS - 1;
  playBall(state, "defend");
  assert(state.isOut, "innings should end when balls reach MAX_BALLS");
}

// innings ends when wickets reach MAX_WICKETS
{
  const state = createMatchState();
  state.wickets = MAX_WICKETS - 1;
  state.isOut = false;
  // force a wicket outcome deterministically by monkey-patching Math.random to pick the wicket slot
  const orig = Math.random;
  Math.random = () => 0.999; // pushes roll to the end of the weighted table (wicket slot)
  playBall(state, "defend");
  Math.random = orig;
  assert(state.wickets === MAX_WICKETS, "wicket count should increment");
  assert(state.isOut, "innings should end when wickets reach MAX_WICKETS");
}

assert(oversDisplay(7) === "1.1", "oversDisplay should format balls as overs.balls");
assert(oversDisplay(0) === "0.0", "oversDisplay should format 0 balls as 0.0");

console.log("game.test.ts: all checks passed");
