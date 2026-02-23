import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/* =========================================================
   Utilities
========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;

/* =========================================================
   UI refs
========================================================= */
const ui = {
  mode: document.getElementById("mode"),
  bossFlag: document.getElementById("bossFlag"),
  cd: document.getElementById("cd"),
  partyPanel: document.getElementById("partyPanel"),
  enemyName: document.getElementById("enemyName"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  battleUI: document.getElementById("battleUI"),
  actionButtons: document.getElementById("actionButtons"),
  turnLabel: document.getElementById("turnLabel"),
  log: document.getElementById("log")
};

function logLine(s) {
  const div = document.createElement("div");
  div.textContent = s;
  ui.log.appendChild(div);
  ui.log.scrollTop = ui.log.scrollHeight;
}

/* =========================================================
   Data (same gameplay foundation)
========================================================= */
const Party = [
  { id: "cael",  name: "Cael",        hpMax: 120, hp: 120, atk: 16, def: 8, spd: 10, dread: 0, skillName: "Cleave", skillType: "dmg",  skillMul: 1.25 },
  { id: "serah", name: "Serah Mourn", hpMax: 95,  hp: 95,  atk: 14, def: 6, spd: 14, dread: 0, skillName: "Sunder", skillType: "dmg",  skillMul: 1.15 },
  { id: "iri",   name: "Iri Voss",    hpMax: 105, hp: 105, atk: 12, def: 7, spd: 9,  dread: 0, skillName: "Mend",   skillType: "heal", healAmt: 26 }
];

const EnemyDB = {
  sewer_gnawer:    { id: "sewer_gnawer",    name: "Sewer Gnawer",    hp: 60,  atk: 10, def: 4,  spd: 8  },
  thread_mite:     { id: "thread_mite",     name: "Thread Mite",     hp: 45,  atk: 9,  def: 3,  spd: 12 },
  lantern_thief:   { id: "lantern_thief",   name: "Lantern Thief",   hp: 70,  atk: 12, def: 5,  spd: 10 },
  knot_wisp:       { id: "knot_wisp",       name: "Knot Wisp",       hp: 55,  atk: 11, def: 4,  spd: 13 },
  thicket_stalker: { id: "thicket_stalker", name: "Thicket Stalker", hp: 110, atk: 18, def: 8,  spd: 12 },
  knotling_matron: { id: "knotling_matron", name: "Knotling Matron", hp: 320, atk: 22, def: 10, spd: 9, boss: true }
};

const Pools = {
  easy: ["sewer_gnawer", "thread_mite", "lantern_thief"],
  mid:  ["knot_wisp", "lantern_thief", "sewer_gnawer"],
  hard: ["thicket_stalker", "knot_wisp", "lantern_thief"]
};

/* =========================================================
   Game state
========================================================= */
const Mode = { WORLD: "WORLD", BATTLE: "BATTLE" };
let mode = Mode.WORLD;

let bossCleared = false;
let encounterCooldown = 0;

const worldReturn = { pos: new THREE.Vector3(0, 0, 0), yaw: 0 };

let enemy = null;
const battle = {
  active: false,
  phase: "idle", // "player_turn" | "enemy_turn"
  actorIndex: 0,
  aliveOrder: []
};

/* =========================================================
   Retro post-process (low res + quantize + ordered-ish dither)
========================================================= */
const RetroDitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(640, 360) },
    colorSteps: { value: new THREE.Vector3(28, 26, 24) },
    ditherStrength: { value: 0.7 },
    contrast: { value: 1.03 },
    saturation: { value: 0.95 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform vec3 colorSteps;
    uniform float ditherStrength;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;

    float bayer4(vec2 p) {
      float x = mod(p.x, 4.0);
      float y = mod(p.y, 4.0);

      if (y < 1.0) {
        if (x < 1.0) return 0.0/16.0 - 0.5;
        if (x < 2.0) return 8.0/16.0 - 0.5;
        if (x < 3.0) return 2.0/16.0 - 0.5;
        return 10.0/16.0 - 0.5;
      } else if (y < 2.0) {
        if (x < 1.0) return 12.0/16.0 - 0.5;
        if (x < 2.0) return 4.0/16.0 - 0.5;
        if (x < 3.0) return 14.0/16.0 - 0.5;
        return 6.0/16.0 - 0.5;
      } else if (y < 3.0) {
        if (x < 1.0) return 3.0/16.0 - 0.5;
        if (x < 2.0) return 11.0/16.0 - 0.5;
        if (x < 3.0) return 1.0/16.0 - 0.5;
        return 9.0/16.0 - 0.5;
      } else {
        if (x < 1.0) return 15.0/16.0 - 0.5;
        if (x < 2.0) return 7.0/16.0 - 0.5;
        if (x < 3.0) return 13.0/16.0 - 0.5;
        return 5.0/16.0 - 0.5;
      }
    }

    vec3 applySaturation(vec3 c, float s) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(l), c, s);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;

      c = (c - 0.5) * contrast + 0.5;
      c = applySaturation(c, saturation);

      vec2 px = floor(vUv * resolution);
      float d = bayer4(px) * ditherStrength;

      vec3 steps = max(colorSteps, vec3(2.0));
      vec3 q = c * (steps - 1.0);
      q += vec3(d);
      q = floor(q + 0.5) / (steps - 1.0);

      gl_FragColor = vec4(clamp(q, 0.0, 1.0), texel.a);
    }
  `
};

/* =========================================================
   Three.js setup
========================================================= */
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x0a0d14, 1);
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.domElement.style.imageRendering = "pixelated";
renderer.domElement.style.imageRendering = "crisp-edges";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1018, 30, 130);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ditherPass = new ShaderPass(RetroDitherShader);
composer.addPass(ditherPass);

let internalW = 640;
let internalH = 360;

function setRetroResolution() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  internalH = h >= 900 ? 480 : 360;
  internalW = Math.max(320, Math.round((internalH * (w / h)) / 16) * 16);

  renderer.setSize(internalW, internalH, false);
  composer.setSize(internalW, internalH);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;

  ditherPass.uniforms.resolution.value.set(internalW, internalH);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* =========================================================
   Lights
========================================================= */
const hemi = new THREE.HemisphereLight(0x9eb7d4, 0x1c2128, 0.62);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xd8e6ff, 1.1);
keyLight.position.set(24, 30, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 180;
keyLight.shadow.camera.left = -36;
keyLight.shadow.camera.right = 36;
keyLight.shadow.camera.top = 36;
keyLight.shadow.camera.bottom = -36;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x6fa2ff, 0.35, 60, 2.0);
fillLight.position.set(-10, 8, 8);
scene.add(fillLight);

const threadGlowCyan = new THREE.PointLight(0x45d7be, 0.0, 18, 2.0);
threadGlowCyan.position.set(0, 1.0, 0);
scene.add(threadGlowCyan);

const threadGlowViolet = new THREE.PointLight(0x6f59d8, 0.0, 16, 2.0);
threadGlowViolet.position.set(1.5, 0.9, -1.0);
scene.add(threadGlowViolet);

/* =========================================================
   Materials / texture helpers
========================================================= */
function stdMat(color, roughness = 0.9, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  m.userData.baseEmissiveIntensity = emissiveIntensity;
  return m;
}

function makeCanvasTexture(w, h, drawFn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function outlineRect(ctx, x, y, w, h, fill, stroke = "#0a0a0c") {
  px(ctx, x - 1, y - 1, w + 2, h + 2, stroke);
  px(ctx, x, y, w, h, fill);
}

function makeHeroSpriteTexture(kind = "cael") {
  return makeCanvasTexture(64, 96, (ctx) => {
    ctx.clearRect(0, 0, 64, 96);

    // Shadow fade on bottom
    const g = ctx.createRadialGradient(32, 84, 2, 32, 84, 20);
    g.addColorStop(0, "rgba(0,0,0,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(10, 64, 44, 30);

    let cloak = "#2a313c";
    let body = "#697b93";
    let accent = "#8eb1ff";
    let skin = "#d6dce6";
    let weapon = "#9ea7b8";
    let hair = "#1f2024";

    if (kind === "serah") {
      cloak = "#2f2429";
      body = "#7a676a";
      accent = "#c9817b";
      skin = "#d9d0d1";
      weapon = "#b1a7b2";
      hair = "#241e24";
    } else if (kind === "iri") {
      cloak = "#25303a";
      body = "#657f8e";
      accent = "#6fd3c3";
      skin = "#dae2eb";
      weapon = "#90b6c6";
      hair = "#20262c";
    }

    // legs / boots
    outlineRect(ctx, 22, 64, 7, 12, "#2d3139");
    outlineRect(ctx, 35, 64, 7, 12, "#2d3139");
    outlineRect(ctx, 20, 76, 10, 4, "#1f2228");
    outlineRect(ctx, 34, 76, 10, 4, "#1f2228");

    // cloak silhouette
    outlineRect(ctx, 17, 42, 30, 28, cloak);

    // torso
    outlineRect(ctx, 22, 34, 20, 18, body);

    // accent sash/trim
    px(ctx, 20, 48, 2, 14, accent);
    px(ctx, 42, 42, 2, 12, accent);

    // arms
    outlineRect(ctx, 14, 38, 7, 18, body);
    outlineRect(ctx, 43, 38, 7, 18, body);

    // head
    outlineRect(ctx, 24, 18, 16, 14, skin);
    px(ctx, 24, 16, 16, 4, hair);
    px(ctx, 23, 18, 2, 10, hair);
    px(ctx, 39, 18, 2, 10, hair);

    // eye slit
    px(ctx, 28, 24, 8, 1, "#1a1c22");

    // weapon silhouettes
    if (kind === "cael") {
      outlineRect(ctx, 46, 28, 3, 26, weapon);
      px(ctx, 47, 24, 2, 5, "#c8cfdb");
    } else if (kind === "serah") {
      outlineRect(ctx, 47, 34, 2, 20, weapon);
      px(ctx, 44, 26, 8, 2, "#b7becf");
      px(ctx, 50, 27, 2, 5, "#b7becf");
    } else {
      outlineRect(ctx, 47, 30, 2, 24, weapon);
      outlineRect(ctx, 10, 48, 7, 9, "#5ccbbd");
    }

    // tiny highlight pixels (PS1-ish "readability" cheat)
    px(ctx, 25, 36, 3, 2, "rgba(255,255,255,0.22)");
    px(ctx, 37, 46, 2, 2, "rgba(255,255,255,0.18)");
  });
}

function makeEnemySpriteTexture(enemyId = "thicket_stalker") {
  return makeCanvasTexture(96, 96, (ctx) => {
    ctx.clearRect(0, 0, 96, 96);

    let shell = "#323846";
    let core = "#4dd7bf";
    let eye = "#b4fff0";
    let outline = "#090a0d";

    if (enemyId === "knotling_matron") {
      shell = "#4a343d";
      core = "#d16f8f";
      eye = "#ffd2e0";
    } else if (enemyId === "knot_wisp") {
      shell = "#2f3243";
      core = "#7f69ff";
      eye = "#d6cfff";
    } else if (enemyId === "lantern_thief") {
      shell = "#3f362f";
      core = "#e5b45a";
      eye = "#ffe7b4";
    } else if (enemyId === "thread_mite") {
      shell = "#2b2f38";
      core = "#61d8c8";
      eye = "#d4fff5";
    }

    // soft shadow
    const g = ctx.createRadialGradient(48, 82, 3, 48, 82, 24);
    g.addColorStop(0, "rgba(0,0,0,0.30)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(18, 60, 60, 30);

    // body mass
    outlineRect(ctx, 22, 26, 50, 32, shell, outline);
    px(ctx, 18, 34, 8, 14, shell);
    px(ctx, 70, 32, 8, 14, shell);
    px(ctx, 28, 20, 10, 10, shell);
    px(ctx, 58, 18, 10, 10, shell);

    // legs / thorn limbs
    for (let i = 0; i < 5; i++) {
      px(ctx, 18 + i * 10, 58 + (i % 2), 4, 10, "#23262d");
      px(ctx, 20 + i * 10, 67 + (i % 2), 2, 7, "#16181d");
    }
    for (let i = 0; i < 4; i++) {
      px(ctx, 26 + i * 11, 16 + (i % 2), 3, 8, "#1d2026");
    }

    // core / scar glow
    outlineRect(ctx, 40, 36, 14, 10, core, "#0f1116");
    px(ctx, 43, 39, 8, 4, "#d9fff7");

    // eyes
    px(ctx, 34, 31, 5, 2, eye);
    px(ctx, 57, 29, 5, 2, eye);

    // glow aura pixels
    ctx.fillStyle = core;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(36, 32, 22, 18);
    ctx.globalAlpha = 1;
  });
}

function makeRingTex() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(160,200,255,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 44, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function makeStoneTexture() {
  const tex = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#252d39";
    ctx.fillRect(0, 0, w, h);

    const tw = 32;
    for (let y = 0; y < h; y += tw) {
      for (let x = 0; x < w; x += tw) {
        const v = 34 + randi(-8, 10);
        ctx.fillStyle = `rgb(${v},${v + 6},${v + 12})`;
        ctx.fillRect(x + 1, y + 1, tw - 2, tw - 2);
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, tw - 1);

        if (Math.random() < 0.35) {
          ctx.strokeStyle = "rgba(12,14,18,0.65)";
          ctx.beginPath();
          ctx.moveTo(x + rand(6, 26), y + rand(6, 26));
          ctx.lineTo(x + rand(6, 26), y + rand(6, 26));
          ctx.lineTo(x + rand(6, 26), y + rand(6, 26));
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < 8; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const r = rand(16, 42);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(90,130,170,0.16)");
      g.addColorStop(1, "rgba(90,130,170,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

const texStone = makeStoneTexture();

/* =========================================================
   World / battle groups
========================================================= */
const worldGroup = new THREE.Group();
const battleGroup = new THREE.Group();
battleGroup.visible = false;
scene.add(worldGroup, battleGroup);

// Main world ground
const worldGround = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ color: 0x18202a, roughness: 1.0, metalness: 0.0 })
);
worldGround.rotation.x = -Math.PI / 2;
worldGround.receiveShadow = true;
scene.add(worldGround);

/* =========================================================
   Player (world)
========================================================= */
const player = {
  obj: new THREE.Group(),
  pos: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  speed: 8,
  sprintSpeed: 12,
  radius: 0.55
};

function buildWorldPlayer() {
  player.obj.clear();

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.0, 8),
    stdMat(0x29303a, 0.95, 0.0)
  );
  cloak.position.y = 0.75;
  cloak.castShadow = true;

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.65, 4, 10),
    stdMat(0x9fb1c8, 0.85, 0.08)
  );
  torso.position.y = 1.02;
  torso.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.2, 0),
    stdMat(0xcfd9e6, 0.8, 0.05)
  );
  head.position.y = 1.58;
  head.castShadow = true;

  player.obj.add(cloak, torso, head);
  player.obj.position.copy(player.pos);
  worldGroup.add(player.obj);
}
buildWorldPlayer();

/* =========================================================
   World obstacles + zones
========================================================= */
const obstacles = [];
function addRock(x, z, s = 1.6, c = 0x2a3543) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(s, 0),
    stdMat(c, 1.0, 0.0)
  );
  m.position.set(x, s * 0.8, z);
  m.castShadow = true;
  m.receiveShadow = true;
  worldGroup.add(m);
  obstacles.push({ mesh: m, r: s * 0.9 });
}
for (let i = 0; i < 18; i++) {
  addRock(rand(-85, 85), rand(-85, 85), rand(1.2, 2.8), (i % 3 === 0) ? 0x273040 : 0x334153);
}

const zones = [];
function addZone(x, z, r, kind, label) {
  const color = kind === "boss" ? 0xce6b74 : 0x6fddb2;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.18, r, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: kind === "boss" ? 0.25 : 0.20,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.06, z);
  worldGroup.add(ring);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 2.0, 8),
    stdMat(kind === "boss" ? 0x45212a : 0x1f352d, 0.9, 0.05)
  );
  beacon.position.set(x, 1.0, z);
  beacon.castShadow = true;
  worldGroup.add(beacon);

  const glow = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    stdMat(color, 0.4, 0.0, color, 0.55)
  );
  glow.position.set(x, 2.15, z);
  worldGroup.add(glow);

  zones.push({ x, z, r, kind, label, ring, beacon, glow, enabled: true, pulse: rand(0, Math.PI * 2) });
}

addZone(-40, 28, 4.0, "encounter", "easy");
addZone(35, -18, 4.0, "encounter", "mid");
addZone(15, 55, 4.0, "encounter", "hard");
addZone(60, 60, 5.0, "boss", "boss_knotling_matron");

/* =========================================================
   2.5D battle actors + stage
========================================================= */
const battleviz = {
  partyActors: [],
  enemyActor: null,
  stage: null,
  stageHaze: [],
  threadScar: null,
  enemyRim: null
};

function makeBlobShadow(radius = 0.8, opacity = 0.35) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

function collectMaterials(root) {
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!mats.includes(m)) {
        if (m.userData.baseEmissiveIntensity == null) m.userData.baseEmissiveIntensity = m.emissiveIntensity || 0;
        mats.push(m);
      }
    }
  });
  return mats;
}

function makeBillboardSprite(texture, width, height, tint = 0xffffff) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    color: tint,
    alphaTest: 0.1,
    depthWrite: true
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  plane.position.y = height * 0.5;
  plane.castShadow = false;
  plane.receiveShadow = false;
  plane.userData.billboard = true;
  return plane;
}

function makeBillboardAura(width, height, color, opacity = 0.16) {
  const aura = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.08, height * 1.08),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
  aura.position.y = height * 0.5;
  aura.userData.billboard = true;
  return aura;
}

function buildPartyActorCard(kind) {
  const root = new THREE.Group();

  const shadow = makeBlobShadow(0.75, 0.34);
  root.add(shadow);

  const tex = makeHeroSpriteTexture(kind);
  const sprite = makeBillboardSprite(tex, 1.6, 2.4, 0xffffff);
  root.add(sprite);

  let auraColor = 0x7ea8ff;
  if (kind === "serah") auraColor = 0xd68a8a;
  if (kind === "iri") auraColor = 0x6fd8c8;

  const aura = makeBillboardAura(1.6, 2.4, auraColor, 0.08);
  root.add(aura);

  root.userData.sprite = sprite;
  root.userData.aura = aura;
  root.userData.kind = kind;
  return root;
}

function buildEnemyActorCard(enemyId = "thicket_stalker") {
  const root = new THREE.Group();

  const shadow = makeBlobShadow(1.3, 0.38);
  shadow.scale.set(1.3, 1.0, 0.95);
  root.add(shadow);

  const tex = makeEnemySpriteTexture(enemyId);
  const sprite = makeBillboardSprite(tex, 2.8, 2.8, 0xffffff);
  root.add(sprite);

  const aura = makeBillboardAura(2.8, 2.8, 0x7e97cc, 0.12);
  root.add(aura);

  // Hidden helper point for damage numbers / hit position
  const hit = new THREE.Object3D();
  hit.position.set(0, 1.8, 0);
  root.add(hit);

  root.userData.sprite = sprite;
  root.userData.aura = aura;
  root.userData.hitPoint = hit;
  root.userData.enemyId = enemyId;
  return root;
}

function makeActorVisual(root, basePos, opts = {}) {
  return {
    root,
    basePos: basePos.clone(),
    bobPhase: opts.bobPhase ?? 0,
    bobAmp: opts.bobAmp ?? 0.05,
    bobSpeed: opts.bobSpeed ?? 1.7,
    bobY: opts.bobY ?? 0,
    attackT: 0,
    attackDur: 0.2,
    attackAmp: 0,
    attackDir: new THREE.Vector3(1, 0, 0),
    hitT: 0,
    hitDur: 0.14,
    hitShake: 0.1,
    flashT: 0,
    flashDur: 0.10,
    mats: collectMaterials(root)
  };
}

function buildBattleStage() {
  const g = new THREE.Group();

  // floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texStone,
      roughness: 0.93,
      metalness: 0.03
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  g.add(floor);

  // rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(18.0, 0.44, 12, 72),
    stdMat(0x303948, 0.95, 0.05)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.07;
  rim.castShadow = true;
  g.add(rim);

  // wall chunks
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.07, 0.07);
    const h = rand(4.2, 7.4);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(rand(1.8, 2.8), h, rand(0.6, 1.1)),
      stdMat(0x313b4a, 0.98, 0.0)
    );
    wall.position.set(Math.cos(a) * 17.0, h * 0.5, Math.sin(a) * 17.0);
    wall.rotation.y = -a + Math.PI / 2 + rand(-0.12, 0.12);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  // pipes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.25;
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, rand(5.4, 8.6), 10),
      stdMat(0x556274, 0.78, 0.22)
    );
    pipe.position.set(Math.cos(a) * 13.3, 2.6, Math.sin(a) * 13.3);
    pipe.rotation.z = rand(-0.22, 0.22);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    g.add(pipe);
  }

  // floor grates
  for (let i = 0; i < 3; i++) {
    const grate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.2),
      new THREE.MeshBasicMaterial({
        color: 0x6e7f98,
        transparent: true,
        opacity: 0.35
      })
    );
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(-5 + i * 4.2, 0.05, rand(-6, 6));
    g.add(grate);
  }

  // reinforced door silhouette
  const door = new THREE.Group();
  door.position.set(0, 0, -15.4);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 6.4, 0.5), stdMat(0x2f3744, 0.9, 0.08));
  frame.position.y = 3.2;
  frame.castShadow = true;
  door.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.2, 0.28), stdMat(0x49586c, 0.85, 0.16));
  panel.position.set(0, 2.75, 0.18);
  panel.castShadow = true;
  door.add(panel);

  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.7, 0.10), stdMat(0x76869e, 0.7, 0.18));
    bar.position.set(-1.5 + i * 0.75, 2.8, 0.35);
    bar.castShadow = true;
    door.add(bar);
  }
  g.add(door);

  // thread-scar centerpiece
  const threadScar = new THREE.Group();

  function addScar(points, color, radius = 0.08) {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 26, radius, 6, false),
      stdMat(0x0f1116, 0.95, 0.0, color, 0.28)
    );
    tube.position.y = 0.05;
    tube.castShadow = true;
    threadScar.add(tube);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
    );
    line.position.y = 0.07;
    threadScar.add(line);
  }

  addScar([
    new THREE.Vector3(-4.8, 0, -1.4),
    new THREE.Vector3(-2.4, 0, -0.6),
    new THREE.Vector3(-0.3, 0, 0.2),
    new THREE.Vector3(1.8, 0, 0.8),
    new THREE.Vector3(4.6, 0, 1.6)
  ], 0x45d7be, 0.10);

  addScar([
    new THREE.Vector3(-1.4, 0, -2.5),
    new THREE.Vector3(-0.5, 0, -1.0),
    new THREE.Vector3(0.5, 0, 0.4),
    new THREE.Vector3(1.4, 0, 2.4)
  ], 0x6f59d8, 0.07);

  addScar([
    new THREE.Vector3(-0.8, 0, 0.1),
    new THREE.Vector3(-2.0, 0, 1.2),
    new THREE.Vector3(-3.5, 0, 2.5)
  ], 0x45d7be, 0.06);

  addScar([
    new THREE.Vector3(0.6, 0, 0.2),
    new THREE.Vector3(2.2, 0, -1.0),
    new THREE.Vector3(3.8, 0, -2.4)
  ], 0x6f59d8, 0.06);

  // glow patches
  for (let i = 0; i < 7; i++) {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.4, 1.15), 18),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x6f59d8 : 0x45d7be,
        transparent: true,
        opacity: rand(0.06, 0.14),
        depthWrite: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(rand(-4.2, 4.2), 0.03, rand(-2.8, 2.8));
    threadScar.add(glow);
  }

  g.add(threadScar);
  battleviz.threadScar = threadScar;

  // haze planes
  battleviz.stageHaze = [];
  for (let i = 0; i < 3; i++) {
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 7),
      new THREE.MeshBasicMaterial({
        color: 0x89a8d8,
        transparent: true,
        opacity: 0.035,
        depthWrite: false
      })
    );
    haze.position.set(rand(-4, 4), 2.4 + i * 0.4, -2 + i * 2);
    haze.lookAt(0, 2.5, 12);
    g.add(haze);
    battleviz.stageHaze.push(haze);
  }

  battleviz.stage = g;
  return g;
}

function buildBattleScene() {
  battleGroup.clear();
  battleviz.partyActors = [];
  battleviz.enemyActor = null;
  battleviz.enemyRim = null;
  battleviz.threadScar = null;
  battleviz.stageHaze = [];

  const stage = buildBattleStage();
  battleGroup.add(stage);

  const partyPositions = [
    new THREE.Vector3(-7.0, 0, -2.8),
    new THREE.Vector3(-8.0, 0,  0.2),
    new THREE.Vector3(-7.0, 0,  3.0)
  ];
  const partyKinds = ["cael", "serah", "iri"];

  for (let i = 0; i < 3; i++) {
    const root = buildPartyActorCard(partyKinds[i]);
    root.position.copy(partyPositions[i]);
    root.rotation.y = -0.15;
    battleGroup.add(root);

    battleviz.partyActors.push(
      makeActorVisual(root, partyPositions[i], {
        bobPhase: rand(0, Math.PI * 2),
        bobAmp: 0.04 + i * 0.005,
        bobSpeed: 1.7 + i * 0.15,
        bobY: 0
      })
    );
  }

  const enemyRoot = buildEnemyActorCard("thicket_stalker");
  const enemyPos = new THREE.Vector3(7.6, 0, 0.2);
  enemyRoot.position.copy(enemyPos);
  battleGroup.add(enemyRoot);

  battleviz.enemyActor = makeActorVisual(enemyRoot, enemyPos, {
    bobPhase: rand(0, Math.PI * 2),
    bobAmp: 0.07,
    bobSpeed: 1.25,
    bobY: 0.02
  });

  const enemyRim = new THREE.PointLight(0x7b95cc, 0.55, 22, 2.0);
  battleGroup.add(enemyRim);
  battleviz.enemyRim = enemyRim;
}
buildBattleScene();

/* =========================================================
   Battle camera
========================================================= */
const battleCam = {
  basePos: new THREE.Vector3(0, 9.4, 15.7),
  baseTarget: new THREE.Vector3(0, 1.35, 0),
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
  const drift = new THREE.Vector3(
    Math.sin(t * 0.33) * 0.18,
    Math.sin(t * 0.47 + 0.7) * 0.07,
    Math.cos(t * 0.29 + 0.3) * 0.14
  );

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

  const pos = battleCam.basePos.clone().add(drift).add(battleCam.shakeOffset);
  const target = battleCam.baseTarget.clone().add(new THREE.Vector3(Math.sin(t * 0.22) * 0.10, 0, 0));

  camera.position.lerp(pos, 1 - Math.pow(0.0005, dt));
  camera.lookAt(target);
}

/* =========================================================
   Input
========================================================= */
const keys = { w: false, a: false, s: false, d: false, shift: false, q: false, e: false };

window.addEventListener("keydown", (ev) => {
  if (ev.code === "KeyW") keys.w = true;
  if (ev.code === "KeyA") keys.a = true;
  if (ev.code === "KeyS") keys.s = true;
  if (ev.code === "KeyD") keys.d = true;
  if (ev.code === "ShiftLeft" || ev.code === "ShiftRight") keys.shift = true;
  if (ev.code === "KeyQ") keys.q = true;
  if (ev.code === "KeyE") keys.e = true;

  if (ev.code === "KeyR") resetRun();
});

window.addEventListener("keyup", (ev) => {
  if (ev.code === "KeyW") keys.w = false;
  if (ev.code === "KeyA") keys.a = false;
  if (ev.code === "KeyS") keys.s = false;
  if (ev.code === "KeyD") keys.d = false;
  if (ev.code === "ShiftLeft" || ev.code === "ShiftRight") keys.shift = false;
  if (ev.code === "KeyQ") keys.q = false;
  if (ev.code === "KeyE") keys.e = false;
});

/* =========================================================
   UI rendering
========================================================= */
function renderPartyPanel() {
  ui.partyPanel.innerHTML = `<div class="partyTitle">Party</div>`;

  for (const m of Party) {
    const dead = m.hp <= 0;
    const ready = m.dread >= 100;
    const sub = dead ? "Down" : (ready ? "Dread Art READY" : "—");

    ui.partyPanel.innerHTML += `
      <div class="member ${dead ? "dead" : ""}">
        <div class="memberRow">
          <div>
            <div class="mname">${m.name}</div>
            <div class="msub ${ready && !dead ? "ready" : ""}">${sub}</div>
          </div>
          <div class="mstats">
            <div>HP <b>${m.hp}</b> / ${m.hpMax}</div>
            <div>Dread <b>${Math.floor(m.dread)}</b> / 100</div>
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

  const makeBtn = (label, onClick, primary = false, disabled = false) => {
    const b = document.createElement("button");
    b.textContent = label;
    if (primary) b.className = "primary";
    b.disabled = disabled;
    b.onclick = onClick;
    return b;
  };

  ui.actionButtons.append(
    makeBtn("Attack", () => playerAttack(actIdx, 1.0), true, false),
    makeBtn(actor.skillName, () => playerSkill(actIdx), false, false),
    makeBtn("Dread Art", () => playerDreadArt(actIdx), false, actor.dread < 100)
  );
}

/* =========================================================
   Floating damage numbers (DOM)
========================================================= */
const dmgNums = [];

function spawnDmg(text, worldPos, crit = false, heal = false) {
  const el = document.createElement("div");
  el.className = `dmg${crit ? " crit" : ""}${heal ? " heal" : ""}`;
  el.textContent = text;
  el.style.fontSize = crit ? "30px" : (heal ? "24px" : "22px");
  el.style.color = heal ? "#7dffb2" : (crit ? "#ffd24a" : "#eef3ff");
  document.body.appendChild(el);

  dmgNums.push({
    el,
    pos: worldPos.clone(),
    velY: heal ? 0.85 : (crit ? 1.05 : 0.92),
    t: 0,
    life: heal ? 1.0 : (crit ? 1.05 : 0.92),
    driftX: rand(-0.16, 0.16),
    driftZ: rand(-0.12, 0.12),
    popT: 0.11
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
    const moveFactor = n.t < hang ? (n.t / hang) * 0.25 : 1.0;

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

    const popScale = n.popT > 0 ? (1 + (n.popT / 0.11) * 0.35) : 1;
    n.popT = Math.max(0, n.popT - dt);

    n.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${popScale.toFixed(3)})`;
    n.el.style.opacity = String(a);
  }
}

function clearDmgNums() {
  while (dmgNums.length) {
    const n = dmgNums.pop();
    n.el.remove();
  }
}

/* =========================================================
   Collision helpers
========================================================= */
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

/* =========================================================
   2.5D actor animation helpers
========================================================= */
function actorWorldHitPosParty(idx) {
  const a = battleviz.partyActors[idx];
  if (!a) return new THREE.Vector3();
  return a.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.7, 0));
}

function actorWorldHitPosEnemy() {
  if (!battleviz.enemyActor) return new THREE.Vector3();
  const hp = battleviz.enemyActor.root.userData.hitPoint;
  return hp
    ? hp.getWorldPosition(new THREE.Vector3())
    : battleviz.enemyActor.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.8, 0));
}

function markAttackLunge(attackerVis, targetPos, amp = 0.62, dur = 0.20) {
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

  markAttackLunge(attacker, target.basePos, strong ? 0.82 : 0.64, strong ? 0.24 : 0.20);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.18 : 0.12);
    addBattleShake(strong ? 0.19 : 0.12, strong ? 0.15 : 0.11);
  }, strong ? 120 : 95);
}

function playEnemyStrikeFX(targetIdx, strong = false) {
  const attacker = battleviz.enemyActor;
  const target = battleviz.partyActors[targetIdx];
  if (!attacker || !target) return;

  markAttackLunge(attacker, target.basePos, strong ? 0.95 : 0.74, strong ? 0.25 : 0.21);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.16 : 0.11);
    addBattleShake(strong ? 0.20 : 0.14, strong ? 0.14 : 0.10);
  }, strong ? 120 : 100);
}

function updateActorVisuals(dt, t) {
  const updateOne = (a, facingYaw) => {
    if (!a) return;

    const offset = new THREE.Vector3();
    const bob = Math.sin(t * a.bobSpeed + a.bobPhase) * a.bobAmp;
    offset.y += a.bobY + bob;

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
      offset.z += rand(-1, 1) * a.hitShake * 0.7 * k;
      offset.y += Math.sin((1 - k) * Math.PI) * 0.07 * k;
    }

    a.root.position.copy(a.basePos).add(offset);

    if (a.flashT > 0) a.flashT = Math.max(0, a.flashT - dt);
    const flashK = a.flashT > 0 ? (a.flashT / a.flashDur) : 0;

    for (const m of a.mats) {
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = (m.userData.baseEmissiveIntensity || 0) + flashK * 0.45;
      }
    }

    // Small body yaw wobble
    a.root.rotation.y = facingYaw + Math.sin(t * 0.5 + a.bobPhase) * 0.015;

    // Billboard planes face camera
    a.root.traverse((o) => {
      if (o.userData?.billboard) o.lookAt(camera.position);
    });

    // Aura pulse
    const aura = a.root.userData.aura;
    if (aura?.material) {
      aura.material.opacity = 0.06 + Math.sin(t * 2.0 + a.bobPhase) * 0.015 + flashK * 0.10;
    }
  };

  // Party faces toward enemy
  for (let i = 0; i < battleviz.partyActors.length; i++) updateOne(battleviz.partyActors[i], -0.15);
  // Enemy faces toward party
  updateOne(battleviz.enemyActor, Math.PI + 0.22);

  // Enemy rim light follows
  if (battleviz.enemyActor && battleviz.enemyRim) {
    battleviz.enemyRim.position.copy(battleviz.enemyActor.root.position).add(new THREE.Vector3(2.2, 2.2, -1.6));
    battleviz.enemyRim.intensity = 0.42 + Math.sin(t * 1.3) * 0.08 + (battleviz.enemyActor.flashT > 0 ? 0.18 : 0);
  }

  // Thread glow pulse
  const pulse = 0.85 + Math.sin(t * 1.3) * 0.12 + Math.sin(t * 2.5 + 1.1) * 0.04;
  threadGlowCyan.intensity = mode === Mode.BATTLE ? 0.50 * pulse : 0;
  threadGlowViolet.intensity = mode === Mode.BATTLE ? 0.36 * pulse : 0;

  // Haze drift
  for (let i = 0; i < battleviz.stageHaze.length; i++) {
    const hz = battleviz.stageHaze[i];
    hz.position.y += Math.sin(t * (0.18 + i * 0.03) + i) * 0.0008;
  }
}

function configureEnemyVisualForEncounter(e) {
  if (!battleviz.enemyActor) return;

  const root = battleviz.enemyActor.root;
  const sprite = root.userData.sprite;
  const aura = root.userData.aura;
  if (!sprite) return;

  sprite.material.map = makeEnemySpriteTexture(e.id);
  sprite.material.needsUpdate = true;

  const isBoss = !!e.boss;
  let size = { w: 2.8, h: 2.8 };
  let auraColor = 0x7b95cc;
  let auraOpacity = 0.12;

  if (e.id === "thread_mite") {
    size = { w: 2.0, h: 2.0 };
    auraColor = 0x5ed7c8;
  } else if (e.id === "sewer_gnawer") {
    size = { w: 2.2, h: 2.2 };
    auraColor = 0x8ea1c0;
  } else if (e.id === "lantern_thief") {
    size = { w: 2.5, h: 2.5 };
    auraColor = 0xdba95b;
  } else if (e.id === "knot_wisp") {
    size = { w: 2.3, h: 2.3 };
    auraColor = 0x8b74ff;
  } else if (e.id === "thicket_stalker") {
    size = { w: 2.8, h: 2.8 };
    auraColor = 0x7b95cc;
  } else if (e.id === "knotling_matron") {
    size = { w: 3.4, h: 3.4 };
    auraColor = 0xd16f8f;
    auraOpacity = 0.16;
  }

  sprite.geometry.dispose();
  sprite.geometry = new THREE.PlaneGeometry(size.w, size.h);
  sprite.position.y = size.h * 0.5;

  if (aura) {
    aura.geometry.dispose();
    aura.geometry = new THREE.PlaneGeometry(size.w * 1.08, size.h * 1.08);
    aura.position.y = size.h * 0.5;
    aura.material.color.setHex(auraColor);
    aura.material.opacity = auraOpacity;
  }

  if (root.userData.hitPoint) root.userData.hitPoint.position.set(0, Math.max(1.5, size.h * 0.62), 0);

  battleviz.enemyActor.basePos.set(isBoss ? 7.2 : 7.7, 0, 0.2);
  root.position.copy(battleviz.enemyActor.basePos);
}

/* =========================================================
   Battle mechanics (kept same core flow/rules)
========================================================= */
function anyPartyAlive() {
  return Party.some(m => m.hp > 0);
}

function alivePartyIndices() {
  const out = [];
  for (let i = 0; i < Party.length; i++) if (Party[i].hp > 0) out.push(i);
  return out;
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

function startBattle(enemyId) {
  // Save world return state
  worldReturn.pos.copy(player.pos);
  worldReturn.yaw = player.yaw;

  enemy = { ...EnemyDB[enemyId] };

  mode = Mode.BATTLE;
  ui.mode.textContent = "BATTLE";

  worldGroup.visible = false;
  battleGroup.visible = true;
  ui.battleUI.style.display = "grid";
  ui.enemyName.style.display = "block";

  player.obj.visible = false;

  camera.position.copy(battleCam.basePos);
  camera.lookAt(battleCam.baseTarget);

  configureEnemyVisualForEncounter(enemy);

  battle.active = true;
  battle.phase = "player_turn";
  battle.actorIndex = 0;
  battle.aliveOrder = alivePartyIndices();

  ui.enemyName.textContent = `${enemy.name} (HP hidden)`;
  ui.log.innerHTML = "";
  logLine(`Encounter! ${enemy.name} appears.`);
  logLine(`Enemy HP is hidden. Fight smart.`);

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
  ui.battleUI.style.display = "none";
  ui.enemyName.style.display = "none";

  player.obj.visible = true;
  player.pos.copy(worldReturn.pos);
  player.yaw = worldReturn.yaw;
  player.obj.position.copy(player.pos);

  encounterCooldown = 2.2;

  renderPartyPanel();

  ui.overlay.style.display = "grid";
  ui.overlayTitle.textContent = victory ? "Victory" : "Defeat";
  ui.overlayText.textContent = victory
    ? "You survive the clash. The road opens again."
    : "You fall back and regroup at the last safe footing.";
  ui.startBtn.textContent = "Continue";
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
    setTimeout(() => endBattle(true), 500);
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
      const miss = Party[i].hpMax - Party[i].hp;
      if (miss > bestMissing) { bestMissing = miss; best = i; }
    }

    const amt = actor.healAmt;
    Party[best].hp = clamp(Party[best].hp + amt, 0, Party[best].hpMax);
    addDread(idx, 12);

    const healer = battleviz.partyActors[idx];
    if (healer) healer.flashT = healer.flashDur;
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

  // damage skill uses same damage pipeline
  playerAttack(idx, actor.skillMul);
}

function playerDreadArt(idx) {
  if (!enemy) return;
  const actor = Party[idx];
  if (!consumeDreadIfFull(idx)) return;

  playPartyStrikeFX(idx, true);
  addBattleShake(0.18, 0.18);

  const dmg = Math.max(1, Math.floor((actor.atk * 2.1) - enemy.def + rand(0, 6)));
  enemy.hp -= dmg;

  logLine(`${actor.name} unleashes a Dread Art! (${dmg})`);
  spawnDmg(String(dmg), actorWorldHitPosEnemy(), true, false);

  if (battleviz.enemyActor) battleviz.enemyActor.flashT = battleviz.enemyActor.flashDur * 1.5;

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

  const crit = (rollCrit() && !enemy.boss) ? true : (Math.random() < 0.06);
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

/* =========================================================
   World movement / camera / zone triggers
========================================================= */
function cameraFollowWorld(dt) {
  const rotSpeed = 1.8;
  if (keys.q) player.yaw += rotSpeed * dt;
  if (keys.e) player.yaw -= rotSpeed * dt;

  const dist = 9.2;
  const height = 5.4;

  const behind = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(-dist);
  const camPos = player.pos.clone().add(behind).add(new THREE.Vector3(0, height, 0));

  camera.position.x = lerp(camera.position.x, camPos.x, 1 - Math.pow(0.0005, dt));
  camera.position.y = lerp(camera.position.y, camPos.y, 1 - Math.pow(0.0005, dt));
  camera.position.z = lerp(camera.position.z, camPos.z, 1 - Math.pow(0.0005, dt));

  camera.lookAt(player.pos.x, player.pos.y + 1.2, player.pos.z);
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
  player.obj.position.x = player.pos.x;
  player.obj.position.z = player.pos.z;

  if (moving) {
    player.obj.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
    player.obj.position.y = Math.sin(performance.now() * 0.01) * 0.03;
  } else {
    player.obj.position.y = lerp(player.obj.position.y, 0, 0.2);
  }
}

function checkZones() {
  if (encounterCooldown > 0) return;

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

/* =========================================================
   Reset / start
========================================================= */
function resetParty() {
  for (const m of Party) {
    m.hp = m.hpMax;
    m.dread = 0;
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
  battle.aliveOrder = [];

  resetParty();
  renderPartyPanel();
  renderActionUI();

  for (const z of zones) {
    z.enabled = true;
    if (z.kind === "boss") {
      z.ring.material.color.setHex(0xce6b74);
      z.ring.material.opacity = 0.25;
      if (z.glow.material) z.glow.material.emissiveIntensity = 0.55;
    } else {
      z.ring.material.color.setHex(0x6fddb2);
      z.ring.material.opacity = 0.20;
      if (z.glow.material) z.glow.material.emissiveIntensity = 0.55;
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
  player.obj.position.set(0, 0, 0);
  player.obj.visible = true;

  camera.position.set(0, 6, 10);
  camera.lookAt(0, 1.2, 0);

  ui.overlay.style.display = "none";
  ui.startBtn.textContent = "Start Prototype";
  ui.overlayTitle.textContent = "Veilborn Oath — 2.5D Prototype";
  ui.overlayText.textContent = "PS1-inspired presentation with 2.5D battle actors, retro rendering, and the same turn-based loop.";

  ui.log.innerHTML = "";
}

ui.startBtn.addEventListener("click", () => {
  ui.overlay.style.display = "none";
});

ui.resetBtn.addEventListener("click", () => resetRun());

/* =========================================================
   Main loop
========================================================= */
let last = performance.now();

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  const t = now / 1000;

  // HUD
  ui.bossFlag.textContent = bossCleared ? "YES" : "no";
  ui.cd.textContent = encounterCooldown.toFixed(1);

  if (encounterCooldown > 0) encounterCooldown = Math.max(0, encounterCooldown - dt);

  // zone pulse visuals
  for (const z of zones) {
    z.pulse += dt * (z.kind === "boss" ? 1.7 : 1.4);
    const pulse = 0.5 + 0.5 * Math.sin(z.pulse);

    if (z.enabled) {
      z.ring.material.opacity = (z.kind === "boss" ? 0.18 : 0.13) + pulse * (z.kind === "boss" ? 0.08 : 0.06);
      z.glow.position.y = 2.15 + Math.sin(z.pulse * 1.6) * 0.10;
      if (z.glow.material?.emissiveIntensity != null) {
        z.glow.material.emissiveIntensity = 0.35 + pulse * 0.35;
      }
      z.ring.rotation.z += dt * 0.10 * (z.kind === "boss" ? -1 : 1);
    }
  }

  if (bossCleared) {
    const bz = zones.find(z => z.kind === "boss");
    if (bz) {
      bz.enabled = false;
      bz.ring.material.opacity = 0.08;
      bz.ring.material.color.setHex(0x666666);
      if (bz.glow.material?.emissiveIntensity != null) bz.glow.material.emissiveIntensity = 0.06;
    }
  }

  if (mode === Mode.WORLD) {
    scene.fog.color.setHex(0x0b1018);
    scene.fog.near = 35;
    scene.fog.far = 150;

    worldMove(dt);
    cameraFollowWorld(dt);
    checkZones();

    // world ambient glow off
    threadGlowCyan.intensity = 0;
    threadGlowViolet.intensity = 0;
  } else {
    scene.fog.color.setHex(0x111622);
    scene.fog.near = 16;
    scene.fog.far = 70;

    updateBattleCamera(dt, t);
    updateActorVisuals(dt, t);
  }

  updateDmgNums(dt);
  composer.render();
}

/* =========================================================
   Resize / boot
========================================================= */
window.addEventListener("resize", () => {
  setRetroResolution();
});

renderPartyPanel();
renderActionUI();
setRetroResolution();
tick();
resetRun();

window.resetRun = resetRun;
