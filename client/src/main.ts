import * as THREE from "three";

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
