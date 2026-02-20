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
      ctx.fillStyle = `rgba(210,220
