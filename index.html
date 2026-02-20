import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// ---------------------------------------------
// Utilities
// ---------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------
// UI refs
// ---------------------------------------------
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

function logLine(s) {
  const div = document.createElement("div");
  div.textContent = s;
  ui.log.appendChild(div);
  ui.log.scrollTop = ui.log.scrollHeight;
}

// ---------------------------------------------
// Data (prototype stats)
// ---------------------------------------------
const Party = [
  { id:"cael",  name:"Cael",        hpMax:120, hp:120, atk:16, def:8, spd:10, dread:0, skillName:"Cleave", skillType:"dmg",  skillMul:1.25 },
  { id:"serah", name:"Serah Mourn", hpMax:95,  hp:95,  atk:14, def:6, spd:14, dread:0, skillName:"Sunder", skillType:"dmg",  skillMul:1.15 },
  { id:"iri",   name:"Iri Voss",    hpMax:105, hp:105, atk:12, def:7, spd:9,  dread:0, skillName:"Mend",   skillType:"heal", healAmt:26 }
];

const EnemyDB = {
  sewer_gnawer:     { id:"sewer_gnawer",     name:"Sewer Gnawer",     hp:60,  atk:10, def:4,  spd:8  },
  thread_mite:      { id:"thread_mite",      name:"Thread Mite",      hp:45,  atk:9,  def:3,  spd:12 },
  lantern_thief:    { id:"lantern_thief",    name:"Lantern Thief",    hp:70,  atk:12, def:5,  spd:10 },
  knot_wisp:        { id:"knot_wisp",        name:"Knot Wisp",        hp:55,  atk:11, def:4,  spd:13 },
  thicket_stalker:  { id:"thicket_stalker",  name:"Thicket Stalker",  hp:110, atk:18, def:8,  spd:12 },
  knotling_matron:  { id:"knotling_matron",  name:"Knotling Matron",  hp:320, atk:22, def:10, spd:9, boss:true }
};

const Pools = {
  easy: ["sewer_gnawer", "thread_mite", "lantern_thief"],
  mid:  ["knot_wisp", "lantern_thief", "sewer_gnawer"],
  hard: ["thicket_stalker", "knot_wisp", "lantern_thief"]
};

// ---------------------------------------------
// Game state
// ---------------------------------------------
const Mode = { WORLD:"WORLD", BATTLE:"BATTLE" };
let mode = Mode.WORLD;

let bossCleared = false;
let encounterCooldown = 0.0;

// World return
const worldReturn = { pos: new THREE.Vector3(0, 0, 0), yaw: 0 };

// Battle state
let enemy = null; // active enemy object copy
let battle = {
  active: false,
  phase: "idle", // "player_turn" | "enemy_turn"
  actorIndex: 0,
  aliveOrder: []
};

// ---------------------------------------------
// Retro post-process shader (quantization + ordered dithering)
// ---------------------------------------------
const RetroDitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(640, 360) },
    colorSteps: { value: new THREE.Vector3(26, 24, 22) }, // subtle PS1-ish reduction
    ditherStrength: { value: 0.85 },
    contrast: { value: 1.03 },
    saturation: { value: 0.94 }
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
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int idx = x + y * 4;

      // 4x4 Bayer matrix values 0..15
      float m[16];
      m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
      m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
      m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
      m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
      return (m[idx] / 16.0) - 0.5;
    }

    vec3 applySaturation(vec3 c, float s) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(l), c, s);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;

      // Mild contrast / saturation shaping (kept subtle)
      c = (c - 0.5) * contrast + 0.5;
      c = applySaturation(c, saturation);

      // Ordered dithering in screen pixel space
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

// ---------------------------------------------
// Three.js setup
// ---------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x050608, 1);
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.domElement.style.imageRendering = "pixelated";
renderer.domElement.style.imageRendering = "crisp-edges";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x06080c, 26, 95);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 10);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const ditherPass = new ShaderPass(RetroDitherShader);
composer.addPass(renderPass);
composer.addPass(ditherPass);

let internalW = 640;
let internalH = 360;
function setRetroResolution() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Pick a stable internal height; width follows aspect and snaps to multiples of 16
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

// ---------------------------------------------
// Lights
// ---------------------------------------------
const hemi = new THREE.HemisphereLight(0x6e87a8, 0x090b0f, 0.34);
scene.add(hemi);

const keyMoon = new THREE.DirectionalLight(0xc8d8ff, 0.75);
keyMoon.position.set(20, 28, 14);
keyMoon.castShadow = true;
keyMoon.shadow.mapSize.set(1024, 1024);
keyMoon.shadow.camera.near = 1;
keyMoon.shadow.camera.far = 120;
keyMoon.shadow.camera.left = -28;
keyMoon.shadow.camera.right = 28;
keyMoon.shadow.camera.top = 28;
keyMoon.shadow.camera.bottom = -28;
scene.add(keyMoon);

const fillBlue = new THREE.PointLight(0x3a5f9a, 0.28, 40, 2.0);
fillBlue.position.set(-8, 5, 6);
scene.add(fillBlue);

const threadGlowCyan = new THREE.PointLight(0x4de0c0, 0.0, 14, 2.0);
threadGlowCyan.position.set(0, 1.0, 0);
scene.add(threadGlowCyan);

const threadGlowViolet = new THREE.PointLight(0x7257d6, 0.0, 12, 2.2);
threadGlowViolet.position.set(1.2, 0.8, -0.8);
scene.add(threadGlowViolet);

// Global ambient ground (world floor)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ color: 0x0d1218, roughness: 1.0, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------
// Texture helpers (procedural)
// ---------------------------------------------
function makeCanvasTex(w, h, drawFn, { repeat = [1, 1] } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function stoneTileTexture() {
  return makeCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1a1f27";
    ctx.fillRect(0, 0, w, h);

    // tile grid
    const cols = 8;
    const rows = 8;
    const tw = w / cols;
    const th = h / rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ox = x * tw;
        const oy = y * th;
        const shade = 22 + randi(-6, 8);
        ctx.fillStyle = `rgb(${shade}, ${shade+3}, ${shade+8})`;
        ctx.fillRect(ox + 1, oy + 1, tw - 2, th - 2);

        // edge grime
        ctx.strokeStyle = `rgba(0,0,0,${rand(0.16, 0.28).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + 0.5, oy + 0.5, tw - 1, th - 1);

        // cracks
        if (Math.random() < 0.33) {
          ctx.strokeStyle = "rgba(6,8,10,0.55)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          let px = ox + rand(4, tw - 4);
          let py = oy + rand(4, th - 4);
          ctx.moveTo(px, py);
          const segs = randi(2, 5);
          for (let i = 0; i < segs; i++) {
            px += rand(-7, 7);
            py += rand(-7, 7);
            px = clamp(px, ox + 2, ox + tw - 2);
            py = clamp(py, oy + 2, oy + th - 2);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // damp speckle
        for (let i = 0; i < 16; i++) {
          const ax = ox + rand(2, tw - 2);
          const ay = oy + rand(2, th - 2);
          const a = rand(0.02, 0.08);
          ctx.fillStyle = `rgba(110, 145, 168, ${a.toFixed(3)})`;
          ctx.fillRect(ax, ay, 1, 1);
        }
      }
    }

    // big damp patches
    for (let i = 0; i < 6; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const r = rand(18, 44);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(88, 126, 160, 0.14)");
      g.addColorStop(1, "rgba(88, 126, 160, 0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [5, 5] });
}

function metalTexture() {
  return makeCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#252a31";
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      const v = 35 + Math.floor(12 * Math.sin(y * 0.11)) + randi(-6, 6);
      ctx.fillStyle = `rgba(${v},${v+2},${v+5},0.22)`;
      ctx.fillRect(0, y, w, 1);
    }

    for (let i = 0; i < 800; i++) {
      const x = randi(0, w - 1);
      const y = randi(0, h - 1);
      const a = rand(0.05, 0.18);
      ctx.fillStyle = `rgba(210,220,235,${a.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }

    for (let i = 0; i < 18; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      ctx.strokeStyle = `rgba(0,0,0,${rand(0.12, 0.25).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-40, 40), y + rand(-12, 12));
      ctx.stroke();
    }
  }, { repeat: [2, 2] });
}

function grateTexture() {
  return makeCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#181b20";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(110,120,136,0.45)";
    ctx.lineWidth = 3;

    for (let x = 12; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, h - 8);
      ctx.stroke();
    }
    for (let y = 12; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(w - 8, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(25, 28, 34, 0.9)";
    ctx.lineWidth = 1;
    for (let x = 12; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x + 1, 8);
      ctx.lineTo(x + 1, h - 8);
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

const texStone = stoneTileTexture();
const texMetal = metalTexture();
const texGrate = grateTexture();

// ---------------------------------------------
// World objects
// ---------------------------------------------
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const battleGroup = new THREE.Group();
battleGroup.visible = false;
scene.add(battleGroup);

// World player rig
const player = {
  obj: new THREE.Group(),
  pos: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  speed: 8.0,
  sprintSpeed: 12.0,
  radius: 0.55
};

function makeStd(color, roughness = 0.9, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  m.userData.baseEmissiveIntensity = emissiveIntensity;
  return m;
}

function buildPlayer() {
  player.obj.clear();

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.1, 8),
    makeStd(0x232830, 0.95, 0.0)
  );
  cloak.position.y = 0.8;
  cloak.castShadow = true;

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.72, 4, 10),
    makeStd(0x8ea0b4, 0.85, 0.06)
  );
  torso.position.y = 1.05;
  torso.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    makeStd(0xb7c4d6, 0.85, 0.05)
  );
  head.position.y = 1.68;
  head.castShadow = true;

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.55, 0.06),
    makeStd(0x627188, 0.45, 0.35)
  );
  blade.position.set(0.34, 0.95, 0.14);
  blade.rotation.z = -0.35;
  blade.castShadow = true;

  player.obj.add(cloak, torso, head, blade);
  player.obj.position.copy(player.pos);
  worldGroup.add(player.obj);
}
buildPlayer();

// Obstacles
const obstacles = [];
function addRock(x, z, s = 1.0, c = 0x1b2a3a) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(s, 0),
    makeStd(c, 1.0, 0.0)
  );
  m.position.set(x, s * 0.9, z);
  m.castShadow = true;
  m.receiveShadow = true;
  worldGroup.add(m);
  obstacles.push({ mesh: m, r: s * 0.9 });
}
for (let i = 0; i < 18; i++) {
  addRock(rand(-85, 85), rand(-85, 85), rand(1.2, 3.0), (i % 3 === 0) ? 0x1a2230 : 0x223145);
}

// Encounter zones (rings)
const zones = [];
function addZone(x, z, r, kind, label) {
  const ringMat = new THREE.MeshBasicMaterial({
    color: kind === "boss" ? 0xb64a4a : 0x6bd5a1,
    transparent: true,
    opacity: kind === "boss" ? 0.22 : 0.18,
    side: THREE.DoubleSide
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.18, r, 54), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.05, z);
  worldGroup.add(ring);

  const beaconCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 2.1, 8),
    makeStd(kind === "boss" ? 0x371819 : 0x1a2c24, 0.9, 0.1)
  );
  beaconCore.position.set(x, 1.05, z);
  beaconCore.castShadow = true;
  worldGroup.add(beaconCore);

  const beaconGlow = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    makeStd(kind === "boss" ? 0xd86f5a : 0x73d29f, 0.4, 0.0, kind === "boss" ? 0xd86f5a : 0x73d29f, 0.55)
  );
  beaconGlow.position.set(x, 2.2, z);
  worldGroup.add(beaconGlow);

  zones.push({ x, z, r, kind, label, ring, beaconCore, beaconGlow, enabled: true, pulse: rand(0, Math.PI * 2) });
}

addZone(-40, 28, 4.0, "encounter", "easy");
addZone( 35,-18, 4.0, "encounter", "mid");
addZone( 15, 55, 4.0, "encounter", "hard");
addZone( 60, 60, 5.0, "boss",     "boss_knotling_matron");

// ---------------------------------------------
// Battle visuals
// ---------------------------------------------
const battleviz = {
  room: null,
  floor: null,
  partyActors: [],
  enemyActor: null,
  haze: [],
  threadScarGroup: null
};

function makeBlobShadow(radius = 0.7, opacity = 0.33) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

function collectMaterials(root) {
  const mats = [];
  root.traverse((o) => {
    if (o.isMesh && o.material) {
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of arr) {
        if (m && !mats.includes(m)) {
          if (m.userData.baseEmissiveIntensity == null) m.userData.baseEmissiveIntensity = m.emissiveIntensity || 0;
          mats.push(m);
        }
      }
    }
  });
  return mats;
}

function makeActorVisual(root, basePos, { bobPhase = 0, bobAmp = 0.06, bobSpeed = 2.0, bobY = 0.0 } = {}) {
  return {
    root,
    basePos: basePos.clone(),
    bobPhase,
    bobAmp,
    bobSpeed,
    bobY,
    attackT: 0,
    attackDur: 0.22,
    attackAmp: 0.0,
    attackDir: new THREE.Vector3(),
    hitT: 0,
    hitDur: 0.16,
    hitShake: 0.13,
    flashT: 0,
    flashDur: 0.10,
    mats: collectMaterials(root),
    dead: false
  };
}

function addChain(group, x, z, len = 5.5, color = 0x4a4e57) {
  const chainMat = makeStd(color, 0.85, 0.15);
  const linkGeo = new THREE.TorusGeometry(0.09, 0.025, 6, 10);

  for (let i = 0; i < Math.floor(len / 0.22); i++) {
    const link = new THREE.Mesh(linkGeo, chainMat);
    link.position.set(x + Math.sin(i * 0.3) * 0.02, len - i * 0.22, z);
    link.rotation.x = Math.PI / 2;
    link.rotation.z = (i % 2 === 0) ? 0 : Math.PI / 2;
    link.castShadow = true;
    group.add(link);
  }
}

function buildHeroStandIn({ id, accent, cloakColor, metalColor, skinColor, weaponColor }) {
  const root = new THREE.Group();

  const shadow = makeBlobShadow(0.72, 0.32);
  root.add(shadow);

  const feetL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.26), makeStd(0x2a2d35));
  const feetR = feetL.clone();
  feetL.position.set(-0.12, 0.06, 0.03);
  feetR.position.set(0.12, 0.06, -0.02);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.28), makeStd(0x313745));
  legs.position.y = 0.34;
  legs.castShadow = true;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.56, 0.34), makeStd(0x5f6d82));
  torso.position.y = 0.82;
  torso.castShadow = true;

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.92, 8), makeStd(cloakColor, 0.95, 0.0));
  cloak.position.y = 0.68;
  cloak.castShadow = true;

  const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.16), makeStd(accent, 0.7, 0.15));
  const shoulderR = shoulderL.clone();
  shoulderL.position.set(-0.30, 0.98, 0);
  shoulderR.position.set( 0.30, 0.98, 0);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 0), makeStd(skinColor, 0.8, 0.03));
  head.position.y = 1.22;
  head.castShadow = true;

  const hair = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 6), makeStd(0x1d1c22, 0.9, 0.0));
  hair.position.y = 1.33;
  hair.castShadow = true;

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), makeStd(metalColor, 0.75, 0.18));
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), makeStd(metalColor, 0.75, 0.18));
  armL.position.set(-0.38, 0.82, 0.02);
  armR.position.set( 0.38, 0.82, -0.02);
  armL.castShadow = armR.castShadow = true;

  // silhouette weapon per character
  let weapon;
  if (id === "cael") {
    weapon = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.07), makeStd(weaponColor, 0.35, 0.45));
    blade.position.set(0.48, 0.76, 0.12);
    blade.rotation.z = -0.25;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.02, 6, 8, Math.PI * 1.2), makeStd(weaponColor, 0.45, 0.4));
    hook.position.set(0.50, 1.02, 0.12);
    hook.rotation.set(0.2, 0.0, -0.4);
    weapon.add(blade, hook);
  } else if (id === "serah") {
    weapon = new THREE.Group();
    const chainHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6), makeStd(weaponColor, 0.4, 0.38));
    chainHandle.position.set(0.44, 0.88, -0.06);
    chainHandle.rotation.z = 0.3;
    const sickle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 10, Math.PI * 1.1), makeStd(0x8a919f, 0.45, 0.42));
    sickle.position.set(0.55, 1.0, -0.02);
    sickle.rotation.set(0, 0.35, 0.9);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 4), makeStd(0x676d79, 0.7, 0.2));
    chain.position.set(0.50, 0.94, -0.02);
    chain.rotation.z = -0.35;
    weapon.add(chainHandle, chain, sickle);
  } else {
    weapon = new THREE.Group();
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.54, 6), makeStd(weaponColor, 0.45, 0.3));
    wand.position.set(0.42, 0.88, 0.12);
    wand.rotation.z = -0.25;
    const vial = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), makeStd(0x70d3c6, 0.35, 0.05, 0x70d3c6, 0.18));
    vial.position.set(-0.34, 0.72, -0.18);
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.16), makeStd(0x3d2f25, 0.95, 0.0));
    satchel.position.set(-0.30, 0.58, -0.14);
    weapon.add(wand, satchel, vial);
  }

  root.add(feetL, feetR, legs, cloak, torso, shoulderL, shoulderR, armL, armR, head, hair, weapon);
  return root;
}

function buildThicketStalkerStandIn(isBoss = false) {
  const root = new THREE.Group();

  const shadow = makeBlobShadow(isBoss ? 1.75 : 1.35, 0.38);
  shadow.scale.set(1.35, 1.0, 0.9);
  root.add(shadow);

  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(isBoss ? 1.30 : 1.00, 0),
    makeStd(isBoss ? 0x40363a : 0x303741, 0.9, 0.03)
  );
  body.position.y = isBoss ? 1.45 : 1.25;
  body.castShadow = true;
  root.add(body);

  const chestCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(isBoss ? 0.44 : 0.34, 0),
    makeStd(0x22262e, 0.7, 0.0, 0x4de0c0, 0.24)
  );
  chestCore.position.set(0.1, body.position.y - 0.05, 0.35);
  chestCore.castShadow = true;
  root.add(chestCore);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), makeStd(0x9de7da, 0.3, 0.0, 0x4de0c0, 0.7));
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.16, body.position.y + 0.15, 0.80);
  eyeR.position.set( 0.05, body.position.y + 0.12, 0.78);
  root.add(eyeL, eyeR);

  // Legs / thorn limbs
  const limbMat = makeStd(0x262c36, 0.95, 0.02);
  const spikeMat = makeStd(0x1b2026, 0.95, 0.02, 0x7257d6, 0.08);
  const legGeo = new THREE.CylinderGeometry(0.08, 0.05, isBoss ? 1.6 : 1.25, 6);
  const clawGeo = new THREE.ConeGeometry(0.09, 0.42, 6);

  const legOffsets = [
    [-0.75, 0.58], [-0.38, 0.86], [0.35, 0.82], [0.82, 0.46],
    [-0.68,-0.42], [-0.30,-0.86], [0.35,-0.82], [0.88,-0.36]
  ];

  for (let i = 0; i < legOffsets.length; i++) {
    const [lx, lz] = legOffsets[i];
    const leg = new THREE.Mesh(legGeo, limbMat);
    leg.position.set(lx, isBoss ? 0.88 : 0.72, lz);
    leg.rotation.z = lx > 0 ? -0.55 : 0.55;
    leg.rotation.x = zSign(lz) * 0.22;
    leg.castShadow = true;

    const claw = new THREE.Mesh(clawGeo, spikeMat);
    claw.position.set(lx * 1.3, 0.18, lz * 1.15);
    claw.rotation.z = lx > 0 ? -1.1 : 1.1;
    claw.castShadow = true;

    root.add(leg, claw);
  }

  // Back spines
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.12 + i * 0.01, 0.58 + i * 0.08, 5), spikeMat);
    s.position.set(-0.25 + i * 0.18, body.position.y + 0.35 + i * 0.03, -0.05 - i * 0.05);
    s.rotation.z = rand(-0.25, 0.25);
    s.rotation.x = rand(-0.12, 0.12);
    s.castShadow = true;
    root.add(s);
  }

  // Rim shell (fake rim-light feel)
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(isBoss ? 1.35 : 1.04, 0),
    new THREE.MeshBasicMaterial({
      color: isBoss ? 0xa65d6a : 0x6b7fa8,
      transparent: true,
      opacity: 0.10,
      side: THREE.BackSide
    })
  );
  shell.position.copy(body.position);
  root.add(shell);

  root.userData.body = body;
  root.userData.chestCore = chestCore;
  root.userData.shell = shell;
  return root;
}

function zSign(v) { return v >= 0 ? 1 : -1; }

function createBattleRoom() {
  const room = new THREE.Group();

  // Floor disk (sewer chamber)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texStone,
    roughness: 0.95,
    metalness: 0.02
  });

  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.position.y = 0.02;
  room.add(floor);

  // Outer ring tiles / rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(18.0, 0.45, 10, 72),
    makeStd(0x20262f, 0.95, 0.02)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  rim.castShadow = true;
  room.add(rim);

  // Broken wall segments around chamber
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.06, 0.06);
    const height = rand(3.8, 7.4);
    const width = rand(1.6, 2.8);
    const depth = rand(0.6, 1.1);
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: 0x232a34, map: texStone, roughness: 0.98, metalness: 0.0 })
    );
    const r = 17.0;
    seg.position.set(Math.cos(a) * r, height * 0.5, Math.sin(a) * r);
    seg.rotation.y = -a + Math.PI / 2 + rand(-0.12, 0.12);
    seg.rotation.z = rand(-0.03, 0.03);
    seg.castShadow = true;
    seg.receiveShadow = true;
    room.add(seg);
  }

  // Damp patches / puddles
  for (let i = 0; i < 10; i++) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.6, 2.0), 18),
      new THREE.MeshBasicMaterial({
        color: 0x3a5570,
        transparent: true,
        opacity: rand(0.05, 0.12),
        depthWrite: false
      })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(rand(-12, 12), 0.035, rand(-8, 8));
    room.add(patch);
    battleviz.haze.push(patch);
  }

  // Pipes (readable set pieces)
  for (let i = 0; i < 6; i++) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, rand(5, 9), 10, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: texMetal, roughness: 0.85, metalness: 0.28 })
    );
    const a = (i / 6) * Math.PI * 2 + 0.22;
    const r = 13.4;
    pipe.position.set(Math.cos(a) * r, 2.4, Math.sin(a) * r);
    pipe.rotation.z = rand(-0.18, 0.18);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    room.add(pipe);
  }

  // Grates embedded in floor
  for (let i = 0; i < 3; i++) {
    const grate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texGrate,
        roughness: 0.9,
        metalness: 0.35,
        transparent: false
      })
    );
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(-5 + i * 4.2, 0.04, rand(-6, 6));
    room.add(grate);
  }

  // Hanging chains
  addChain(room, -6.8, -11.5, 5.8);
  addChain(room,  4.2, -13.2, 6.2);
  addChain(room, 11.5, -8.8, 5.4);

  // Reinforced door silhouette (back wall)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -15.4);

  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 6.2, 0.55),
    makeStd(0x2d3139, 0.92, 0.08)
  );
  doorFrame.position.y = 3.1;
  doorFrame.castShadow = true;
  doorGroup.add(doorFrame);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 5.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: texMetal, roughness: 0.86, metalness: 0.22 })
  );
  doorPanel.position.set(0, 2.75, 0.18);
  doorPanel.castShadow = true;
  doorGroup.add(doorPanel);

  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.7, 0.12), makeStd(0x4a4f59, 0.85, 0.18));
    bar.position.set(-1.5 + i * 0.75, 2.8, 0.38);
    bar.castShadow = true;
    doorGroup.add(bar);
  }
  room.add(doorGroup);

  // Thread-scar centerpiece
  const threadScar = new THREE.Group();

  const scarLightMatC = makeStd(0x0a0b0d, 0.95, 0.0, 0x4de0c0, 0.22);
  const scarLightMatV = makeStd(0x0a0b0d, 0.95, 0.0, 0x7257d6, 0.18);

  function addScarBranch(points, radius = 0.08, alt = false) {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, radius, 6, false),
      alt ? scarLightMatV : scarLightMatC
    );
    tube.castShadow = true;
    tube.position.y = 0.04;
    threadScar.add(tube);

    // glow ribbon line
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: alt ? 0x7257d6 : 0x4de0c0,
        transparent: true,
        opacity: alt ? 0.22 : 0.28
      })
    );
    line.position.y = 0.065;
    threadScar.add(line);
  }

  addScarBranch([
    new THREE.Vector3(-4.8, 0, -1.4),
    new THREE.Vector3(-2.4, 0, -0.6),
    new THREE.Vector3(-0.2, 0, 0.2),
    new THREE.Vector3(1.7, 0, 0.7),
    new THREE.Vector3(4.5, 0, 1.6)
  ], 0.10, false);

  addScarBranch([
    new THREE.Vector3(-1.6, 0, -2.6),
    new THREE.Vector3(-0.6, 0, -1.2),
    new THREE.Vector3(0.4, 0, 0.4),
    new THREE.Vector3(1.2, 0, 2.4)
  ], 0.07, true);

  addScarBranch([
    new THREE.Vector3(-0.9, 0, 0.0),
    new THREE.Vector3(-2.2, 0, 1.1),
    new THREE.Vector3(-3.6, 0, 2.5)
  ], 0.06, false);

  addScarBranch([
    new THREE.Vector3(0.7, 0, 0.2),
    new THREE.Vector3(2.0, 0, -0.9),
    new THREE.Vector3(3.8, 0, -2.5)
  ], 0.06, true);

  for (let i = 0; i < 8; i++) {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.4, 1.2), 18),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x7257d6 : 0x4de0c0,
        transparent: true,
        opacity: rand(0.05, 0.12),
        depthWrite: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(rand(-4.2, 4.2), 0.03, rand(-2.8, 2.8));
    threadScar.add(glow);
  }

  room.add(threadScar);

  // Ambient haze planes (subtle)
  for (let i = 0; i < 3; i++) {
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshBasicMaterial({
        color: 0x5c79a1,
        transparent: true,
        opacity: 0.03,
        depthWrite: false
      })
    );
    haze.position.set(rand(-3, 3), 2.4 + i * 0.5, -3 + i * 3);
    haze.lookAt(0, 2.5, 14);
    room.add(haze);
    battleviz.haze.push(haze);
  }

  battleviz.threadScarGroup = threadScar;
  battleviz.floor = floor;
  return room;
}

function buildBattleScene() {
  battleGroup.clear();
  battleviz.partyActors = [];
  battleviz.enemyActor = null;
  battleviz.haze = [];
  battleviz.threadScarGroup = null;

  battleviz.room = createBattleRoom();
  battleGroup.add(battleviz.room);

  // Party positions (left)
  const partyPositions = [
    new THREE.Vector3(-7.1, 0, -2.8), // Cael
    new THREE.Vector3(-8.0, 0,  0.2), // Serah
    new THREE.Vector3(-7.0, 0,  3.0)  // Iri
  ];

  const heroDefs = [
    { id:"cael",  accent:0x6b7fa8, cloakColor:0x20252d, metalColor:0x596579, skinColor:0xb9c3cf, weaponColor:0x7b8798 },
    { id:"serah", accent:0x8b5955, cloakColor:0x261d22, metalColor:0x5f616e, skinColor:0xb7b7c0, weaponColor:0x7b818f },
    { id:"iri",   accent:0x6fc8be, cloakColor:0x242b31, metalColor:0x657588, skinColor:0xc1c9d4, weaponColor:0x7aa8b1 }
  ];

  for (let i = 0; i < heroDefs.length; i++) {
    const heroRoot = buildHeroStandIn(heroDefs[i]);
    heroRoot.position.copy(partyPositions[i]);
    heroRoot.rotation.y = -0.18; // face right-ish toward enemy
    battleGroup.add(heroRoot);

    battleviz.partyActors.push(
      makeActorVisual(heroRoot, partyPositions[i], {
        bobPhase: rand(0, Math.PI * 2),
        bobAmp: 0.05 + i * 0.005,
        bobSpeed: 1.7 + i * 0.15,
        bobY: 0.0
      })
    );
  }

  // Enemy placeholder stand-in (Thicket Stalker feel)
  const enemyRoot = buildThicketStalkerStandIn(false);
  const enemyPos = new THREE.Vector3(7.6, 0, 0.2);
  enemyRoot.position.copy(enemyPos);
  enemyRoot.rotation.y = Math.PI + 0.25;
  battleGroup.add(enemyRoot);

  battleviz.enemyActor = makeActorVisual(enemyRoot, enemyPos, {
    bobPhase: rand(0, Math.PI * 2),
    bobAmp: 0.09,
    bobSpeed: 1.25,
    bobY: 0.05
  });

  // Enemy rim/key light
  const enemyRim = new THREE.PointLight(0x7c92c7, 0.45, 18, 2.0);
  enemyRim.position.set(10, 3.2, -2.0);
  battleGroup.add(enemyRim);
  battleviz.enemyActor.rimLight = enemyRim;

  // Battle-only glow lights (off until battle)
  threadGlowCyan.intensity = 0.6;
  threadGlowViolet.intensity = 0.42;
}
buildBattleScene();

// ---------------------------------------------
// Camera helpers (world + battle)
// ---------------------------------------------
const battleCam = {
  basePos: new THREE.Vector3(0, 9.9, 16.1),
  baseTarget: new THREE.Vector3(0, 1.35, 0),
  driftT: 0,
  shakeT: 0,
  shakeDur: 0.12,
  shakeMag: 0.0,
  shakeOffset: new THREE.Vector3()
};

function addBattleShake(mag = 0.14, dur = 0.12) {
  battleCam.shakeMag = Math.max(battleCam.shakeMag, mag);
  battleCam.shakeDur = Math.max(0.05, dur);
  battleCam.shakeT = battleCam.shakeDur;
}

function updateBattleCamera(dt, timeSec) {
  battleCam.driftT += dt;

  const drift = new THREE.Vector3(
    Math.sin(timeSec * 0.35) * 0.18,
    Math.sin(timeSec * 0.52 + 0.8) * 0.08,
    Math.cos(timeSec * 0.30 + 0.4) * 0.14
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
  const target = battleCam.baseTarget.clone().add(new THREE.Vector3(
    Math.sin(timeSec * 0.22) * 0.12,
    Math.sin(timeSec * 0.34 + 1.2) * 0.05,
    0
  ));

  camera.position.lerp(pos, 1 - Math.pow(0.0005, dt));
  camera.lookAt(target);
}

// ---------------------------------------------
// Input
// ---------------------------------------------
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

// ---------------------------------------------
// Party UI rendering
// ---------------------------------------------
function renderPartyPanel() {
  ui.partyPanel.innerHTML = `<div class="panel-edge"></div><div class="sectionTitle" style="margin-bottom:8px;">Party</div>`;

  for (const m of Party) {
    const dead = m.hp <= 0;
    const dreadReady = m.dread >= 100;
    const statusText = dead ? "Down" : (dreadReady ? "Dread Art READY" : "—");
    const statusClass = dead ? "" : (dreadReady ? "ready" : "");

    ui.partyPanel.innerHTML += `
      <div class="member ${dead ? "dead":""}">
        <div>
          <div class="mname">${m.name}</div>
          <div class="statusSub ${statusClass}">${statusText}</div>
        </div>
        <div class="mstats">
          <span>HP <b>${m.hp}</b>/${m.hpMax}</span>
          <span>Dread <b>${Math.floor(m.dread)}</b>/100</span>
        </div>
      </div>
    `;
  }
}

// ---------------------------------------------
// Floating damage numbers (DOM)
// ---------------------------------------------
const dmgNums = []; // {el,pos,velY,t,life,driftX,driftZ,crit,heal,popT}

function spawnDmg(text, worldPos, crit = false, heal = false) {
  const el = document.createElement("div");
  el.className = `dmg${crit ? " crit" : ""}${heal ? " heal" : ""}`;
  el.textContent = text;
  el.style.fontSize = crit ? "30px" : (heal ? "24px" : "22px");
  el.style.color = heal ? "#7dffb2" : (crit ? "#ffd24a" : "#eef3ff");
  el.style.opacity = "1";
  document.body.appendChild(el);

  dmgNums.push({
    el,
    pos: worldPos.clone(),
    velY: heal ? 0.85 : (crit ? 1.05 : 0.92),
    t: 0,
    life: heal ? 1.00 : (crit ? 1.05 : 0.92),
    driftX: rand(-0.18, 0.18),
    driftZ: rand(-0.14, 0.14),
    popT: 0.11
  });
}

function updateDmgNums(dt) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const n = dmgNums[i];
    n.t += dt;

    const a = 1.0 - (n.t / n.life);
    if (a <= 0) {
      n.el.remove();
      dmgNums.splice(i, 1);
      continue;
    }

    // "Gamey" movement: short hang then float
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

    // pop scale then settle
    const pop = n.popT > 0 ? (1.0 + (n.popT / 0.11) * 0.35) : 1.0;
    n.popT = Math.max(0, n.popT - dt);

    n.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop.toFixed(3)})`;
    n.el.style.opacity = String(a);
  }
}

// ---------------------------------------------
// Collision helpers
// ---------------------------------------------
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

// ---------------------------------------------
// Battle animation helpers (visual-only, non-destructive)
// ---------------------------------------------
function actorWorldHitPosParty(idx) {
  const a = battleviz.partyActors[idx];
  if (!a) return new THREE.Vector3();
  return a.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.15, 0));
}
function actorWorldHitPosEnemy() {
  if (!battleviz.enemyActor) return new THREE.Vector3();
  return battleviz.enemyActor.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.8, 0));
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
  markAttackLunge(attacker, target.basePos, strong ? 0.78 : 0.62, strong ? 0.23 : 0.20);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.18 : 0.12);
    addBattleShake(strong ? 0.18 : 0.12, strong ? 0.15 : 0.11);
  }, strong ? 120 : 95);
}

function playEnemyStrikeFX(targetIdx, strong = false) {
  const attacker = battleviz.enemyActor;
  const target = battleviz.partyActors[targetIdx];
  if (!attacker || !target) return;
  markAttackLunge(attacker, target.basePos, strong ? 0.95 : 0.72, strong ? 0.25 : 0.21);
  setTimeout(() => {
    markHitReaction(target, strong ? 0.16 : 0.11);
    addBattleShake(strong ? 0.20 : 0.14, strong ? 0.14 : 0.10);
  }, strong ? 120 : 100);
}

function updateActorVisuals(dt, nowSec) {
  // Party actors
  for (let i = 0; i < battleviz.partyActors.length; i++) {
    const a = battleviz.partyActors[i];
    if (!a) continue;

    let offset = new THREE.Vector3();
    const bob = Math.sin(nowSec * a.bobSpeed + a.bobPhase) * a.bobAmp;
    offset.y += a.bobY + bob;

    // attack lunge
    if (a.attackT > 0) {
      a.attackT = Math.max(0, a.attackT - dt);
      const p = 1 - (a.attackT / a.attackDur);
      const arc = Math.sin(p * Math.PI);
      offset.addScaledVector(a.attackDir, arc * a.attackAmp);
      offset.y += arc * 0.06;
    }

    // hit shake
    if (a.hitT > 0) {
      a.hitT = Math.max(0, a.hitT - dt);
      const k = a.hitT / a.hitDur;
      offset.x += rand(-1, 1) * a.hitShake * k;
      offset.z += rand(-1, 1) * a.hitShake * 0.6 * k;
      offset.y += Math.sin((1 - k) * Math.PI) * 0.06 * k;
    }

    a.root.position.copy(a.basePos).add(offset);

    // flash
    if (a.flashT > 0) {
      a.flashT = Math.max(0, a.flashT - dt);
    }
    const flashK = a.flashT > 0 ? (a.flashT / a.flashDur) : 0;
    for (const m of a.mats) {
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = (m.userData.baseEmissiveIntensity || 0) + flashK * 0.35;
      }
    }

    // keep facing enemy-ish in battle
    a.root.rotation.y = -0.18 + Math.sin(nowSec * 0.5 + i) * 0.01;
  }

  // Enemy actor
  const e = battleviz.enemyActor;
  if (e) {
    let offset = new THREE.Vector3();
    const bob = Math.sin(nowSec * e.bobSpeed + e.bobPhase) * e.bobAmp;
    offset.y += e.bobY + bob;

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
      offset.y += Math.sin((1 - k) * Math.PI) * 0.09 * k;
    }

    e.root.position.copy(e.basePos).add(offset);
    e.root.rotation.y = Math.PI + 0.25 + Math.sin(nowSec * 0.45) * 0.02;

    if (e.flashT > 0) {
      e.flashT = Math.max(0, e.flashT - dt);
    }
    const flashK = e.flashT > 0 ? (e.flashT / e.flashDur) : 0;
    for (const m of e.mats) {
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = (m.userData.baseEmissiveIntensity || 0) + flashK * 0.55;
      }
    }

    // pulse enemy chest core
    if (e.root.userData.chestCore?.material) {
      e.root.userData.chestCore.material.emissiveIntensity = 0.16 + Math.sin(nowSec * 2.2) * 0.05 + flashK * 0.18;
    }
    if (e.rimLight) {
      e.rimLight.intensity = 0.34 + Math.sin(nowSec * 1.4) * 0.07 + flashK * 0.18;
      e.rimLight.position.copy(e.root.position).add(new THREE.Vector3(2.4, 2.3, -1.5));
    }
  }

  // Room haze / thread glow pulse
  if (battleviz.threadScarGroup) {
    const pulse = 0.8 + Math.sin(nowSec * 1.3) * 0.12 + Math.sin(nowSec * 2.6 + 1.2) * 0.05;
    threadGlowCyan.intensity = mode === Mode.BATTLE ? (0.45 * pulse) : 0.0;
    threadGlowViolet.intensity = mode === Mode.BATTLE ? (0.33 * pulse) : 0.0;
  }

  for (let i = 0; i < battleviz.haze.length; i++) {
    const h = battleviz.haze[i];
    h.material.opacity = h.material.opacity ?? 0.05;
    h.position.y += Math.sin(nowSec * (0.18 + i * 0.03) + i) * 0.0008;
  }
}

// ---------------------------------------------
// Battle mechanics (unchanged core rules/flow, visual FX added)
// ---------------------------------------------
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

function rollCrit() { return Math.random() < 0.10; }

function calcDamage(atk, def, mult = 1.0) {
  const base = Math.max(1, Math.floor((atk - def) * mult + rand(-2, 2)));
  return base;
}

function configureEnemyVisualForEncounter(e) {
  if (!battleviz.enemyActor) return;
  const enemyRoot = battleviz.enemyActor.root;

  // Swap to boss-ish visual treatment without changing battle logic
  const isBoss = !!e.boss;

  // If boss: rebuild stand-in a bit larger
  if (isBoss || e.id === "thicket_stalker") {
    const pos = battleviz.enemyActor.basePos.clone();
    const rotY = enemyRoot.rotation.y;
    battleGroup.remove(enemyRoot);

    const rebuilt = buildThicketStalkerStandIn(isBoss);
    rebuilt.position.copy(pos);
    rebuilt.rotation.y = rotY;
    battleGroup.add(rebuilt);

    battleviz.enemyActor = makeActorVisual(rebuilt, pos, {
      bobPhase: rand(0, Math.PI * 2),
      bobAmp: isBoss ? 0.12 : 0.09,
      bobSpeed: isBoss ? 0.95 : 1.25,
      bobY: isBoss ? 0.10 : 0.05
    });

    const enemyRim = new THREE.PointLight(isBoss ? 0xc46a7b : 0x7c92c7, isBoss ? 0.52 : 0.45, isBoss ? 22 : 18, 2.0);
    battleGroup.add(enemyRim);
    battleviz.enemyActor.rimLight = enemyRim;
  }

  // Per-enemy tint accents (same logic, just visual flavor)
  const body = battleviz.enemyActor.root.userData.body;
  const chest = battleviz.enemyActor.root.userData.chestCore;
  if (body?.material && chest?.material) {
    if (e.boss) {
      body.material.color.setHex(0x47373b);
      chest.material.emissive.setHex(0xc26b82);
      chest.material.emissiveIntensity = 0.25;
      battleviz.enemyActor.basePos.set(7.2, 0, 0.2);
      battleviz.enemyActor.root.position.copy(battleviz.enemyActor.basePos);
    } else if (e.id === "thicket_stalker") {
      body.material.color.setHex(0x313943);
      chest.material.emissive.setHex(0x4de0c0);
      battleviz.enemyActor.basePos.set(7.6, 0, 0.2);
    } else if (e.id === "knot_wisp") {
      body.material.color.setHex(0x2f3341);
      chest.material.emissive.setHex(0x7257d6);
      battleviz.enemyActor.basePos.set(7.9, 0, 0.2);
    } else if (e.id === "lantern_thief") {
      body.material.color.setHex(0x3a3530);
      chest.material.emissive.setHex(0xd6a84d);
      battleviz.enemyActor.basePos.set(7.8, 0, 0.1);
    } else {
      body.material.color.setHex(0x2e3641);
      chest.material.emissive.setHex(0x63d4c5);
      battleviz.enemyActor.basePos.set(8.0, 0, 0.1);
    }
  }
}

function startBattle(enemyId) {
  // Save return
  worldReturn.pos.copy(player.pos);
  worldReturn.yaw = player.yaw;

  // Setup enemy
  enemy = { ...EnemyDB[enemyId] };

  // Show / hide groups
  mode = Mode.BATTLE;
  ui.mode.textContent = "BATTLE";
  worldGroup.visible = false;
  battleGroup.visible = true;
  ui.battleUI.style.display = "flex";

  // Camera snaps to battle framing (then drift update takes over)
  camera.position.copy(battleCam.basePos);
  camera.lookAt(battleCam.baseTarget);

  // Hide world player
  player.obj.visible = false;

  configureEnemyVisualForEncounter(enemy);

  // Battle init
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

  // restore player / camera
  player.obj.visible = true;
  player.pos.copy(worldReturn.pos);
  player.yaw = worldReturn.yaw;
  player.obj.position.copy(player.pos);

  encounterCooldown = 2.2;
  renderPartyPanel();

  // result overlay
  ui.overlay.style.display = "grid";
  ui.overlayTitle.textContent = victory ? "Victory" : "Defeat";
  ui.overlayText.textContent = victory
    ? "You survive the clash. The road opens again."
    : "You fall back. You regroup at the last safe footing.";
  ui.startBtn.textContent = "Continue";
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

function advanceTurnToNextLiving() {
  const living = alivePartyIndices();
  battle.aliveOrder = living;
  if (living.length === 0) return;
  battle.actorIndex = (battle.actorIndex + 1) % living.length;
}

function playerAttack(idx, mult = 1.0) {
  if (!enemy) return;
  const actor = Party[idx];

  // Visual attack FX
  playPartyStrikeFX(idx, mult > 1.4);

  const crit = rollCrit();
  let dmg = calcDamage(actor.atk, enemy.def, mult);
  if (crit) dmg = Math.floor(dmg * 1.9);

  enemy.hp -= dmg;

  // dread gain (prototype formula)
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

    // Visual: modest support gesture + glow pulse + no lunge
    const healerVis = battleviz.partyActors[idx];
    if (healerVis) {
      healerVis.flashT = healerVis.flashDur;
      addBattleShake(0.06, 0.06);
    }

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

  // Damage skill
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

  // Extra enemy flash for Dread Art
  if (battleviz.enemyActor) {
    battleviz.enemyActor.flashT = battleviz.enemyActor.flashDur * 1.4;
  }

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

  // Visual attack FX first (same timing window as damage)
  playEnemyStrikeFX(targetIdx, !!enemy.boss);

  const crit = rollCrit() && !enemy.boss ? true : (Math.random() < 0.06);
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

// ---------------------------------------------
// World loop: movement, camera follow, zone triggers
// ---------------------------------------------
function cameraFollow(dt) {
  // world camera yaw controlled by Q/E
  const rotSpeed = 1.8;
  if (keys.q) player.yaw += rotSpeed * dt;
  if (keys.e) player.yaw -= rotSpeed * dt;

  const dist = 9.0;
  const height = 5.2;

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
  player.obj.position.copy(player.pos);

  if (moving) {
    // Keep world silhouette readable (slight body sway)
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

// ---------------------------------------------
// Reset / start
// ---------------------------------------------
function resetParty() {
  Party[0].hp = Party[0].hpMax; Party[0].dread = 0;
  Party[1].hp = Party[1].hpMax; Party[1].dread = 0;
  Party[2].hp = Party[2].hpMax; Party[2].dread = 0;
}

function clearDmgNums() {
  while (dmgNums.length) {
    const n = dmgNums.pop();
    n.el.remove();
  }
}

function resetRun() {
  clearDmgNums();

  bossCleared = false;
  encounterCooldown = 0;
  enemy = null;
  battle.active = false;
  battle.phase = "idle";

  resetParty();
  renderPartyPanel();

  for (const z of zones) {
    if (z.kind === "boss") {
      z.enabled = true;
      z.ring.material.opacity = 0.22;
      z.ring.material.color.setHex(0xb64a4a);
    } else {
      z.enabled = true;
      z.ring.material.opacity = 0.18;
      z.ring.material.color.setHex(0x6bd5a1);
    }
  }

  mode = Mode.WORLD;
  ui.mode.textContent = "WORLD";
  worldGroup.visible = true;
  battleGroup.visible = false;
  ui.battleUI.style.display = "none";

  player.pos.set(0, 0, 0);
  player.yaw = 0;
  player.obj.position.copy(player.pos);
  player.obj.visible = true;

  camera.position.set(0, 6, 10);
  camera.lookAt(0, 1.2, 0);

  ui.overlay.style.display = "none";
  ui.startBtn.textContent = "Start Prototype";
  ui.overlayTitle.textContent = "Veilborn Oath — Three.js Prototype";
  ui.overlayText.textContent = "Fresh browser prototype. Placeholder geometry, real loop.";

  ui.log.innerHTML = "";
}

ui.startBtn.addEventListener("click", () => {
  ui.overlay.style.display = "none";
});
ui.resetBtn.addEventListener("click", () => resetRun());

// ---------------------------------------------
// Main loop
// ---------------------------------------------
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

  // Zone pulse visuals
  for (const z of zones) {
    z.pulse += dt * (z.kind === "boss" ? 1.7 : 1.4);
    const pulse = 0.5 + 0.5 * Math.sin(z.pulse);
    if (z.enabled) {
      z.ring.material.opacity = (z.kind === "boss" ? 0.17 : 0.13) + pulse * (z.kind === "boss" ? 0.08 : 0.06);
      z.beaconGlow.position.y = 2.15 + Math.sin(z.pulse * 1.6) * 0.10;
      if (z.beaconGlow.material?.emissiveIntensity != null) {
        z.beaconGlow.material.emissiveIntensity = 0.38 + pulse * 0.35;
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
      if (bz.beaconGlow.material?.emissiveIntensity != null) {
        bz.beaconGlow.material.emissiveIntensity = 0.06;
      }
    }
  }

  if (mode === Mode.WORLD) {
    // world ambience
    scene.fog.color.setHex(0x06080c);
    scene.fog.near = 28;
    scene.fog.far = 120;

    worldMove(dt);
    cameraFollow(dt);
    checkZones();
  } else {
    // battle ambience
    scene.fog.color.setHex(0x07090f);
    scene.fog.near = 14;
    scene.fog.far = 58;

    updateBattleCamera(dt, t);
    updateActorVisuals(dt, t);
  }

  // keep battle visuals idling when hidden? no need, but harmless
  if (mode !== Mode.BATTLE) {
    // tiny world zone glow only
    threadGlowCyan.intensity = 0;
    threadGlowViolet.intensity = 0;
  }

  updateDmgNums(dt);

  composer.render();
}

// ---------------------------------------------
// Resize
// ---------------------------------------------
addEventListener("resize", () => {
  setRetroResolution();
});

// ---------------------------------------------
// Boot
// ---------------------------------------------
renderPartyPanel();
renderActionUI();
setRetroResolution();

// Keep overlay up until Start
tick();
resetRun();

// expose for console
window.resetRun = resetRun;
