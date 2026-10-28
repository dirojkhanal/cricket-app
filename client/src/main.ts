import * as THREE from "three";
import {
  createMatchState,
  playBall,
  oversDisplay,
  type ShotType,
} from "./game";

const app = document.querySelector<HTMLDivElement>("#app")!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// ground (outfield)
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64),
  new THREE.MeshStandardMaterial({ color: 0x2e8b57 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// pitch strip
const pitch = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 20),
  new THREE.MeshStandardMaterial({ color: 0xc2a05a }),
);
pitch.rotation.x = -Math.PI / 2;
pitch.position.y = 0.01; // avoid z-fighting with ground
scene.add(pitch);

// lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- single-player scoring UI overlay (client-side only, no network/AI yet) ---

const ui = document.createElement("div");
ui.style.cssText =
  "position:fixed;top:0;left:0;right:0;padding:12px;font-family:sans-serif;color:#fff;" +
  "text-shadow:0 1px 3px rgba(0,0,0,0.8);display:flex;justify-content:space-between;align-items:center;";
app.appendChild(ui);

const scoreboard = document.createElement("div");
scoreboard.style.fontSize = "18px";
ui.appendChild(scoreboard);

const controls = document.createElement("div");
controls.style.cssText = "position:fixed;bottom:20px;left:0;right:0;display:flex;justify-content:center;gap:12px;";
app.appendChild(controls);

const state = createMatchState();

function makeButton(label: string, shot: ShotType) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText =
    "padding:12px 20px;font-size:16px;border-radius:8px;border:none;cursor:pointer;background:#fff;";
  btn.addEventListener("click", () => {
    if (state.isOut) return;
    playBall(state, shot);
    render();
  });
  controls.appendChild(btn);
}

makeButton("Defend", "defend");
makeButton("Normal", "normal");
makeButton("Big Shot", "big");

function render() {
  scoreboard.textContent = state.isOut
    ? `Innings over — Final: ${state.score}/${state.wickets} (${oversDisplay(state.balls)} overs)`
    : `${state.score}/${state.wickets}  (${oversDisplay(state.balls)} ov)`;
}

render();
