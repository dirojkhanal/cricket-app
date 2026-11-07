import * as THREE from "three";
import { Client, Room } from "colyseus.js";
import type { MatchStateDTO, ShotType } from "../../shared/types";
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

// --- UI ---

const ui = document.createElement("div");
ui.style.cssText =
  "position:fixed;top:0;left:0;right:0;padding:12px;font-family:sans-serif;color:#fff;" +
  "text-shadow:0 1px 3px rgba(0,0,0,0.8);display:flex;justify-content:space-between;align-items:center;";
app.appendChild(ui);

const scoreboard = document.createElement("div");
scoreboard.style.fontSize = "18px";
ui.appendChild(scoreboard);

const bowlerLine = document.createElement("div");
bowlerLine.style.cssText =
  "position:fixed;top:48px;left:0;right:0;text-align:center;font-size:15px;" +
  "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);";
app.appendChild(bowlerLine);

const controls = document.createElement("div");
controls.style.cssText =
  "position:fixed;bottom:20px;left:0;right:0;display:flex;justify-content:center;gap:12px;";
app.appendChild(controls);

const statusEl = document.createElement("div");
statusEl.style.cssText =
  "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
  "font-family:sans-serif;font-size:20px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.9);";
statusEl.textContent = "Connecting to server…";
app.appendChild(statusEl);

// --- Colyseus connection ---

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
const colyseusClient = new Client(SERVER_URL);
let room: Room | null = null;

function renderState(s: MatchStateDTO) {
  statusEl.textContent = "";
  scoreboard.textContent = s.isOver
    ? `Innings over — Final: ${s.score}/${s.wickets} (${oversDisplay(s.balls)} overs)`
    : `${s.score}/${s.wickets}  (${oversDisplay(s.balls)} ov)`;
  bowlerLine.textContent = s.isOver
    ? ""
    : `AI bowls: ${s.deliveryLength} length, ${s.deliveryLine}`;
  buttons.forEach(b => (b.disabled = s.isOver));
}

function sendShot(shot: ShotType) {
  room?.send("shot", { shot });
}

const buttons: HTMLButtonElement[] = [];
function makeButton(label: string, shot: ShotType) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.disabled = true;
  btn.style.cssText =
    "padding:12px 20px;font-size:16px;border-radius:8px;border:none;cursor:pointer;background:#fff;";
  btn.addEventListener("click", () => sendShot(shot));
  controls.appendChild(btn);
  buttons.push(btn);
}

makeButton("Defend", "defend");
makeButton("Normal", "normal");
makeButton("Big Shot", "big");

(async () => {
  try {
    room = await colyseusClient.create("cricket");
    statusEl.textContent = "";
    buttons.forEach(b => (b.disabled = false));

    room.onStateChange((state: any) => renderState(state as MatchStateDTO));
  } catch (e) {
    statusEl.textContent = "Could not connect to server. Is it running?";
    console.error(e);
  }
})();
