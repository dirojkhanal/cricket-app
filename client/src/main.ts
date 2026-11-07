import * as THREE from "three";
import { Client, Room } from "colyseus.js";
import type { MatchStateDTO, ShotType, Line, Length } from "../../shared/types";
import { oversDisplay } from "./game";

// --- Three.js scene ---

const app = document.querySelector<HTMLDivElement>("#app")!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64),
  new THREE.MeshStandardMaterial({ color: 0x2e8b57 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const pitch = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 20),
  new THREE.MeshStandardMaterial({ color: 0xc2a05a }),
);
pitch.rotation.x = -Math.PI / 2;
pitch.position.y = 0.01;
scene.add(pitch);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
(function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); })();

// --- helpers ---

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (text !== undefined && "textContent" in e) (e as HTMLElement).textContent = text;
  return e;
}

// --- HUD (always visible once playing) ---

const scoreboard = el("div",
  "position:fixed;top:0;left:0;padding:12px;font-family:sans-serif;font-size:18px;" +
  "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);");
app.appendChild(scoreboard);

const roleLabel = el("div",
  "position:fixed;top:0;right:12px;padding:12px;font-family:sans-serif;font-size:15px;" +
  "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);");
app.appendChild(roleLabel);

const infoLine = el("div",
  "position:fixed;top:48px;left:0;right:0;text-align:center;font-family:sans-serif;font-size:15px;" +
  "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);");
app.appendChild(infoLine);

const flashMsg = el("div",
  "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
  "font-family:sans-serif;font-size:48px;font-weight:900;pointer-events:none;" +
  "text-shadow:0 2px 8px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.15s;");
app.appendChild(flashMsg);
let flashTimer = 0;

function showFlash(text: string, color: string) {
  flashMsg.textContent = text;
  (flashMsg as HTMLElement).style.color = color;
  (flashMsg as HTMLElement).style.opacity = "1";
  clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => { (flashMsg as HTMLElement).style.opacity = "0"; }, 1200);
}

// --- Lobby overlay ---

const lobby = el("div",
  "position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
  "gap:16px;background:rgba(0,0,0,0.55);font-family:sans-serif;");
app.appendChild(lobby);

const title = el("h1", "color:#fff;margin:0 0 8px;text-shadow:0 2px 6px rgba(0,0,0,0.9);font-size:28px;", "🏏 Cricket");
lobby.appendChild(title);

const errMsg = el("div", "color:#f88;font-size:14px;min-height:20px;");
lobby.appendChild(errMsg);

const btnStyle = "padding:12px 28px;font-size:16px;border-radius:8px;border:none;cursor:pointer;background:#fff;font-weight:600;";

const vsAIBtn  = el("button", btnStyle, "Play vs AI");
const createBtn = el("button", btnStyle, "Create Room");
lobby.appendChild(vsAIBtn);
lobby.appendChild(createBtn);

const joinRow = el("div", "display:flex;gap:8px;");
const codeInput = el("input", "padding:10px 14px;font-size:16px;border-radius:8px;border:none;width:140px;", "");
(codeInput as HTMLInputElement).placeholder = "Room code";
const joinBtn = el("button", btnStyle, "Join Room");
joinRow.appendChild(codeInput);
joinRow.appendChild(joinBtn);
lobby.appendChild(joinRow);

const roomCodeDisplay = el("div",
  "color:#fff;font-size:22px;font-weight:700;letter-spacing:4px;text-shadow:0 2px 6px rgba(0,0,0,0.9);display:none;");
lobby.appendChild(roomCodeDisplay);

// --- Controls (shown during play) ---

const controls = el("div",
  "position:fixed;bottom:20px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:10px;");
controls.style.display = "none";
app.appendChild(controls);

// Batter controls
const batterControls = el("div", "display:flex;gap:12px;");
controls.appendChild(batterControls);

// Bowler controls
const bowlerControls = el("div", "display:none;flex-direction:column;align-items:center;gap:8px;");
const lineRow  = el("div", "display:flex;gap:8px;");
const lengthRow = el("div", "display:flex;gap:8px;");
const bowlBtn  = el("button", btnStyle + "opacity:0.4;", "Bowl!");
(bowlBtn as HTMLButtonElement).disabled = true;
bowlerControls.appendChild(el("div", "color:#fff;font-size:13px;text-shadow:0 1px 3px rgba(0,0,0,0.8);", "Pick line:"));
bowlerControls.appendChild(lineRow);
bowlerControls.appendChild(el("div", "color:#fff;font-size:13px;text-shadow:0 1px 3px rgba(0,0,0,0.8);", "Pick length:"));
bowlerControls.appendChild(lengthRow);
bowlerControls.appendChild(bowlBtn);
controls.appendChild(bowlerControls);

// --- game over overlay ---

const gameOverOverlay = el("div",
  "position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;" +
  "gap:20px;background:rgba(0,0,0,0.75);font-family:sans-serif;");
app.appendChild(gameOverOverlay);

const gameOverTitle = el("h2", "color:#fff;margin:0;font-size:32px;text-shadow:0 2px 6px rgba(0,0,0,0.9);");
gameOverOverlay.appendChild(gameOverTitle);
const gameOverScore = el("div", "color:#ffd700;font-size:22px;font-weight:700;");
gameOverOverlay.appendChild(gameOverScore);
const playAgainBtn = el("button",
  "padding:12px 32px;font-size:17px;border-radius:8px;border:none;cursor:pointer;background:#fff;font-weight:700;",
  "Play Again");
gameOverOverlay.appendChild(playAgainBtn);

playAgainBtn.addEventListener("click", () => {
  gameOverOverlay.style.display = "none";
  lobby.style.display = "flex";
  controls.style.display = "none";
  scoreboard.textContent = "";
  roleLabel.textContent = "";
  infoLine.textContent = "";
  myRole = null;
  room = null;
  vsAIBtn.removeAttribute("disabled");
  createBtn.removeAttribute("disabled");
  (joinBtn as HTMLButtonElement).disabled = false;
});

// --- state ---

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
const colyseusClient = new Client(SERVER_URL);
let room: Room | null = null;
let myRole: "batter" | "bowler" | null = null;
let selectedLine: Line | null = null;
let selectedLength: Length | null = null;
let prevBalls = 0;

// --- render ---

function renderState(s: MatchStateDTO) {
  const playing = s.phase === "playing" || s.phase === "over";
  if (playing && lobby.style.display !== "none") {
    lobby.style.display = "none";
    controls.style.display = "flex";
  }

  if (s.phase === "waiting") {
    infoLine.textContent = `Waiting for opponent… Room code: ${room?.roomId ?? ""}`;
    return;
  }

  // flash on new ball resolved
  if (s.balls > prevBalls) {
    prevBalls = s.balls;
    if (s.lastWicket) showFlash("WICKET!", "#ff4444");
    else if (s.lastRuns === 6) showFlash("SIX! 🏏", "#ffd700");
    else if (s.lastRuns === 4) showFlash("FOUR!", "#4fc3f7");
    else if (s.lastRuns > 0) showFlash(`+${s.lastRuns}`, "#aef");
    else showFlash("DOT", "#aaa");
  }

  scoreboard.textContent = s.isOver
    ? `Final: ${s.score}/${s.wickets} (${oversDisplay(s.balls)} ov)`
    : `${s.score}/${s.wickets}  (${oversDisplay(s.balls)} ov)`;

  if (s.isOver && gameOverOverlay.style.display !== "flex") {
    gameOverOverlay.style.display = "flex";
    gameOverTitle.textContent = "Innings Over";
    gameOverScore.textContent = `${s.score} runs • ${s.wickets} wickets • ${oversDisplay(s.balls)} overs`;
    controls.style.display = "none";
  }

  if (myRole === "batter") {
    batterControls.style.display = "flex";
    bowlerControls.style.display = "none";
    infoLine.textContent = s.isOver ? "" :
      s.batterReady ? "Waiting for bowler…" :
      `Incoming: ${s.deliveryLength} length, ${s.deliveryLine}`;
    const shotsDone = s.batterReady || s.isOver;
    batterControls.querySelectorAll("button").forEach(b => ((b as HTMLButtonElement).disabled = shotsDone));
  } else if (myRole === "bowler") {
    batterControls.style.display = "none";
    bowlerControls.style.display = "flex";
    infoLine.textContent = s.isOver ? "" :
      s.bowlerReady ? "Waiting for batter…" : "Choose your delivery:";
    const bowled = s.bowlerReady || s.isOver;
    lineRow.querySelectorAll("button").forEach(b   => ((b as HTMLButtonElement).disabled = bowled));
    lengthRow.querySelectorAll("button").forEach(b => ((b as HTMLButtonElement).disabled = bowled));
    if (bowled) {
      selectedLine = null; selectedLength = null;
      lineRow.querySelectorAll("button").forEach(b   => (b as HTMLButtonElement).style.background = "#fff");
      lengthRow.querySelectorAll("button").forEach(b => (b as HTMLButtonElement).style.background = "#fff");
      (bowlBtn as HTMLButtonElement).disabled = true;
      (bowlBtn as HTMLButtonElement).style.opacity = "0.4";
    }
  }
}

// --- batter buttons ---

function makeShotBtn(label: string, shot: ShotType) {
  const btn = el("button", btnStyle, label) as HTMLButtonElement;
  btn.addEventListener("click", () => { room?.send("shot", { shot }); });
  batterControls.appendChild(btn);
}
makeShotBtn("Defend", "defend");
makeShotBtn("Normal", "normal");
makeShotBtn("Big Shot", "big");

// --- bowler buttons ---

function makeToggleBtn(container: HTMLElement, label: string, onClick: () => void) {
  const btn = el("button", btnStyle, label) as HTMLButtonElement;
  btn.addEventListener("click", () => {
    container.querySelectorAll("button").forEach(b => (b as HTMLButtonElement).style.background = "#fff");
    btn.style.background = "#aef";
    onClick();
  });
  container.appendChild(btn);
  return btn;
}

(["off", "straight", "leg"] as Line[]).forEach(l =>
  makeToggleBtn(lineRow, l, () => {
    selectedLine = l;
    updateBowlBtn();
  })
);
(["short", "good", "full"] as Length[]).forEach(l =>
  makeToggleBtn(lengthRow, l, () => {
    selectedLength = l;
    updateBowlBtn();
  })
);

function updateBowlBtn() {
  const ready = selectedLine !== null && selectedLength !== null;
  (bowlBtn as HTMLButtonElement).disabled = !ready;
  (bowlBtn as HTMLButtonElement).style.opacity = ready ? "1" : "0.4";
}

(bowlBtn as HTMLButtonElement).addEventListener("click", () => {
  if (!selectedLine || !selectedLength) return;
  room?.send("delivery", { line: selectedLine, length: selectedLength });
});

// --- lobby actions ---

async function connect(options: { vsAI?: boolean; joinCode?: string }) {
  errMsg.textContent = "";
  vsAIBtn.setAttribute("disabled", "");
  createBtn.setAttribute("disabled", "");
  (joinBtn as HTMLButtonElement).disabled = true;

  try {
    if (options.joinCode) {
      room = await colyseusClient.joinById(options.joinCode);
    } else {
      room = await colyseusClient.create("cricket", { vsAI: options.vsAI ?? false });
    }

    if (!options.vsAI && !options.joinCode) {
      roomCodeDisplay.textContent = `Code: ${room.roomId}`;
      roomCodeDisplay.style.display = "block";
    }

    room.onMessage("role", (msg: { role: "batter" | "bowler" }) => {
      myRole = msg.role;
      roleLabel.textContent = myRole === "batter" ? "🏏 Batting" : "⚾ Bowling";
    });

    room.onStateChange((state: any) => renderState(state as MatchStateDTO));
  } catch (e: any) {
    errMsg.textContent = e?.message ?? "Could not connect. Is the server running?";
    vsAIBtn.removeAttribute("disabled");
    createBtn.removeAttribute("disabled");
    (joinBtn as HTMLButtonElement).disabled = false;
  }
}

vsAIBtn.addEventListener("click",  () => connect({ vsAI: true }));
createBtn.addEventListener("click", () => connect({}));
joinBtn.addEventListener("click",   () => {
  const code = (codeInput as HTMLInputElement).value.trim();
  if (code) connect({ joinCode: code });
});
(codeInput as HTMLInputElement).addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const code = (codeInput as HTMLInputElement).value.trim();
    if (code) connect({ joinCode: code });
  }
});
