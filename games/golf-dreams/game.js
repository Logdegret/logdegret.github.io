import * as THREE from "./vendor/three.module.min.js";

const sceneRoot = document.getElementById("scene");

const holes = [
  { par: 4, distance: 430, terrain: "tropic", wind: 15, water: 0.15, dogleg: -14 },
  { par: 3, distance: 218, terrain: "canyon", wind: 8, water: 0.35, dogleg: 12 },
  { par: 5, distance: 540, terrain: "alpine", wind: 18, water: 0.24, dogleg: 20 }
];

const clubs = [
  { id: "D", name: "Driver", yards: 300, loft: 0.42, forgiveness: 0.48, color: 0x19b9d5 },
  { id: "3w", name: "3 Wood", yards: 240, loft: 0.48, forgiveness: 0.58, color: 0x6c57ff },
  { id: "5i", name: "Iron", yards: 170, loft: 0.62, forgiveness: 0.72, color: 0x617d96 },
  { id: "Pw", name: "Wedge", yards: 115, loft: 0.88, forgiveness: 0.82, color: 0xff73c9 },
  { id: "Pt", name: "Putter", yards: 45, loft: 0.08, forgiveness: 0.9, color: 0xf5f9ff }
];

const state = {
  holeIndex: 0,
  strokes: 1,
  remaining: holes[0].distance,
  aim: 0,
  power: 82,
  club: clubs[0],
  lie: "Tee",
  coins: 300,
  scores: [],
  finished: false,
  animating: false,
  ball: new THREE.Vector3(0, 0.75, 55),
  hole: new THREE.Vector3(holes[0].dogleg, 0.72, -86)
};

const els = {
  lie: document.getElementById("lie"),
  distance: document.getElementById("distance"),
  holeLabel: document.getElementById("holeLabel"),
  parLabel: document.getElementById("parLabel"),
  holeDistance: document.getElementById("holeDistance"),
  strokeCount: document.getElementById("strokeCount"),
  windLabel: document.getElementById("windLabel"),
  messageTitle: document.getElementById("messageTitle"),
  messageText: document.getElementById("messageText"),
  clubRow: document.getElementById("clubRow"),
  powerRange: document.getElementById("powerRange"),
  swingButton: document.getElementById("swingButton"),
  aimLeft: document.getElementById("aimLeft"),
  aimRight: document.getElementById("aimRight"),
  scoreView: document.getElementById("scoreView"),
  shopView: document.getElementById("shopView"),
  scoreRows: document.getElementById("scoreRows"),
  upgradeGrid: document.getElementById("upgradeGrid"),
  coinCount: document.getElementById("coinCount")
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneRoot.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xaee8d6, 70, 210);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
const cameraTarget = new THREE.Vector3();

const hemi = new THREE.HemisphereLight(0xdffcff, 0x5a6d3d, 2.3);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1c6, 2.4);
sun.position.set(-35, 58, 42);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95;
sun.shadow.camera.bottom = -95;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const materials = {
  rough: new THREE.MeshStandardMaterial({ color: 0x9bd765, roughness: 0.9 }),
  fairway: new THREE.MeshStandardMaterial({ color: 0x54c45a, roughness: 0.86 }),
  green: new THREE.MeshStandardMaterial({ color: 0x79d95d, roughness: 0.82 }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x4fc9dc,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.15,
    transparent: true,
    opacity: 0.82
  }),
  sand: new THREE.MeshStandardMaterial({ color: 0xf2d68b, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x8a613d, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x77d84f, roughness: 0.78 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }),
  flag: new THREE.MeshStandardMaterial({ color: 0xff3e54, roughness: 0.6 })
};

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(1.15, 32, 18),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28 })
);
ball.castShadow = true;
scene.add(ball);

const aimLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 })
);
scene.add(aimLine);

const shotLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0x25dcff, transparent: true, opacity: 0.85 })
);
scene.add(shotLine);

let flagGroup = new THREE.Group();
let waterMesh = null;
let animation = null;

function currentHole() {
  return holes[state.holeIndex];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function holeLengthUnits(hole = currentHole()) {
  return clamp(hole.distance * 0.34, 78, 176);
}

function setMessage(title, text) {
  els.messageTitle.textContent = title;
  els.messageText.textContent = text;
}

function clearWorld() {
  while (world.children.length) {
    const child = world.children.pop();
    child.traverse?.((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((mat) => mat.dispose?.());
    });
  }
  scene.remove(flagGroup);
}

function makeTerrain(hole) {
  const geometry = new THREE.PlaneGeometry(120, 230, 48, 72);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const h = Math.sin(x * 0.07) * 0.7 + Math.cos(z * 0.045) * 0.8 + Math.sin((x + z) * 0.032) * 0.45;
    positions.setY(i, h - 0.18);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, materials.rough);
  mesh.receiveShadow = true;
  world.add(mesh);
}

function shapeMesh(points, material, y = 0.08) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function makeCourse(hole) {
  const endZ = -holeLengthUnits(hole) + 55;
  state.hole.set(hole.dogleg, 0.72, endZ);

  const fairway = shapeMesh([
    [-12, 58],
    [12, 58],
    [18 + hole.dogleg * 0.28, 18],
    [10 + hole.dogleg * 0.72, endZ + 18],
    [hole.dogleg + 15, endZ - 7],
    [hole.dogleg - 15, endZ - 7],
    [-13 + hole.dogleg * 0.5, endZ + 25],
    [-20, 18]
  ], materials.fairway, 0.12);
  world.add(fairway);

  const green = new THREE.Mesh(new THREE.CircleGeometry(17, 54), materials.green);
  green.rotation.x = -Math.PI / 2;
  green.position.set(hole.dogleg, 0.22, endZ);
  green.receiveShadow = true;
  world.add(green);

  const tee = new THREE.Mesh(new THREE.CircleGeometry(8, 32), materials.green);
  tee.rotation.x = -Math.PI / 2;
  tee.position.set(0, 0.24, 55);
  tee.receiveShadow = true;
  world.add(tee);

  const bunker = shapeMesh([
    [hole.dogleg - 31, endZ + 2],
    [hole.dogleg - 20, endZ + 12],
    [hole.dogleg - 10, endZ + 2],
    [hole.dogleg - 17, endZ - 8],
    [hole.dogleg - 29, endZ - 7]
  ], materials.sand, 0.2);
  world.add(bunker);

  if (hole.water > 0.18) {
    waterMesh = shapeMesh([
      [18, 18],
      [58, 2],
      [60, -120],
      [hole.dogleg + 17, endZ + 10],
      [10, -10]
    ], materials.water, 0.32);
    world.add(waterMesh);
  } else {
    waterMesh = shapeMesh([
      [22, 12],
      [60, -5],
      [60, -78],
      [28, -58],
      [15, -12]
    ], materials.water, 0.32);
    world.add(waterMesh);
  }

  makeFlag(hole.dogleg, endZ);
  makeDecor(hole, endZ);
}

function makeFlag(x, z) {
  flagGroup = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 15, 12), materials.white);
  pole.position.y = 7.5;
  pole.castShadow = true;
  flagGroup.add(pole);

  const flagGeometry = new THREE.BufferGeometry();
  flagGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 14.4, 0,
    9, 12.5, 0,
    0, 10.8, 0
  ], 3));
  flagGeometry.computeVertexNormals();
  const flag = new THREE.Mesh(flagGeometry, materials.flag);
  flag.castShadow = true;
  flagGroup.add(flag);

  const cup = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 8, 32), new THREE.MeshStandardMaterial({ color: 0x31523a }));
  cup.rotation.x = Math.PI / 2;
  cup.position.y = 0.3;
  flagGroup.add(cup);

  flagGroup.position.set(x, 0.7, z);
  scene.add(flagGroup);
}

function makePalm(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * scale, 1.05 * scale, 11 * scale, 8), materials.trunk);
  trunk.position.y = 5.5 * scale;
  trunk.rotation.z = 0.13;
  trunk.castShadow = true;
  group.add(trunk);

  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.3 * scale, 9 * scale, 8), materials.leaf);
    leaf.position.y = 11.3 * scale;
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  world.add(group);
}

function makePine(x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * scale, 1 * scale, 8 * scale, 8), materials.trunk);
  trunk.position.set(x, 4 * scale, z);
  trunk.castShadow = true;
  world.add(trunk);
  for (let i = 0; i < 3; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry((6 - i) * scale, 11 * scale, 8), materials.leaf);
    cone.position.set(x, (8 + i * 4) * scale, z);
    cone.castShadow = true;
    world.add(cone);
  }
}

function makeMountain(x, z, radius, height, color) {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 5),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  mountain.position.set(x, height / 2 - 3, z);
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  world.add(mountain);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.45, height * 0.28, 5),
    new THREE.MeshStandardMaterial({ color: 0xe9f0d6, roughness: 1 })
  );
  cap.position.set(x, height * 0.84 - 3, z);
  cap.castShadow = true;
  world.add(cap);
}

function makeDecor(hole, endZ) {
  const treeFn = hole.terrain === "alpine" ? makePine : makePalm;
  treeFn(-35, 30, 1.1);
  treeFn(33, 10, 0.9);
  treeFn(-42, -42, 0.8);
  treeFn(40, -78, 0.75);
  treeFn(hole.dogleg + 28, endZ + 8, 0.65);

  const mountainColor = hole.terrain === "canyon" ? 0xc27625 : hole.terrain === "alpine" ? 0x697565 : 0x91d25d;
  makeMountain(-58, -120, 22, 46, mountainColor);
  makeMountain(54, -134, 26, 58, mountainColor);
  makeMountain(3, -164, 30, 68, mountainColor);
}

function makeSky(hole) {
  const top = hole.terrain === "alpine" ? 0x34486b : hole.terrain === "canyon" ? 0xd8b879 : 0x2fc7cc;
  const bottom = hole.terrain === "alpine" ? 0xe0a990 : hole.terrain === "canyon" ? 0xaaf1df : 0xc5ffe0;
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const gradient = c.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, `#${top.toString(16).padStart(6, "0")}`);
  gradient.addColorStop(1, `#${bottom.toString(16).padStart(6, "0")}`);
  c.fillStyle = gradient;
  c.fillRect(0, 0, 16, 256);
  const texture = new THREE.CanvasTexture(canvas);
  scene.background = texture;
  scene.fog.color.set(bottom);
}

function rebuildHole() {
  clearWorld();
  const hole = currentHole();
  makeSky(hole);
  makeTerrain(hole);
  makeCourse(hole);
  state.ball.set(0, 1.35, 55);
  state.remaining = hole.distance;
  state.strokes = 1;
  state.lie = "Tee";
  state.aim = 0;
  ball.position.copy(state.ball);
  updateAimLine();
  renderHud();
}

function updateAimLine() {
  const hole = currentHole();
  const power = Number(els.powerRange.value) / 100;
  const shotUnits = state.club.yards * power * 0.34;
  const windPush = (hole.wind / 15) * (hole.dogleg / 32);
  const side = state.aim * 38 + windPush;
  const forward = Math.min(shotUnits, state.ball.z - state.hole.z);
  const target = new THREE.Vector3(
    clamp(state.ball.x + side, -42, 42),
    1.25,
    state.ball.z - forward
  );
  const curve = new THREE.QuadraticBezierCurve3(
    state.ball.clone().add(new THREE.Vector3(0, 0.2, 0)),
    new THREE.Vector3((state.ball.x + target.x) / 2, 9 + state.club.loft * 10, (state.ball.z + target.z) / 2),
    target
  );
  aimLine.geometry.dispose();
  aimLine.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
}

function renderClubs() {
  els.clubRow.innerHTML = "";
  clubs.forEach((club) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `club-card${state.club.id === club.id ? " is-active" : ""}`;
    button.innerHTML = `<small>${club.id}</small><strong>${club.name}</strong><span>${Math.round(club.yards)} yds</span>`;
    button.addEventListener("click", () => {
      state.club = club;
      renderHud();
      updateAimLine();
      setMessage(club.name, `${club.yards} yds, ${Math.round(club.forgiveness * 100)}% forgiveness.`);
    });
    els.clubRow.appendChild(button);
  });
}

function renderScore() {
  els.scoreRows.innerHTML = "";
  holes.forEach((hole, index) => {
    const score = state.scores[index];
    const rival = Math.max(2, hole.par + ((index % 2) ? 1 : 0));
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td>${hole.par}</td><td>${score || "-"}</td><td>${score ? rival : "-"}</td>`;
    els.scoreRows.appendChild(row);
  });
}

function renderShop() {
  els.coinCount.textContent = state.coins;
  els.upgradeGrid.innerHTML = "";
  clubs.forEach((club) => {
    const cost = Math.round(80 + club.yards * 0.5);
    const card = document.createElement("article");
    card.className = "upgrade-card";
    card.innerHTML = `
      <strong>${club.name}</strong>
      <div class="stat">Power <div class="bar"><span style="width:${clamp(club.yards / 3, 18, 100)}%"></span></div></div>
      <div class="stat">Loft <div class="bar"><span style="width:${club.loft * 100}%"></span></div></div>
      <div class="stat">Forgive <div class="bar"><span style="width:${club.forgiveness * 100}%"></span></div></div>
      <button type="button">${cost} coins</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      if (state.coins < cost) {
        setMessage("Need coins", "Finish holes to earn more upgrade coins.");
        return;
      }
      state.coins -= cost;
      club.yards += 8;
      club.forgiveness = clamp(club.forgiveness + 0.03, 0, 0.98);
      setMessage("Club upgraded", `${club.name} gained distance and forgiveness.`);
      renderHud();
      updateAimLine();
    });
    els.upgradeGrid.appendChild(card);
  });
}

function renderHud() {
  const hole = currentHole();
  els.lie.textContent = state.lie;
  els.distance.textContent = `${Math.max(0, Math.round(state.remaining))} yds`;
  els.holeLabel.textContent = `Hole ${state.holeIndex + 1}`;
  els.parLabel.textContent = `Par ${hole.par}`;
  els.holeDistance.textContent = `${hole.distance} yds`;
  els.strokeCount.textContent = state.strokes;
  els.windLabel.textContent = `${hole.wind} mph`;
  renderClubs();
  renderScore();
  renderShop();
}

function nextHole() {
  const score = Math.max(1, state.strokes - 1);
  state.scores[state.holeIndex] = score;
  state.coins += Math.max(40, 140 - Math.abs(score - currentHole().par) * 25);

  if (state.holeIndex >= holes.length - 1) {
    const total = state.scores.reduce((sum, value) => sum + value, 0);
    state.finished = true;
    state.holeIndex = 0;
    rebuildHole();
    setMessage("Round finished", `You finished in ${total} strokes. Swing to start again.`);
    return;
  }

  state.holeIndex += 1;
  rebuildHole();
  setMessage(`Hole ${state.holeIndex + 1}`, "Fresh tee shot. Let it fly.");
}

function swing() {
  if (state.animating) return;
  if (state.finished) {
    state.finished = false;
    state.scores = [];
    rebuildHole();
    setMessage("New round", "Pick a club, aim, and swing.");
    return;
  }

  const hole = currentHole();
  const power = Number(els.powerRange.value) / 100;
  const windPush = (hole.wind / 15) * (hole.dogleg / 32);
  const aimPenalty = Math.abs(state.aim + windPush * 0.08);
  const cleanHit = clamp(1 - aimPenalty * (1.15 - state.club.forgiveness), 0.68, 1.05);
  const yards = state.club.yards * power * cleanHit;
  const shotUnits = yards * 0.34;
  const side = state.aim * 38 + windPush;
  const target = new THREE.Vector3(
    clamp(state.ball.x + side, -38, 38),
    1.35,
    clamp(state.ball.z - shotUnits, state.hole.z, 58)
  );
  const endDistance = target.distanceTo(state.hole);
  const start = state.ball.clone();
  const peak = new THREE.Vector3(
    (start.x + target.x) / 2,
    7 + state.club.loft * 19,
    (start.z + target.z) / 2
  );
  const curve = new THREE.QuadraticBezierCurve3(start, peak, target);
  shotLine.geometry.dispose();
  shotLine.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));

  animation = { startTime: performance.now(), duration: state.club.id === "Pt" ? 720 : 1150, curve, target, yards, endDistance };
  state.animating = true;
  setMessage("Shot away", "Tracking the ball in 3D.");
}

function finishShot() {
  const { target, yards, endDistance } = animation;
  animation = null;
  state.animating = false;
  state.ball.copy(target);
  ball.position.copy(target);
  state.remaining = Math.max(0, state.remaining - yards);
  state.strokes += 1;

  const waterPenalty = waterMesh && target.x > 17 && target.z < 15 && target.z > -120;
  if (waterPenalty) {
    state.remaining += 45;
    state.ball.z += 12;
    ball.position.copy(state.ball);
    state.lie = "Drop";
    setMessage("Splash", "Penalty drop. Club down and recover.");
  } else if (endDistance < 5.5 || state.remaining <= 8) {
    setMessage("In the cup", `${Math.max(1, state.strokes - 1)} strokes on a par ${currentHole().par}.`);
    setTimeout(nextHole, 900);
  } else {
    state.lie = state.remaining < 45 ? "Green" : state.remaining < 135 ? "Fairway" : "Rough";
    setMessage("Shot away", `${Math.round(yards)} yds. ${Math.round(state.remaining)} yds left.`);
  }

  if (state.remaining < 55) state.club = clubs[4];
  else if (state.remaining < 130 && state.club.id === "D") state.club = clubs[3];
  renderHud();
  updateAimLine();
}

function setView(view) {
  document.querySelectorAll(".screen-tabs button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  els.scoreView.classList.toggle("is-hidden", view !== "score");
  els.shopView.classList.toggle("is-hidden", view !== "shop");
}

function resize() {
  const width = sceneRoot.clientWidth || 1;
  const height = sceneRoot.clientHeight || 1;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  const desired = new THREE.Vector3(
    state.ball.x * 0.45,
    19,
    state.ball.z + 43
  );
  camera.position.lerp(desired, 0.08);
  cameraTarget.set(state.ball.x * 0.55, 1.2, state.ball.z - 42);
  camera.lookAt(cameraTarget);
}

function animate(now) {
  if (animation) {
    const t = clamp((now - animation.startTime) / animation.duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 2.4);
    ball.position.copy(animation.curve.getPoint(eased));
    if (t >= 1) finishShot();
  }

  if (waterMesh) {
    waterMesh.material.opacity = 0.76 + Math.sin(now * 0.002) * 0.06;
  }
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

els.powerRange.addEventListener("input", () => {
  state.power = Number(els.powerRange.value);
  updateAimLine();
});
els.swingButton.addEventListener("click", swing);
els.aimLeft.addEventListener("click", () => {
  state.aim = clamp(state.aim - 0.06, -0.42, 0.42);
  updateAimLine();
});
els.aimRight.addEventListener("click", () => {
  state.aim = clamp(state.aim + 0.06, -0.42, 0.42);
  updateAimLine();
});

document.querySelectorAll(".screen-tabs button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => setView("play"));
});

renderer.domElement.addEventListener("pointerdown", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  state.aim = clamp((x - 0.5) * 0.95, -0.42, 0.42);
  updateAimLine();
});

window.addEventListener("resize", () => {
  resize();
  updateAimLine();
});

resize();
rebuildHole();
setMessage("Golf Dreams 3D", "Real 3D course. Aim, choose a club, and swing.");
requestAnimationFrame(animate);
