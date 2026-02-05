import * as THREE from "three";

// hypercube data
function buildTesseract() {
  const verts4 = [];

  for (let i = 0; i < 16; i++) {
    verts4.push(
      new THREE.Vector4(
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      )
    );
  }

  // edges
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit);
      if (i < j) edges.push([i, j]);
    }
  }

  return { verts4, edges };
}

// 4D rotation
function rotateInPlane(v, a, b, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);

  const va = v.getComponent(a);
  const vb = v.getComponent(b);

  v.setComponent(a, c * va - s * vb);
  v.setComponent(b, s * va + c * vb);
}

// 4D to 3D projection
function project4Dto3D(v4, distance = 4) {
  const w = distance - v4.w;
  const k = 1 / w;
  const scale = 2.0;
  return new THREE.Vector3(
    v4.x * k * scale,
    v4.y * k * scale,
    v4.z * k * scale
  );
}

// three.js setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0f);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 6;

// lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(2, 3, 4);
scene.add(light);

// lines
const { verts4, edges } = buildTesseract();
const baseVerts = verts4.map(v => v.clone());

const positions = new Float32Array(edges.length * 2 * 3);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const material = new THREE.LineBasicMaterial({
  color: 0x8be9fd
});

const lines = new THREE.LineSegments(geometry, material);
scene.add(lines);

// dimension selector
const ui = document.createElement("div");
ui.className = "ui-panel";
ui.innerHTML = `
  <strong>Mouse rotates plane</strong><br/>
  <label><input type="radio" name="plane" value="xy" checked /> XY</label><br/>
  <label><input type="radio" name="plane" value="xz" /> XZ</label><br/>
  <label><input type="radio" name="plane" value="xw" /> XW</label><br/>
  <label><input type="radio" name="plane" value="yz" /> YZ</label><br/>
  <label><input type="radio" name="plane" value="yw" /> YW</label><br/>
  <label><input type="radio" name="plane" value="zw" /> ZW</label>
`;
document.body.appendChild(ui);

const planeMap = {
  xy: [0, 1],
  xz: [0, 2],
  xw: [0, 3],
  yz: [1, 2],
  yw: [1, 3],
  zw: [2, 3]
};

let activePlane = "xy";
ui.addEventListener("change", (e) => {
  if (e.target.name === "plane") {
    activePlane = e.target.value;
  }
});

// mouse movements
let dragging = false;
let lastX = 0;
let lastY = 0;

let userHasInteracted = false;
const autoRotateSpeed = 0.01;

renderer.domElement.addEventListener("pointerdown", (e) => {
  dragging = true;
  userHasInteracted = true;
  lastX = e.clientX;
  lastY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener("pointerup", (e) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(e.pointerId);
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  const theta = (dx + dy) * 0.005;
  const [a, b] = planeMap[activePlane];

  verts4.forEach(v => rotateInPlane(v, a, b, theta));
});

// animation
function updateGeometry() {
  let i = 0;
  for (const [a, b] of edges) {
    const p1 = project4Dto3D(verts4[a]);
    const p2 = project4Dto3D(verts4[b]);

    positions[i++] = p1.x;
    positions[i++] = p1.y;
    positions[i++] = p1.z;

    positions[i++] = p2.x;
    positions[i++] = p2.y;
    positions[i++] = p2.z;
  }

  geometry.attributes.position.needsUpdate = true;
}

function animate() {
  if (!userHasInteracted && !dragging) {
    const theta1 = autoRotateSpeed;
    const theta2 = autoRotateSpeed * 0.7;

    verts4.forEach(v => rotateInPlane(v, 0, 3, theta1));
    verts4.forEach(v => rotateInPlane(v, 1, 2, theta2));
  }
  updateGeometry();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();


// utilities
window.addEventListener("keydown", (e) => {
  if (e.key === "r") {
    verts4.forEach((v, i) => v.copy(baseVerts[i]));
  }
});

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});