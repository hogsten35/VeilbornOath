import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

/* -------------------------------------------------------
   Utilities
------------------------------------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;

/* -------------------------------------------------------
   UI Refs
------------------------------------------------------- */
const ui = {
  mode: document.getElementById("mode"),
  bossFlag: document.getElementById("bossFlag"),
  cd: document.getElementById("cd"),
  partyPanel: document.getElementById("partyPanel"),

  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),

  battleUI: document.getElementById("battleUI"),
  actionButtons: document.getElementById("actionButtons"),
  turnLabel: document.getElementById("turnLabel"),
  log: document.getElementById("log"),
  enemyName: document.getElementById("enemyName")
};

function logLine(text) {
  const div = document.createElement("div");
  div.textContent = text;
  ui.log.appendChild(div);
  ui.log.scrollTop = ui.log.scrollHeight;
}

/* -------------------------------------------------------
   Game Data
------------------------------------------------------- */
const Party = [
  { id: "cael",  name: "Cael",        hpMax: 120, hp: 120, atk: 16, def: 8, spd: 10, dread: 0, skillName: "Cleave", skillType: "dmg",  skillMul: 1.25 },
  { id: "serah", name: "Serah Mourn", hpMax: 95,  hp: 95,  atk: 14, def: 6, spd: 14, dread: 0, skillName: "Sunder", skillType: "dmg",  skillMul: 1.15 },
  { id: "iri",   name: "Iri Voss",    hpMax: 105, hp: 105, atk: 12, def: 7, spd: 9,  dread: 0, skillName: "Mend",   skillType: "heal", healAmt: 26 }
];

const EnemyDB = {
  sewer_gnawer:    { id: "sewer_gnawer",   name: "Sewer Gnawer",    hp: 60,  atk: 10, def: 4,  spd: 8,  tint: 0x4db7a3 },
  thread_mite:     { id: "thread_mite",    name: "Thread Mite",     hp: 48,  atk: 9,  def: 3,  spd: 12, tint: 0x8a76ff },
  lantern_thief:   { id: "lantern_thief",  name: "Lantern Thief",   hp: 72,  atk: 12, def: 5,  spd: 10, tint: 0xf4c16b },
  knot_wisp:       { id: "knot_wisp",      name: "Knot Wisp",       hp: 58,  atk: 11, def: 4,  spd: 13, tint: 0x98a9ff },
  thicket_stalker: { id: "thicket_stalker",name: "Thicket Stalker", hp: 110, atk: 18, def: 8,  spd: 12, tint: 0x68d6c5 },
  knotling_matron: { id: "knotling_matron",name: "Knotling Matron", hp: 320, atk: 22, def: 10, spd: 9,  boss: true, tint: 0xe07a8f }
};

const Pools = {
  easy: ["sewer_gnawer", "thread_mite", "lantern_thief"],
  mid:  ["knot_wisp", "lantern_thief", "sewer_gnawer"],
  hard: ["thicket_stalker", "knot_wisp", "lantern_thief"]
};

/* -------------------------------------------------------
   Game State
------------------------------------------------------- */
const Mode = { WORLD: "WORLD", BATTLE: "BATTLE" };
let mode = Mode.WORLD;

let bossCleared = false;
let encounterCooldown = 0;

const worldReturn = { pos: new THREE.Vector3(), yaw: 0 };

let enemy = null;
let battle = {
  active: false,
  phase: "idle", // player_turn | enemy_turn
  actorIndex: 0,
  aliveOrder: []
};

let retroFxEnabled = false; // visual toggle only

/* -------------------------------------------------------
   Three.js Setup
------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.setClearColor(0x101621, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101621);
scene.fog = new THREE.Fog(0x111722, 35, 150);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 500);
camera.position.set(0, 6, 10);

/* -------------------------------------------------------
   Lights (brighter/readable)
------------------------------------------------------- */
const hemi = new THREE.HemisphereLight(0xa8c1ea, 0x101318, 0.95);
scene.add(hemi);

const keyMoon = new THREE.DirectionalLight(0xeef4ff, 1.55);
keyMoon.position.set(20, 28, 14);
keyMoon.castShadow = true;
keyMoon.shadow.mapSize.set(1024, 1024);
keyMoon.shadow.camera.near = 1;
keyMoon.shadow.camera.far = 140;
keyMoon.shadow.camera.left = -40;
keyMoon.shadow.camera.right = 40;
keyMoon.shadow.camera.top = 40;
keyMoon.shadow.camera.bottom = -40;
scene.add(keyMoon);

const fillBlue = new THREE.PointLight(0x5f8fd6, 0.85, 90, 2.0);
fillBlue.position.set(-8, 8, 7);
scene.add(fillBlue);

const battleWarmFill = new THREE.PointLight(0xffc27a, 0.0, 30, 2.0);
battleWarmFill.position.set(-6, 5, 4);
scene.add(battleWarmFill);

const battleCoolFill = new THREE.PointLight(0x72a8ff, 0.0, 36, 2.0);
battleCoolFill.position.set(8, 6, -3);
scene.add(battleCoolFill);

const threadGlowCyan = new THREE.PointLight(0x4de0c0, 0.0, 18, 2.0);
threadGlowCyan.position.set(0, 1.0, 0);
scene.add(threadGlowCyan);

const threadGlowViolet = new THREE.PointLight(0x7257d6, 0.0, 16, 2.0);
threadGlowViolet.position.set(1.2, 0.8, -0.8);
scene.add(threadGlowViolet);

/* -------------------------------------------------------
   Materials / Helpers
------------------------------------------------------- */
function makeStd(color, roughness = 0.85, metalness = 0.08, emissive = 0x000000, emissiveIntensity = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  m.userData.baseEmissiveIntensity = emissiveIntensity;
  return m;
}

function makeBlobShadow(radius = 0.7, opacity = 0.3) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

function collectMaterials(root) {
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const arr = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of arr) {
      if (!mats.includes(m)) mats.push(m);
    }
  });
  return mats;
}

function makeActorVisual(root, basePos, opts = {}) {
  return {
    root,
    basePos: basePos.clone(),
    bobPhase: opts.bobPhase ?? 0,
    bobAmp: opts.bobAmp ?? 0.06,
    bobSpeed: opts.bobSpeed ?? 1.4,
    bobY: opts.bobY ?? 0,
    attackT: 0,
    attackDur: 0.2,
    attackAmp: 0,
    attackDir: new THREE.Vector3(1, 0, 0),
    hitT: 0,
    hitDur: 0.16,
    hitShake: 0.12,
    flashT: 0,
    flashDur: 0.1,
    mats: collectMaterials(root)
  };
}

/* -------------------------------------------------------
   Groups
------------------------------------------------------- */
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const battleGroup = new THREE.Group();
battleGroup.visible = false;
scene.add(battleGroup);

/* -------------------------------------------------------
   World Setup
------------------------------------------------------- */
// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(280, 280),
  new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 1.0, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
worldGroup.add(ground);

// Decorative tile ring areas
for (let i = 0; i < 10; i++) {
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(rand(1.8, 4.0), 18),
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x2f4b67 : 0x284158,
      transparent: true,
      opacity: rand(0.05, 0.12),
      depthWrite: false
    })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(rand(-70, 70), 0.02, rand(-70, 70));
  worldGroup.add(plate);
}

// Player
const player = {
  obj: new THREE.Group(),
  pos: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  speed: 8,
  sprintSpeed: 12,
  radius: 0.6
};

function buildPlayer() {
  const root = player.obj;
  root.clear();

  const shadow = makeBlobShadow(0.7, 0.28);
  root.add(shadow);

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.25, 12),
    makeStd(0x2b3444, 0.95, 0)
  );
  cloak.position.y = 0.8;
  cloak.castShadow = true;
  root.add(cloak);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.58, 6, 10),
    makeStd(0x8ea5bf, 0.82, 0.1)
  );
  torso.position.y = 1.05;
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    makeStd(0xc3cfdd, 0.85, 0.03)
  );
  head.position.y = 1.65;
  head.castShadow = true;
  root.add(head);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.65, 0.08),
    makeStd(0x7f90a7, 0.45, 0.42)
  );
  blade.position.set(0.34, 1.0, 0.12);
  blade.rotation.z = -0.35;
  blade.castShadow = true;
  root.add(blade);

  root.position.copy(player.pos);
  worldGroup.add(root);
}
buildPlayer();

// Rocks / obstacles
const obstacles = [];
function addRock(x, z, s = 1.4, c = 0x243449) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), makeStd(c, 0.95, 0.02));
  rock.position.set(x, s * 0.9, z);
  rock.rotation.set(rand(-0.3, 0.3), rand(-Math.PI, Math.PI), rand(-0.2, 0.2));
  rock.castShadow = true;
  rock.receiveShadow = true;
  worldGroup.add(rock);
  obstacles.push({ mesh: rock, r: s * 0.85 });
}
for (let i = 0; i < 22; i++) {
  addRock(rand(-90, 90), rand(-90, 90), rand(1.1, 2.8), pick([0x1f2f43, 0x27384e, 0x1f2b38]));
}

// Encounter zones
const zones = [];
function addZone(x, z, r, kind, label) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.2, r, 48),
    new THREE.MeshBasicMaterial({
      color: kind === "boss" ? 0xff7a88 : 0x70e0a4,
      transparent: true,
      opacity: kind === "boss" ? 0.24 : 0.18,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.06, z);
  worldGroup.add(ring);

  const beaconCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.22, 2.0, 10),
    makeStd(kind === "boss" ? 0x411f28 : 0x1d3528, 0.9, 0.08)
  );
  beaconCore.position.set(x, 1.02, z);
  beaconCore.castShadow = true;
  worldGroup.add(beaconCore);

  const beaconGlow = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    makeStd(
      kind === "boss" ? 0xff8b9c : 0x78ebb1,
      0.35,
      0.0,
      kind === "boss" ? 0xff8b9c : 0x78ebb1,
      0.45
    )
  );
  beaconGlow.position.set(x, 2.15, z);
  worldGroup.add(beaconGlow);

  zones.push({ x, z, r, kind, label, ring, beaconCore, beaconGlow, enabled: true, pulse: rand(0, Math.PI * 2) });
}

addZone(-40, 28, 4.2, "encounter", "easy");
addZone( 35,-18, 4.2, "encounter", "mid");
addZone( 15, 55, 4.2, "encounter", "hard");
addZone( 60, 60, 5.2, "boss",     "boss_knotling_matron");

/* -------------------------------------------------------
   Battle Visuals Setup
------------------------------------------------------- */
const battleviz = {
  room: null,
  floor: null,
  partyActors: [],
  enemyActor: null,
  haze: [],
  threadScarGroup: null,
  enemyRim: null
};

function buildHeroStandIn({ id, accent, cloakColor, metalColor, skinColor, weaponColor }) {
  const root = new THREE.Group();

  root.add(makeBlobShadow(0.72, 0.26));

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 0.26), makeStd(0x313c4c));
  legs.position.y = 0.35;
  legs.castShadow = true;

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 10), makeStd(cloakColor, 0.95, 0));
  cloak.position.y = 0.68;
  cloak.castShadow = true;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.38, 4, 8), makeStd(0x5f728b, 0.82, 0.08));
  torso.position.y = 0.95;
  torso.castShadow = true;

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.16), makeStd(accent, 0.72, 0.12));
  shoulders.position.y = 1.02;
  shoulders.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), makeStd(skinColor, 0.84, 0.03));
  head.position.y = 1.28;
  head.castShadow = true;

  const hair = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 8), makeStd(0x1b1d22, 0.92, 0));
  hair.position.y = 1.42;
  hair.castShadow = true;

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), makeStd(metalColor, 0.72, 0.12));
  const armR = armL.clone();
  armL.position.set(-0.34, 0.9, 0.02);
  armR.position.set( 0.34, 0.9, -0.02);
  armL.castShadow = armR.castShadow = true;

  let weapon;
  if (id === "cael") {
    weapon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.58, 0.08), makeStd(weaponColor, 0.45, 0.42));
    weapon.position.set(0.46, 0.86, 0.12);
    weapon.rotation.z = -0.25;
  } else if (id === "serah") {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), makeStd(weaponColor, 0.5, 0.3));
    handle.position.set(0.44, 0.93, -0.04);
    handle.rotation.z = 0.3;
    const blade = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 10, Math.PI * 1.1), makeStd(0x98a1b0, 0.4, 0.45));
    blade.position.set(0.54, 1.02, 0.02);
    blade.rotation.set(0, 0.4, 0.9);
    group.add(handle, blade);
    weapon = group;
  } else {
    const group = new THREE.Group();
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 6), makeStd(weaponColor, 0.5, 0.25));
    wand.position.set(0.42, 0.9, 0.10);
    wand.rotation.z = -0.22;
    const vial = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.07), makeStd(0x70d3c6, 0.35, 0.03, 0x70d3c6, 0.2));
    vial.position.set(-0.30, 0.72, -0.14);
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.14), makeStd(0x3d2f25, 0.95, 0));
    satchel.position.set(-0.28, 0.58, -0.12);
    group.add(wand, vial, satchel);
    weapon = group;
  }

  root.add(legs, cloak, torso, shoulders, head, hair, armL, armR, weapon);
  return root;
}

function buildEnemyStandIn(isBoss = false) {
  const root = new THREE.Group();
  root.add(makeBlobShadow(isBoss ? 1.5 : 1.1, 0.32));

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(isBoss ? 1.28 : 0.95, 20, 14),
    makeStd(isBoss ? 0x4a3a43 : 0x32404f, 0.86, 0.08)
  );
  body.position.y = isBoss ? 1.35 : 1.1;
  body.castShadow = true;
  root.add(body);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(isBoss ? 1.38 : 1.05, 20, 14),
    new THREE.MeshBasicMaterial({
      color: isBoss ? 0xb86f83 : 0x7092c9,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide
    })
  );
  shell.position.copy(body.position);
  root.add(shell);

  const chest = new THREE.Mesh(
    new THREE.OctahedronGeometry(isBoss ? 0.42 : 0.32, 0),
    makeStd(0x20252c, 0.8, 0.02, 0x4de0c0, 0.22)
  );
  chest.position.set(0.05, body.position.y - 0.05, 0.62);
  chest.castShadow = true;
  root.add(chest);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), makeStd(0xdffcff, 0.25, 0, 0x4de0c0, 0.55));
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18, body.position.y + 0.15, 0.78);
  eyeR.position.set( 0.04, body.position.y + 0.13, 0.80);
  root.add(eyeL, eyeR);

  const spikeMat = makeStd(0x1f232b, 0.95, 0.02, 0x7257d6, 0.08);
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6 + i * 0.05, 6), spikeMat);
    spike.position.set(-0.35 + i * 0.13, body.position.y + 0.32, -0.05 - i * 0.06);
    spike.rotation.z = rand(-0.25, 0.25);
    spike.rotation.x = rand(-0.12, 0.12);
    spike.castShadow = true;
    root.add(spike);
  }

  root.userData.body = body;
  root.userData.shell = shell;
  root.userData.chest = chest;
  return root;
}

function createBattleRoom() {
  const room = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({ color: 0x253344, roughness: 0.95, metalness: 0.03 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  room.add(floor);

  // Bright readable sewer-ish chamber walls
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand(-0.05, 0.05);
    const h = rand(4.0, 7.6);
    const w = rand(1.6, 2.8);
    const d = rand(0.6, 1.0);
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0x324355, roughness: 0.96, metalness: 0.01 })
    );
    const r = 17.2;
    seg.position.set(Math.cos(a) * r, h * 0.5, Math.sin(a) * r);
    seg.rotation.y = -a + Math.PI / 2 + rand(-0.08, 0.08);
    seg.castShadow = true;
    seg.receiveShadow = true;
    room.add(seg);
  }

  // Back door silhouette
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -15.4);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(5.3, 6.1, 0.55), makeStd(0x2e3946, 0.9, 0.06));
  doorFrame.position.y = 3.05;
  doorFrame.castShadow = true;
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.2, 0.2), makeStd(0x566d88, 0.72, 0.18));
  doorPanel.position.set(0, 2.7, 0.18);
  doorPanel.castShadow = true;
  doorGroup.add(doorFrame, doorPanel);
  room.add(doorGroup);

  // Thread-scar glow centerpiece (brighter)
  const threadScar = new THREE.Group();
  const pathMats = [
    new THREE.MeshBasicMaterial({ color: 0x4de0c0, transparent: true, opacity: 0.85 }),
    new THREE.MeshBasicMaterial({ color: 0x7257d6, transparent: true, opacity: 0.78 })
  ];

  const scarLines = [
    [[-4.8,0,-1.4],[-2.2,0,-0.5],[-0.1,0,0.3],[1.9,0,0.8],[4.6,0,1.5]],
    [[-1.5,0,-2.5],[-0.7,0,-1.1],[0.4,0,0.4],[1.3,0,2.2]],
    [[-0.8,0,0.2],[-2.0,0,1.2],[-3.5,0,2.4]],
    [[0.7,0,0.1],[2.1,0,-0.8],[3.9,0,-2.5]]
  ];

  scarLines.forEach((pts, idx) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, idx === 0 ? 0.1 : 0.07, 6, false),
      new THREE.MeshStandardMaterial({
        color: 0x0f141c,
        roughness: 0.7,
        metalness: 0.0,
        emissive: idx % 2 ? 0x7257d6 : 0x4de0c0,
        emissiveIntensity: idx === 0 ? 1.0 : 0.7
      })
    );
    tube.position.y = 0.045;
    tube.castShadow = true;
    threadScar.add(tube);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const line = new THREE.Line(lineGeo, pathMats[idx % 2]);
    line.position.y = 0.08;
    threadScar.add(line);
  });

  for (let i = 0; i < 8; i++) {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.4, 1.2), 18),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x7257d6 : 0x4de0c0,
        transparent: true,
        opacity: rand(0.08, 0.18),
        depthWrite: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(rand(-4.5, 4.5), 0.03, rand(-2.9, 2.9));
    threadScar.add(glow);
  }

  room.add(threadScar);

  battleviz.threadScarGroup = threadScar;
  battleviz.floor = floor;
  return room;
}

function buildBattleScene() {
  battleGroup.clear();
  battleviz.partyActors = [];
  battleviz.enemyActor = null;
  battleviz.haze = [];
  battleviz.enemyRim = null;

  battleviz.room = createBattleRoom();
  battleGroup.add(battleviz.room);

  const partyPositions = [
    new THREE.Vector3(-7.0, 0, -2.8),
    new THREE.Vector3(-8.0, 0,  0.2),
    new THREE.Vector3(-7.1, 0,  3.0)
  ];

  const heroDefs = [
    { id:"cael",  accent:0x6b7fa8, cloakColor:0x202a37, metalColor:0x596579, skinColor:0xbfcad7, weaponColor:0x7b8798 },
    { id:"serah", accent:0x9d6462, cloakColor:0x2a1f27, metalColor:0x5f616e, skinColor:0xc5c3cb, weaponColor:0x7b818f },
    { id:"iri",   accent:0x6fc8be, cloakColor:0x242f38, metalColor:0x657588, skinColor:0xd1dae5, weaponColor:0x7aa8b1 }
  ];

  for (let i = 0; i < heroDefs.length; i++) {
    const root = buildHeroStandIn(heroDefs[i]);
    root.position.copy(partyPositions[i]);
    root.rotation.y = -0.18;
    battleGroup.add(root);

    battleviz.partyActors.push(
      makeActorVisual(root, partyPositions[i], {
        bobPhase: rand(0, Math.PI * 2),
        bobAmp: 0.05 + i * 0.005,
        bobSpeed: 1.6 + i * 0.15,
        bobY: 0
      })
    );
  }

  const enemyRoot = buildEnemyStandIn(false);
  const enemyPos = new THREE.Vector3(7.8, 0, 0.2);
  enemyRoot.position.copy(enemyPos);
  enemyRoot.rotation.y = Math.PI + 0.25;
  battleGroup.add(enemyRoot);

  battleviz.enemyActor = makeActorVisual(enemyRoot, enemyPos, {
    bobPhase: rand(0, Math.PI * 2),
    bobAmp: 0.09,
    bobSpeed: 1.15,
    bobY: 0.05
  });

  const rim = new THREE.PointLight(0x9cc2ff, 0.85, 24, 2.0);
  rim.position.set(10, 4, -2);
  battleGroup.add(rim);
  battleviz.enemyRim = rim;
}
buildBattleScene();

/* -------------------------------------------------------
   Camera Helpers
------------------------------------------------------- */
const battleCam = {
  basePos: new THREE.Vector3(0, 9.6, 15.6),
  baseTarget: new THREE.Vector3(0, 1.25, 0),
  shakeT: 0,
  shakeDur: 0.12,
  shakeMag: 0,
  shakeOffset: new THREE.Vector3()
};

function addBattleShake(mag = 0.14, dur = 0.12) {
  battleCam.shakeMag = Math.max(battleCam.shakeMag, mag);
  battleCam.shakeDur = Math.max(0.05, dur);
  battleCam.shakeT = battleCam.shakeDur;
}

function updateBattleCamera(dt, t) {
  if (battleCam.shakeT > 0) {
    battleCam.shakeT = Math.max(0, battleCam.shakeT - dt);
    const k = battleCam.shakeT / battleCam.shakeDur;
    battleCam.shakeOffset.set(
      rand(-1, 1) * battleCam.shakeMag * k,
      rand(-1, 1) * battleCam.shakeMag * 0.55 * k,
      rand(-1, 1) * battleCam.shakeMag * k
    );
    if (battleCam.shakeT === 0) battleCam.shakeMag = 0;
  } else {
    battleCam.shakeOffset.set(0, 0, 0);
  }

  const drift = new THREE.Vector3(
    Math.sin(t * 0.35) * 0.18,
    Math.sin(t * 0.46 + 0.6) * 0.08,
    Math.cos(t * 0.28 + 0.3) * 0.14
  );

  const pos = battleCam.basePos.clone().add(drift).add(battleCam.shakeOffset);
  const target = battleCam.baseTarget.clone().add(new THREE.Vector3(Math.sin(t * 0.2) * 0.1, Math.sin(t * 0.31) * 0.04, 0));

  camera.position.lerp(pos, 1 - Math.pow(0.0005, dt));
  camera.lookAt(target);
}

function cameraFollowWorld(dt) {
  if (keys.q) player.yaw += 1.8 * dt;
  if (keys.e) player.yaw -= 1.8 * dt;

  const dist = 9.2;
  const height = 5.4;
  const behind = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(-dist);
  const camPos = player.pos.clone().add(behind).add(new THREE.Vector3(0, height, 0));

  camera.position.x = lerp(camera.position.x, camPos.x, 1 - Math.pow(0.0005, dt));
  camera.position.y = lerp(camera.position.y, camPos.y, 1 - Math.pow(0.0005, dt));
  camera.position.z = lerp(camera.position.z, camPos.z, 1 - Math.pow(0.0005, dt));
  camera.lookAt(player.pos.x, player.pos.y + 1.2, player.pos.z);
}

/* -------------------------------------------------------
   Input
------------------------------------------------------- */
const keys = { w:false, a:false, s:false, d:false, shift:false, q:false, e:false };

addEventListener("keydown", (ev) => {
  if (ev.code === "KeyW") keys.w = true;
  if (ev.code === "KeyA") keys.a = true;
  if (ev.code === "KeyS") keys.s = true;
  if (ev.code === "KeyD") keys.d = true;
  if (ev.code === "ShiftLeft" || ev.code === "ShiftRight") keys.shift = true;
  if (ev.code === "KeyQ") keys.q = true;
  if (ev.code === "KeyE") keys.e = true;

  if (ev.code === "KeyR") resetRun();

  if (ev.code === "KeyV") {
    retroFxEnabled = !retroFxEnabled;
    // lightweight visual toggle instead of shader:
    renderer.toneMappingExposure = retroFxEnabled ? 1.25 : 1.45;
  }
});

addEventListener("keyup", (ev) => {
  if (ev.code === "KeyW") keys.w = false;
  if (ev.code === "KeyA") keys.a = false;
  if (ev.code === "KeyS") keys.s = false;
  if (ev.code === "KeyD") keys.d = false;
  if (ev.code === "ShiftLeft" || ev.code === "ShiftRight") keys.shift = false;
  if (ev.code === "KeyQ") keys.q = false;
  if (ev.code === "KeyE") keys.e = false;
});

/* -------------------------------------------------------
   UI Renderers
------------------------------------------------------- */
function renderPartyPanel() {
  ui.partyPanel.innerHTML = `<div class="partyTitle">Party</div>`;

  for (const m of Party) {
    const dead = m.hp <= 0;
    const ready = m.dread >= 100;
    const statusText = dead ? "Down" : (ready ? "Dread Art READY" : "—");

    ui.partyPanel.innerHTML += `
      <div class="member ${dead ? "dead" : ""}">
        <div class="memberRow">
          <div>
            <div class="mname">${m.name}</div>
            <div class="msub ${ready ? "ready" : ""}">${statusText}</div>
          </div>
          <div class="mstats">
            <div>HP <b>${m.hp}</b>/${m.hpMax}</div>
            <div>Dread <b>${Math.floor(m.dread)}</b>/100</div>
          </div>
        </div>
      </div>
    `;
  }
}

function renderActionUI() {
  ui.actionButtons.innerHTML = "";

  if (!battle.active || battle.phase !== "player_turn") {
    ui.turnLabel.textContent = battle.active ? "Enemy turn..." : "—";
    return;
  }

  battle.aliveOrder = alivePartyIndices();
  if (battle.aliveOrder.length === 0) return;

  const actIdx = battle.aliveOrder[battle.actorIndex % battle.aliveOrder.length];
  const actor = Party[actIdx];
  ui.turnLabel.textContent = `${actor.name}'s turn`;

  const btnAttack = document.createElement("button");
  btnAttack.className = "primary";
  btnAttack.textContent = "Attack";
  btnAttack.onclick = () => playerAttack(actIdx, 1.0);

  const btnSkill = document.createElement("button");
  btnSkill.textContent = actor.skillName;
  btnSkill.onclick = () => playerSkill(actIdx);

  const btnDread = document.createElement("button");
  btnDread.textContent = "Dread Art";
  btnDread.disabled = actor.dread < 100;
  btnDread.onclick = () => playerDreadArt(actIdx);

  ui.actionButtons.append(btnAttack, btnSkill, btnDread);
}

/* -------------------------------------------------------
   Floating Damage Numbers (DOM)
------------------------------------------------------- */
const dmgNums = [];

function spawnDmg(text, worldPos, crit = false, heal = false) {
  const el = document.createElement("div");
  el.className = `dmg${crit ? " crit" : ""}${heal ? " heal" : ""}`;
  el.textContent = text;
  el.style.fontSize = crit ? "30px" : (heal ? "24px" : "22px");
  el.style.opacity = "1";
  document.body.appendChild(el);

  dmgNums.push({
    el,
    pos: worldPos.clone(),
    velY: heal ? 0.65 : (crit ? 0.82 : 0.72),
    t: 0,
    life: heal ? 1.0 : (crit ? 1.05 : 0.95),
    driftX: rand(-0.12, 0.12),
    driftZ: rand(-0.10, 0.10),
    popT: 0.1
  });
}

function updateDmgNums(dt) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const n = dmgNums[i];
    n.t += dt;

    const a = 1 - (n.t / n.life);
    if (a <= 0) {
      n.el.remove();
      dmgNums.splice(i, 1);
      continue;
    }

    const hang = 0.12;
    const moveFactor = n.t < hang ? (n.t / hang) * 0.22 : 1.0;

    n.pos.y += n.velY * dt * moveFactor;
    n.pos.x += n.driftX * dt * moveFactor;
    n.pos.z += n.driftZ * dt * moveFactor;

    const p = n.pos.clone().project(camera);
    if (p.z > 1) {
      n.el.style.opacity = "0";
      continue;
    }

    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;

    const pop = n.popT > 0 ? (1.0 + (n.popT / 0.1) * 0.28) : 1.0;
    n.popT = Math.max(0, n.popT - dt);

    n.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop.toFixed(3)})`;
    n.el.style.opacity = String(a);
  }
}

function clearDmgNums() {
  while (dmgNums.length) {
    const n = dmgNums.pop();
    n.el.remove();
  }
}

/* -------------------------------------------------------
   Collision / World Movement
------------------------------------------------------- */
function pushOutOfObstacles(nextPos) {
  for (const o of obstacles) {
    const dx = nextPos.x - o.mesh.position.x;
    const dz = nextPos.z - o.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const minDist = player.radius + o.r;
    if (dist < minDist) {
      const t = (minDist - dist) / Math.max(dist, 0.0001);
      nextPos.x += dx * t;
      nextPos.z += dz * t;
    }
  }
}

function worldMove(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const move = new THREE.Vector3();
  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.d) move.add(right);
  if (keys.a) move.sub(right);

  const moving = move.lengthSq() > 0;
  if (moving) move.normalize();

  const spd = keys.shift ? player.sprintSpeed : player.speed;
  const next = player.pos.clone().add(move.multiplyScalar(spd * dt));

  next.x = clamp(next.x, -110, 110);
  next.z = clamp(next.z, -110, 110);

  pushOutOfObstacles(next);

  player.pos.copy(next);
  player.obj.position.copy(player.pos);

  if (moving) {
    player.obj.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
    player.obj.position.y = Math.sin(performance.now() * 0.01) * 0.03;
  } else {
    player.obj.position.y = lerp(player.obj.position.y, 0, 0.15);
  }
}

function checkZones() {
  if (encounterCooldown > 0 || battle.active) return;

  for (const z of zones) {
    if (!z.enabled) continue;
    const d = Math.hypot(player.pos.x - z.x, player.pos.z - z.z);
    if (d <= z.r) {
      if (z.kind === "boss") {
        if (bossCleared) return;
        startBattle("knotling_matron");
        return;
      } else {
        const pool = Pools[z.label] || Pools.easy;
        startBattle(pick(pool));
        return;
      }
    }
  }
}

/* -------------------------------------------------------
   Battle Animation Helpers (visual only)
------------------------------------------------------- */
function actorWorldHitPosParty(idx) {
  const a = battleviz.partyActors[idx];
  if (!a) return new THREE.Vector3();
  return a.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.1, 0));
}

function actorWorldHitPosEnemy() {
  if (!battleviz.enemyActor) return new THREE.Vector3();
  return battleviz.enemyActor.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.7, 0));
}

function markAttackLunge(attackerVis, targetPos, amp = 0.6, dur = 0.2) {
  if (!attackerVis) return;
  attackerVis.attackT = dur;
  attackerVis.attackDur = dur;
  attackerVis.attackAmp = amp;
  attackerVis.attackDir.copy(targetPos).sub(attackerVis.basePos);
  attackerVis.attackDir.y = 0;
  if (attackerVis.attackDir.lengthSq() < 0.0001) attackerVis.attackDir.set(1, 0, 0);
  attackerVis.attackDir.normalize();
}

function markHitReaction(targetVis, mag = 0.12) {
  if (!targetVis) return;
  targetVis.hitT = targetVis.hitDur;
  targetVis.hitShake = mag;
  targetVis.flashT = targetVis.flashDur;
}

function playPartyStrikeFX(idx, strong = false) {
  const attacker = battleviz.partyActors[idx];
  const target = battleviz.enemyActor;
  if (!attacker || !target) return;
  markAttackLunge(attacker, target.basePos, strong ? 0.82 : 0.62, strong ? 0.23 : 0.2);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.2 : 0.13);
    addBattleShake(strong ? 0.18 : 0.12, strong ? 0.15 : 0.11);
  }, strong ? 120 : 95);
}

function playEnemyStrikeFX(targetIdx, strong = false) {
  const attacker = battleviz.enemyActor;
  const target = battleviz.partyActors[targetIdx];
  if (!attacker || !target) return;
  markAttackLunge(attacker, target.basePos, strong ? 1.0 : 0.75, strong ? 0.25 : 0.21);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.16 : 0.11);
    addBattleShake(strong ? 0.2 : 0.14, strong ? 0.14 : 0.1);
  }, strong ? 120 : 100);
}

function updateActorVisuals(dt, t) {
  for (let i = 0; i < battleviz.partyActors.length; i++) {
    const a = battleviz.partyActors[i];
    if (!a) continue;

    const offset = new THREE.Vector3();
    offset.y += a.bobY + Math.sin(t * a.bobSpeed + a.bobPhase) * a.bobAmp;

    if (a.attackT > 0) {
      a.attackT = Math.max(0, a.attackT - dt);
      const p = 1 - (a.attackT / a.attackDur);
      const arc = Math.sin(p * Math.PI);
      offset.addScaledVector(a.attackDir, arc * a.attackAmp);
      offset.y += arc * 0.06;
    }

    if (a.hitT > 0) {
      a.hitT = Math.max(0, a.hitT - dt);
      const k = a.hitT / a.hitDur;
      offset.x += rand(-1, 1) * a.hitShake * k;
      offset.z += rand(-1, 1) * a.hitShake * 0.6 * k;
    }

    a.root.position.copy(a.basePos).add(offset);
    a.root.rotation.y = -0.18 + Math.sin(t * 0.6 + i) * 0.01;

    if (a.flashT > 0) a.flashT = Math.max(0, a.flashT - dt);
    const flashK = a.flashT > 0 ? (a.flashT / a.flashDur) : 0;
    for (const m of a.mats) {
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = (m.userData.baseEmissiveIntensity || 0) + flashK * 0.35;
      }
    }
  }

  const e = battleviz.enemyActor;
  if (e) {
    const offset = new THREE.Vector3();
    offset.y += e.bobY + Math.sin(t * e.bobSpeed + e.bobPhase) * e.bobAmp;

    if (e.attackT > 0) {
      e.attackT = Math.max(0, e.attackT - dt);
      const p = 1 - (e.attackT / e.attackDur);
      const arc = Math.sin(p * Math.PI);
      offset.addScaledVector(e.attackDir, arc * e.attackAmp);
      offset.y += arc * 0.08;
    }

    if (e.hitT > 0) {
      e.hitT = Math.max(0, e.hitT - dt);
      const k = e.hitT / e.hitDur;
      offset.x += rand(-1, 1) * e.hitShake * k;
      offset.z += rand(-1, 1) * e.hitShake * 0.7 * k;
    }

    e.root.position.copy(e.basePos).add(offset);
    e.root.rotation.y = Math.PI + 0.25 + Math.sin(t * 0.43) * 0.02;

    if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);
    const flashK = e.flashT > 0 ? (e.flashT / e.flashDur) : 0;

    for (const m of e.mats) {
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = (m.userData.baseEmissiveIntensity || 0) + flashK * 0.55;
      }
    }

    const chest = e.root.userData.chest;
    if (chest?.material) {
      chest.material.emissiveIntensity = 0.25 + Math.sin(t * 2.3) * 0.08 + flashK * 0.2;
    }
    if (battleviz.enemyRim) {
      battleviz.enemyRim.intensity = 0.75 + Math.sin(t * 1.4) * 0.15 + flashK * 0.2;
      battleviz.enemyRim.position.copy(e.root.position).add(new THREE.Vector3(2.4, 2.5, -1.6));
    }
  }

  if (battleviz.threadScarGroup && mode === Mode.BATTLE) {
    const pulse = 0.9 + Math.sin(t * 1.3) * 0.15 + Math.sin(t * 2.5 + 1.2) * 0.07;
    threadGlowCyan.intensity = 0.9 * pulse;
    threadGlowViolet.intensity = 0.65 * pulse;
  }
}

/* -------------------------------------------------------
   Battle Mechanics
------------------------------------------------------- */
function anyPartyAlive() {
  return Party.some(p => p.hp > 0);
}

function alivePartyIndices() {
  const arr = [];
  for (let i = 0; i < Party.length; i++) if (Party[i].hp > 0) arr.push(i);
  return arr;
}

function addDread(idx, amount) {
  Party[idx].dread = clamp(Party[idx].dread + amount, 0, 100);
}

function consumeDreadIfFull(idx) {
  if (Party[idx].dread >= 100) {
    Party[idx].dread = 0;
    return true;
  }
  return false;
}

function rollCrit() {
  return Math.random() < 0.10;
}

function calcDamage(atk, def, mult = 1.0) {
  return Math.max(1, Math.floor((atk - def) * mult + rand(-2, 2)));
}

function configureEnemyVisualForEncounter(e) {
  if (!battleviz.enemyActor) return;

  // rebuild for boss
  if (e.boss) {
    const pos = battleviz.enemyActor.basePos.clone();
    const rot = battleviz.enemyActor.root.rotation.y;
    battleGroup.remove(battleviz.enemyActor.root);

    const rebuilt = buildEnemyStandIn(true);
    rebuilt.position.copy(pos);
    rebuilt.rotation.y = rot;
    battleGroup.add(rebuilt);

    battleviz.enemyActor = makeActorVisual(rebuilt, pos, {
      bobPhase: rand(0, Math.PI * 2),
      bobAmp: 0.12,
      bobSpeed: 0.95,
      bobY: 0.08
    });

    if (battleviz.enemyRim) battleGroup.remove(battleviz.enemyRim);
    battleviz.enemyRim = new THREE.PointLight(0xff9bb4, 1.0, 28, 2.0);
    battleGroup.add(battleviz.enemyRim);
  }

  const body = battleviz.enemyActor.root.userData.body;
  const chest = battleviz.enemyActor.root.userData.chest;
  if (body?.material && chest?.material) {
    const tint = e.tint ?? 0x68d6c5;
    body.material.color.setHex(e.boss ? 0x473843 : 0x36485e);
    chest.material.emissive.setHex(tint);
    chest.material.emissiveIntensity = e.boss ? 0.35 : 0.25;
  }

  battleviz.enemyActor.basePos.set(e.boss ? 7.2 : 7.8, 0, e.boss ? 0.15 : 0.2);
  battleviz.enemyActor.root.position.copy(battleviz.enemyActor.basePos);
}

function startBattle(enemyId) {
  worldReturn.pos.copy(player.pos);
  worldReturn.yaw = player.yaw;

  enemy = { ...EnemyDB[enemyId] };

  mode = Mode.BATTLE;
  ui.mode.textContent = "BATTLE";

  worldGroup.visible = false;
  battleGroup.visible = true;
  player.obj.visible = false;

  ui.battleUI.style.display = "grid";
  ui.enemyName.style.display = "block";
  ui.enemyName.textContent = `${enemy.name} (HP hidden)`;

  camera.position.copy(battleCam.basePos);
  camera.lookAt(battleCam.baseTarget);

  configureEnemyVisualForEncounter(enemy);

  battle.active = true;
  battle.phase = "player_turn";
  battle.actorIndex = 0;
  battle.aliveOrder = alivePartyIndices();

  ui.log.innerHTML = "";
  logLine(`Encounter! ${enemy.name} appears.`);
  logLine("Enemy HP is hidden. Fight smart.");

  renderPartyPanel();
  renderActionUI();
}

function endBattle(victory) {
  battle.active = false;
  enemy = null;

  mode = Mode.WORLD;
  ui.mode.textContent = "WORLD";

  worldGroup.visible = true;
  battleGroup.visible = false;
  player.obj.visible = true;

  ui.battleUI.style.display = "none";
  ui.enemyName.style.display = "none";

  player.pos.copy(worldReturn.pos);
  player.yaw = worldReturn.yaw;
  player.obj.position.copy(player.pos);

  encounterCooldown = 2.2;

  ui.overlay.style.display = "grid";
  ui.overlayTitle.textContent = victory ? "Victory" : "Defeat";
  ui.overlayText.textContent = victory
    ? "You survive the clash. The road opens again."
    : "You fall back and regroup at the last safe footing.";
  ui.startBtn.textContent = "Continue";

  renderPartyPanel();
}

function advanceTurnToNextLiving() {
  const living = alivePartyIndices();
  battle.aliveOrder = living;
  if (living.length === 0) return;
  battle.actorIndex = (battle.actorIndex + 1) % living.length;
}

function playerAttack(idx, mult = 1.0) {
  if (!enemy) return;
  const actor = Party[idx];

  playPartyStrikeFX(idx, mult > 1.4);

  const crit = rollCrit();
  let dmg = calcDamage(actor.atk, enemy.def, mult);
  if (crit) dmg = Math.floor(dmg * 1.9);

  enemy.hp -= dmg;
  addDread(idx, dmg * 0.35 + (crit ? 10 : 0));

  logLine(`${actor.name} attacks! ${crit ? "CRIT! " : ""}(${dmg})`);
  spawnDmg(String(dmg), actorWorldHitPosEnemy(), crit, false);

  renderPartyPanel();

  if (enemy.hp <= 0) {
    logLine(`${enemy.name} collapses.`);
    if (enemy.boss) bossCleared = true;
    setTimeout(() => endBattle(true), 550);
    return;
  }

  advanceTurnToNextLiving();
  if (battle.actorIndex === 0) {
    battle.phase = "enemy_turn";
    renderActionUI();
    setTimeout(enemyTurn, 550);
  } else {
    renderActionUI();
  }
}

function playerSkill(idx) {
  const actor = Party[idx];
  if (!enemy) return;

  if (actor.skillType === "heal") {
    const living = alivePartyIndices();
    let best = living[0];
    let bestMissing = -1;

    for (const i of living) {
      const missing = Party[i].hpMax - Party[i].hp;
      if (missing > bestMissing) {
        bestMissing = missing;
        best = i;
      }
    }

    const amt = actor.healAmt;
    Party[best].hp = clamp(Party[best].hp + amt, 0, Party[best].hpMax);
    addDread(idx, 12);

    const healerVis = battleviz.partyActors[idx];
    if (healerVis) healerVis.flashT = healerVis.flashDur;
    addBattleShake(0.06, 0.06);

    logLine(`${actor.name} uses ${actor.skillName} on ${Party[best].name} (+${amt}).`);
    spawnDmg(`+${amt}`, actorWorldHitPosParty(best), false, true);

    renderPartyPanel();

    advanceTurnToNextLiving();
    if (battle.actorIndex === 0) {
      battle.phase = "enemy_turn";
      renderActionUI();
      setTimeout(enemyTurn, 550);
    } else {
      renderActionUI();
    }
    return;
  }

  playerAttack(idx, actor.skillMul);
}

function playerDreadArt(idx) {
  if (!enemy) return;
  const actor = Party[idx];
  if (!consumeDreadIfFull(idx)) return;

  playPartyStrikeFX(idx, true);
  addBattleShake(0.2, 0.18);

  let dmg = Math.max(1, Math.floor((actor.atk * 2.1) - enemy.def + rand(0, 6)));
  const crit = true; // always flashy

  enemy.hp -= dmg;
  logLine(`${actor.name} unleashes a Dread Art! (${dmg})`);
  spawnDmg(String(dmg), actorWorldHitPosEnemy(), crit, false);

  if (battleviz.enemyActor) battleviz.enemyActor.flashT = battleviz.enemyActor.flashDur * 1.4;

  renderPartyPanel();

  if (enemy.hp <= 0) {
    logLine(`${enemy.name} is severed from the field.`);
    if (enemy.boss) bossCleared = true;
    setTimeout(() => endBattle(true), 650);
    return;
  }

  advanceTurnToNextLiving();
  if (battle.actorIndex === 0) {
    battle.phase = "enemy_turn";
    renderActionUI();
    setTimeout(enemyTurn, 650);
  } else {
    renderActionUI();
  }
}

function enemyTurn() {
  if (!battle.active || !enemy) return;

  const living = alivePartyIndices();
  if (living.length === 0) {
    setTimeout(() => endBattle(false), 500);
    return;
  }

  const targetIdx = pick(living);
  const target = Party[targetIdx];

  playEnemyStrikeFX(targetIdx, !!enemy.boss);

  const crit = enemy.boss ? (Math.random() < 0.06) : rollCrit();
  let dmg = calcDamage(enemy.atk, target.def, 1.0);
  if (crit) dmg = Math.floor(dmg * 1.7);

  target.hp = Math.max(0, target.hp - dmg);
  addDread(targetIdx, dmg * 0.45 + (crit ? 6 : 0));

  logLine(`${enemy.name} strikes ${target.name}! ${crit ? "CRIT! " : ""}(${dmg})`);
  spawnDmg(String(dmg), actorWorldHitPosParty(targetIdx), crit, false);

  renderPartyPanel();

  if (!anyPartyAlive()) {
    logLine("The party is overwhelmed.");
    setTimeout(() => endBattle(false), 650);
    return;
  }

  battle.phase = "player_turn";
  battle.actorIndex = 0;
  renderActionUI();
}

/* -------------------------------------------------------
   Reset / Boot UI
------------------------------------------------------- */
function resetParty() {
  for (const p of Party) {
    p.hp = p.hpMax;
    p.dread = 0;
  }
}

function resetRun() {
  clearDmgNums();

  bossCleared = false;
  encounterCooldown = 0;
  enemy = null;
  battle.active = false;
  battle.phase = "idle";
  battle.actorIndex = 0;

  resetParty();
  renderPartyPanel();

  for (const z of zones) {
    z.enabled = true;
    if (z.kind === "boss") {
      z.ring.material.color.setHex(0xff7a88);
      z.ring.material.opacity = 0.24;
    } else {
      z.ring.material.color.setHex(0x70e0a4);
      z.ring.material.opacity = 0.18;
    }
  }

  mode = Mode.WORLD;
  ui.mode.textContent = "WORLD";

  worldGroup.visible = true;
  battleGroup.visible = false;
  ui.battleUI.style.display = "none";
  ui.enemyName.style.display = "none";

  player.pos.set(0, 0, 0);
  player.yaw = 0;
  player.obj.position.copy(player.pos);
  player.obj.visible = true;

  camera.position.set(0, 6, 10);
  camera.lookAt(0, 1.2, 0);

  ui.overlay.style.display = "none";
  ui.startBtn.textContent = "Start Prototype";
  ui.overlayTitle.textContent = "Veilborn Oath — Three.js Prototype";
  ui.overlayText.textContent = "Brightened prototype build for GitHub Pages. Placeholder 3D shapes, real loop.";

  ui.log.innerHTML = "";
  renderActionUI();
}

ui.startBtn.addEventListener("click", () => {
  ui.overlay.style.display = "none";
});

ui.resetBtn.addEventListener("click", () => {
  resetRun();
});

/* -------------------------------------------------------
   Resize
------------------------------------------------------- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);

/* -------------------------------------------------------
   Main Loop
------------------------------------------------------- */
let last = performance.now();

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  const t = now / 1000;

  ui.bossFlag.textContent = bossCleared ? "YES" : "no";
  ui.cd.textContent = encounterCooldown.toFixed(1);

  if (encounterCooldown > 0) encounterCooldown = Math.max(0, encounterCooldown - dt);

  // Pulse encounter zones
  for (const z of zones) {
    z.pulse += dt * (z.kind === "boss" ? 1.7 : 1.35);
    const pulse = 0.5 + 0.5 * Math.sin(z.pulse);

    if (z.enabled) {
      z.ring.material.opacity = (z.kind === "boss" ? 0.18 : 0.12) + pulse * (z.kind === "boss" ? 0.12 : 0.08);
      z.beaconGlow.position.y = 2.08 + Math.sin(z.pulse * 1.6) * 0.12;
      if (z.beaconGlow.material?.emissiveIntensity != null) {
        z.beaconGlow.material.emissiveIntensity = 0.35 + pulse * 0.45;
      }
      z.ring.rotation.z += dt * 0.12 * (z.kind === "boss" ? -1 : 1);
    }
  }

  if (bossCleared) {
    const bossZone = zones.find(z => z.kind === "boss");
    if (bossZone) {
      bossZone.enabled = false;
      bossZone.ring.material.opacity = 0.06;
      bossZone.ring.material.color.setHex(0x777777);
      if (bossZone.beaconGlow.material?.emissiveIntensity != null) {
        bossZone.beaconGlow.material.emissiveIntensity = 0.05;
      }
    }
  }

  if (mode === Mode.WORLD) {
    scene.background.setHex(0x101621);
    scene.fog.color.setHex(0x111722);
    scene.fog.near = 38;
    scene.fog.far = 170;

    battleWarmFill.intensity = 0.0;
    battleCoolFill.intensity = 0.0;
    threadGlowCyan.intensity = 0.0;
    threadGlowViolet.intensity = 0.0;

    worldMove(dt);
    cameraFollowWorld(dt);
    checkZones();

    // subtle world light pulse
    fillBlue.intensity = 0.78 + Math.sin(t * 0.8) * 0.06;
  } else {
    scene.background.setHex(0x131c29);
    scene.fog.color.setHex(0x162131);
    scene.fog.near = 28;
    scene.fog.far = 120;

    // brighter battle readability
    battleWarmFill.intensity = 0.95;
    battleCoolFill.intensity = 0.85;

    updateBattleCamera(dt, t);
    updateActorVisuals(dt, t);
  }

  updateDmgNums(dt);
  renderer.render(scene, camera);
}

/* -------------------------------------------------------
   Start
------------------------------------------------------- */
renderPartyPanel();
renderActionUI();
onResize();
tick();
resetRun();

// Helpful console access
window.resetRun = resetRun;
