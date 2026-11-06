"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getUI, world } from "./store";
import { cubesatFrom, cubesatShape, droneShape, flagShape, flagWheelFrom, globeShape, gridTextShape, matchFormations, rocketShape, ropewayShape, singaporeShape, singaporeTextCount, starShape, trophyShape } from "./shapes";
import { sfx } from "./audio";

const N = 1400;

/** The gala programme: each formation holds for one step while its caption shows. */
export const GALA_STEPS: { key: string; caption: string; sub: string; color: string }[] = [
  { key: "hp", caption: "Harsh Pandhe", sub: "Welcome to the gala on Mission Island", color: "#00d2ff" },
  { key: "trophy", caption: "SIH 2025 · National Winner", sub: "10,000+ teams · Team Algo Sapiens · Telhan Sathi", color: "#ffd23f" },
  { key: "drone", caption: "ISRO IRoC-U 2026 · Finalist", sub: "A drone that flies without GPS", color: "#ff7a45" },
  { key: "cubesat", caption: "CubeSat 1U", sub: "Systems, flight software, electronics and a ground segment", color: "#9fdcff" },
  { key: "swarm", caption: "MARS · multi-robot swarms", sub: "Six papers on SSRN, written up honestly", color: "#12f0c0" },
  { key: "star", caption: "Taramandal", sub: "His drone-show studio and ground control: formations like these", color: "#ffd23f" },
  { key: "ropeway", caption: "Ropeways at Doppelmayr", sub: "Two coordinates in, an alignment out", color: "#ff5a6e" },
  { key: "chart", caption: "AlgoTrade", sub: "The strategy that survived ten attempts to kill it", color: "#7dff8a" },
  { key: "flag", caption: "Built in India", sub: "From Solapur and Lonavala to the world", color: "#ff9933" },
  { key: "singapore", caption: "Next stop: Singapore", sub: "Singapore–India Hackathon Grand Finale · 15–17 Nov 2026", color: "#00d2ff" },
  { key: "hp", caption: "Thank you for visiting", sub: "Say hello: harshpandhehome@gmail.com", color: "#ffffff" },
];

export const GALA_POS = new THREE.Vector3(-8, 30, 158);
// The nightly show hangs at a fixed spot over the sea to the north, like a real show over a bay.
// The overview camera turns to face it at night (Actors.tsx); the show itself never moves.
// above the launch deck on the north shore (LaunchDeck): drones take off from land, not the sea
const DECK_DEG = -72,
  DECK_R = 111;
export const DECK = { x: Math.cos((DECK_DEG * Math.PI) / 180) * DECK_R, z: Math.sin((DECK_DEG * Math.PI) / 180) * DECK_R, top: 1.1, w: 46, d: 24 };
export const AMBIENT_POS = new THREE.Vector3(DECK.x, 44, DECK.z);
export const GALA_CAM = { pos: [-4, 16, 84] as [number, number, number], look: [-8, 17, 158] as [number, number, number] };

// the nightly story, in order: launch, the work, Singapore, sign-off, land
const AMBIENT: { key: string; hold: number; pal: string[] }[] = [
  { key: "grid", hold: 5, pal: ["#fff3d6"] },
  { key: "drone", hold: 8, pal: ["#ff7a45", "#ffd2b0"] },
  { key: "trophy", hold: 8, pal: ["#ffb300", "#ffd23f"] },
  { key: "rocket", hold: 8, pal: ["#ffffff", "#ff8a3d"] },
  { key: "swarm", hold: 9, pal: ["#12f0c0", "#2d5bff", "#ffd23f", "#ff7ac6", "#9b7bff", "#ff8a3d"] },
  { key: "star", hold: 8, pal: ["#ffd23f", "#fff3d6"] },
  { key: "cubesat", hold: 9, pal: ["#2d8bff", "#12f0c0"] },
  { key: "ropeway", hold: 8, pal: ["#ff5a6e", "#ffffff"] },
  { key: "chart", hold: 8, pal: ["#7dff8a", "#12f0c0"] },
  { key: "flag", hold: 9, pal: ["#ff9933"] },
  { key: "globe", hold: 9, pal: ["#00d2ff", "#ff3b5c"] },
  { key: "hp", hold: 8, pal: ["#00d2ff", "#ffffff"] },
];

/* Fixed colours for formations that are a picture, not a palette sweep. */
const SAFFRON = new THREE.Color("#ff8a2b"),
  WHITE = new THREE.Color("#ffffff"),
  GREEN = new THREE.Color("#19c95c"),
  NAVY = new THREE.Color("#4a63ff"),
  OCEAN = new THREE.Color("#2d8bff"),
  LAND = new THREE.Color("#3ddc84"),
  GOLD = new THREE.Color("#ffd23f"),
  SG_RED = new THREE.Color("#ff3346");
const FLAG_H = 6; // flagShape(width 9) is 6 tall

/** Drones parked in rows on the launch deck (local units: the holder is scaled 6x, 44 m up). */
function gridShape(n: number) {
  const out = new Float32Array(n * 3);
  const cols = Math.ceil(Math.sqrt(n * 2)),
    rows = Math.ceil(n / cols);
  const y = (DECK.top + 0.15 - AMBIENT_POS.y) / 6;
  // rows follow the deck, which is turned to face out to sea
  const yaw = Math.atan2(DECK.x, DECK.z),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (let i = 0; i < n; i++) {
    const lx = ((i % cols) / (cols - 1) - 0.5) * ((DECK.w - 4) / 6),
      lz = (Math.floor(i / cols) / (rows - 1) - 0.5) * ((DECK.d - 4) / 6);
    out[i * 3] = lx * c + lz * s;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = -lx * s + lz * c;
  }
  return out;
}

/** The concrete launch deck on stilts off the north shore, with a walkway back to the beach. */
export function LaunchDeck() {
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffd23f", emissive: "#ffd23f", emissiveIntensity: 0.3 }), []);
  useFrame(() => (lamp.emissiveIntensity = 0.3 + world.night * 2.5));
  const yaw = Math.atan2(DECK.x, DECK.z);
  return (
    <group position={[DECK.x, 0, DECK.z]} rotation-y={yaw}>
      <mesh position={[0, DECK.top - 0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[DECK.w, 0.6, DECK.d]} />
        <meshStandardMaterial color="#b9bec6" roughness={0.9} />
      </mesh>
      {/* hazard edge and corner beacons */}
      <mesh position={[0, DECK.top + 0.01, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[DECK.d / 2 - 0.6, DECK.d / 2 - 0.3, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color="#ffd23f" />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (DECK.w / 2 - 0.6), 0, sz * (DECK.d / 2 - 0.6)]}>
            <mesh position={[0, DECK.top + 0.5, 0]} material={lamp}>
              <cylinderGeometry args={[0.18, 0.18, 1, 10]} />
            </mesh>
            <mesh position={[0, -1.2, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 4, 10]} />
              <meshStandardMaterial color="#8f949b" />
            </mesh>
          </group>
        ))
      )}
      {/* walkway to the shore */}
      <mesh position={[0, DECK.top - 0.35, -(DECK.d / 2 + 6)]} receiveShadow>
        <boxGeometry args={[3, 0.3, 12]} />
        <meshStandardMaterial color="#9c6b43" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Six tight clusters on a ring: they orbit in the frame loop. */
function swarmShape(n: number) {
  const out = new Float32Array(n * 3);
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const k = i % 6;
    const a = (k / 6) * Math.PI * 2;
    const u = r() * Math.PI * 2,
      v = Math.acos(2 * r() - 1),
      rr = 0.55 * Math.cbrt(r());
    out[i * 3] = Math.cos(a) * 3 + Math.sin(v) * Math.cos(u) * rr;
    out[i * 3 + 1] = Math.sin(a) * 3 + Math.cos(v) * rr;
    out[i * 3 + 2] = Math.sin(v) * Math.sin(u) * rr;
  }
  return out;
}

/** A rising equity line with an arrowhead over a row of candles. */
function risingChart(n: number) {
  const out = new Float32Array(n * 3);
  const P: [number, number][] = [[-5, -2.2], [-3.6, -1.2], [-2.6, -1.7], [-1.2, -0.2], [0, -0.8], [1.4, 0.9], [2.4, 0.4], [4.2, 2.6]];
  const seg = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
  const L = seg.reduce((a, b) => a + b, 0);
  let s = 5;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const nl = Math.floor(n * 0.5),
    na = Math.floor(n * 0.12);
  for (let i = 0; i < n; i++) {
    let x = 0,
      y = 0;
    if (i < nl) {
      let d = (i / nl) * L,
        k = 0;
      while (k < seg.length - 1 && d > seg[k]) d -= seg[k++];
      const u = d / seg[k];
      x = P[k][0] + (P[k + 1][0] - P[k][0]) * u;
      y = P[k][1] + (P[k + 1][1] - P[k][1]) * u;
    } else if (i < nl + na) {
      // arrowhead at the last point
      const u = r();
      if (r() < 0.5) (x = 4.2 - u * 0.35), (y = 2.6 - u * 1.0);
      else (x = 4.2 - u * 1.0), (y = 2.6 - u * 0.2);
    } else {
      // candles: alternating bodies along the bottom, taller to the right
      const c = Math.floor(r() * 10),
        cx = -4.6 + c * 1.0,
        h = 0.5 + c * 0.12 + (c % 3 === 1 ? -0.2 : 0);
      x = cx + (r() - 0.5) * 0.3;
      y = -3.4 + r() * h;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (r() - 0.5) * 0.2;
  }
  return out;
}

/** An LED drone seen at night: a hot white-ish core and a soft coloured halo, sized by distance. */
function ledMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uSize: { value: 2.4 }, uScale: { value: 500 }, uOpacity: { value: 0 } },
    vertexShader: `uniform float uSize; uniform float uScale; varying vec3 vC;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(uSize * uScale / -mv.z, 1.5); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vC;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
        float core = smoothstep(0.34, 0.0, r); float halo = exp(-r * r * 5.0) * 0.5;
        vec3 c = vC * (core * 1.5 + halo) + vec3(core * 0.45);
        gl_FragColor = vec4(c * uOpacity, 1.0); }`,
  });
}

export function LightShow() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const holder = useRef<THREE.Points>(null);
  const mat = useMemo(ledMaterial, []);
  const shapes = useRef<Record<string, Float32Array> | null>(null);
  const pos = useMemo(() => new Float32Array(N * 3), []);
  const cols = useMemo(() => new Float32Array(N * 3), []);
  const from = useRef<Float32Array>(new Float32Array(N * 3));
  const fromCol = useRef<Float32Array>(new Float32Array(N * 3));
  const to = useRef<Float32Array>(new Float32Array(N * 3));
  // drone j flies to target point perm[j]; matched along a Hilbert curve so paths don't cross
  const perm = useRef<Int32Array>(Int32Array.from({ length: N }, (_, i) => i));
  const toPal = useRef<THREE.Color[]>([new THREE.Color("#fff3d6")]);
  const tStart = useRef(0);
  const galaStart = useRef(-1);
  const lastKey = useRef("");
  const prevKey = useRef("");
  const cycle = useRef({ i: 0, until: 0 });
  const cb = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const build = () => {
      shapes.current = {
        grid: gridShape(N),
        hp: gridTextShape(N, ["HARSH", "PANDHE"], 10),
        trophy: trophyShape(N),
        drone: droneShape(N),
        rocket: rocketShape(N),
        swarm: swarmShape(N),
        ropeway: ropewayShape(N),
        chart: risingChart(N),
        globe: globeShape(N, 2.6),
        star: starShape(N),
        cubesat: cubesatShape(N),
        flag: flagShape(N),
        singapore: singaporeShape(N),
      };
      from.current.set(shapes.current.grid);
      to.current.set(shapes.current.grid);
      pos.set(shapes.current.grid);
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
  }, [pos]);

  /** The colour a drone should show at its target point in the current formation. */
  const target = (k: string, ti: number, B: Float32Array, j: number, t: number, P: THREE.Color[]) => {
    const x = B[ti * 3],
      y = B[ti * 3 + 1];
    if (k === "flag") return ti >= flagWheelFrom(N) ? NAVY : y > FLAG_H / 6 ? SAFFRON : y < -FLAG_H / 6 ? GREEN : WHITE;
    if (k === "cubesat") return ti >= cubesatFrom(N) ? (Math.abs(x) > 0.3 ? OCEAN : GOLD) : (ti * 2654435761) % 7 < 3 ? LAND : OCEAN;
    if (k === "star") return ti < N * 0.45 ? GOLD : WHITE;
    if (k === "singapore") return ti < singaporeTextCount(N) ? SG_RED : WHITE;
    if (k === "swarm") return P[ti % P.length];
    // everything else: a slow sweep across the palette from left to right
    const sweep = (x * 0.12 + t * 0.25) % 1;
    return P[Math.floor(Math.abs(sweep) * P.length) % P.length] ?? P[j % P.length];
  };

  useFrame(({ clock, size, gl }) => {
    const S = shapes.current;
    if (!S || !geo.current || !holder.current) return;
    const galaIdx = getUI().gala;
    const gala = galaIdx !== null;
    const anchor = gala ? GALA_POS : AMBIENT_POS;
    holder.current.position.lerp(anchor, gala ? 0.05 : 1);
    holder.current.rotation.y = gala ? Math.atan2(-GALA_POS.x + GALA_CAM.pos[0], -GALA_POS.z + GALA_CAM.pos[2]) : 0;
    mat.uniforms.uOpacity.value = Math.min(1, Math.max(0, world.night * 1.3 - 0.25));
    mat.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / 2;
    if (world.night < 0.02) return;
    const t = clock.elapsedTime;
    // the gala camera drifts in a slow arc in front of the show, like a broadcast crane
    if (gala) {
      if (galaStart.current < 0) galaStart.current = t;
      const g = t - galaStart.current;
      world.shot = {
        pos: [GALA_CAM.pos[0] + Math.sin(g * 0.07) * 7, GALA_CAM.pos[1] + 1 + Math.sin(g * 0.11) * 2, GALA_CAM.pos[2] - 8],
        look: [GALA_CAM.look[0], GALA_CAM.look[1] + 4, GALA_CAM.look[2]],
      };
    } else galaStart.current = -1;
    // pick the current formation
    let key: string, pal: string[];
    if (gala) {
      const step = GALA_STEPS[Math.min(galaIdx, GALA_STEPS.length - 1)];
      key = step.key;
      pal = [step.color, "#ffffff"];
    } else {
      if (t > cycle.current.until) {
        cycle.current.i = (cycle.current.i + 1) % AMBIENT.length;
        cycle.current.until = t + AMBIENT[cycle.current.i].hold;
      }
      ({ key, pal } = AMBIENT[cycle.current.i]);
    }
    if (key !== lastKey.current) {
      from.current.set(pos);
      fromCol.current.set(cols);
      to.current = S[key];
      perm.current = matchFormations(pos, S[key]);
      toPal.current = pal.map((c) => new THREE.Color(c));
      tStart.current = t;
      prevKey.current = lastKey.current;
      lastKey.current = key;
    }
    // launches and landings take longer, row by row, like a real show
    const span = key === "grid" || prevKey.current === "grid" ? 4.2 : 3;
    const f = Math.min((t - tStart.current) / span, 1);
    const A = from.current,
      B = to.current,
      FC = fromCol.current,
      M = perm.current;
    const k = lastKey.current;
    const spin = t * 0.5;
    const cs = Math.cos(spin),
      sn = Math.sin(spin);
    const sat0 = cubesatFrom(N);
    const orbit = t * 0.55;
    for (let j = 0; j < N; j++) {
      const ix = j * 3;
      const ti = M[j];
      const tx = ti * 3;
      // staggered: drones leave in waves across the formation, then ease in along an arc
      const delay = ((ti * 7919) % N) / N;
      const kk = Math.min(Math.max((f - delay * 0.35) / 0.65, 0), 1);
      const e = kk * kk * (3 - 2 * kk);
      let bx = B[tx],
        by = B[tx + 1],
        bz = B[tx + 2];
      // living formations: the globe turns, the swarm orbits, the rocket climbs, the drone banks,
      // the flag ripples, the CubeSat orbits its planet, the constellation twinkles and turns
      if (k === "globe") {
        const x = bx * cs - bz * sn;
        bz = bx * sn + bz * cs;
        bx = x;
      } else if (k === "swarm") {
        const c = ti % 6,
          a = t * 0.45,
          cx = Math.cos((c / 6) * Math.PI * 2) * 3,
          cy = Math.sin((c / 6) * Math.PI * 2) * 3;
        const ox = bx - cx,
          oy = by - cy;
        const ra = (c / 6) * Math.PI * 2 + a;
        bx = Math.cos(ra) * 3 + ox;
        by = Math.sin(ra) * 3 + oy;
      } else if (k === "rocket") {
        by += Math.min(f, 1) * Math.sin(t * 0.6) * 0.4;
        if (by < -1.6) by -= Math.random() * 0.6; // exhaust flicker
      } else if (k === "drone") {
        const tip = 1.15 + Math.sin(t * 0.7) * 0.12;
        const y2 = by * Math.cos(tip) + bz * Math.sin(tip);
        bz = -by * Math.sin(tip) + bz * Math.cos(tip);
        by = y2 + Math.sin(t * 1.4) * 0.15;
      } else if (k === "flag") {
        // cloth: waves travel from the hoist (left) to the fly, growing toward the free edge
        const u = (bx + 4.5) / 9;
        bz += Math.sin(bx * 0.9 - t * 2.2) * 0.45 * u;
        by += Math.sin(bx * 0.7 - t * 2.2 + 1) * 0.12 * u;
      } else if (k === "cubesat" && ti >= sat0) {
        // the satellite turns slowly as it rounds the planet on a tilted orbit
        const rot = t * 0.4;
        const lx = bx * Math.cos(rot) - bz * Math.sin(rot),
          lz = bx * Math.sin(rot) + bz * Math.cos(rot);
        bx = Math.cos(orbit) * 3.6 + lx;
        by = Math.sin(orbit) * 1.1 + by;
        bz = Math.sin(orbit) * 3.6 + lz;
      } else if (k === "cubesat") {
        const x = bx * cs - bz * sn;
        bz = bx * sn + bz * cs;
        bx = x;
      } else if (k === "star") {
        // the whole constellation turns slowly in its own plane
        const a = t * 0.08;
        const x = bx * Math.cos(a) - by * Math.sin(a);
        by = bx * Math.sin(a) + by * Math.cos(a) + Math.sin(t * 0.8 + ti) * 0.02;
        bx = x;
      }
      const lift = Math.sin(e * Math.PI) * 0.9;
      pos[ix] = A[ix] + (bx - A[ix]) * e;
      pos[ix + 1] = A[ix + 1] + (by - A[ix + 1]) * e + lift + Math.sin(t * 1.1 + j) * 0.012;
      pos[ix + 2] = A[ix + 2] + (bz - A[ix + 2]) * e;
      // colour changes as a wave rolling out from the centre of the new formation
      const r = Math.hypot(B[tx], B[tx + 1]);
      const cw = Math.min(Math.max(f * 1.8 - r * 0.11, 0), 1);
      cb.copy(target(k, ti, B, j, t, toPal.current));
      // flag bands are spaced wider than other formations' points, so each LED burns brighter
      const tw = (k === "flag" || k === "singapore" ? 1.25 : 1) * (0.62 + 0.1 * Math.sin(t * 5 + j * 0.37)) + (k === "star" && ti >= N * 0.75 ? 0.25 * Math.sin(t * 3 + ti) : 0);
      cols[ix] = (FC[ix] + (cb.r * tw - FC[ix]) * cw);
      cols[ix + 1] = (FC[ix + 1] + (cb.g * tw - FC[ix + 1]) * cw);
      cols[ix + 2] = (FC[ix + 2] + (cb.b * tw - FC[ix + 2]) * cw);
    }
    geo.current.attributes.position.needsUpdate = true;
    geo.current.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={holder} scale={6} frustumCulled={false} renderOrder={10} material={mat}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[cols, 3]} />
      </bufferGeometry>
    </points>
  );
}

/** Fireworks over the water during the gala. */
export function Fireworks() {
  const P = 140,
    B = 6;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * B * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(P * B * 3), 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const bursts = useRef(
    Array.from({ length: B }, () => ({ age: 99, o: new THREE.Vector3(), v: [] as THREE.Vector3[], c: new THREE.Color() }))
  );
  const next = useRef(1);
  const pal = ["#ffd23f", "#ff5a6e", "#12f0c0", "#00d2ff", "#ff7ac6", "#ffffff"];
  useFrame((_, dt) => {
    const on = getUI().gala !== null && world.night > 0.6;
    next.current -= dt;
    if (on && next.current < 0) {
      next.current = 0.7 + Math.random() * 1.6;
      const b = bursts.current.find((q) => q.age > 2.4);
      if (b) {
        b.age = 0;
        b.o.set(GALA_POS.x + (Math.random() - 0.5) * 70, 22 + Math.random() * 22, GALA_POS.z + 10 + Math.random() * 20);
        b.c.set(pal[Math.floor(Math.random() * pal.length)]);
        b.v = Array.from({ length: P }, () => new THREE.Vector3().randomDirection().multiplyScalar(7 + Math.random() * 5));
        sfx("firework");
      }
    }
    const pos = geo.attributes.position.array as Float32Array;
    const col = geo.attributes.color.array as Float32Array;
    bursts.current.forEach((b, bi) => {
      b.age += dt;
      const fade = Math.max(0, 1 - b.age / 2.2);
      for (let i = 0; i < P; i++) {
        const ix = (bi * P + i) * 3;
        const v = b.v[i];
        if (!v || b.age > 2.4) {
          pos[ix + 1] = -999;
          continue;
        }
        pos[ix] = b.o.x + v.x * b.age;
        pos[ix + 1] = b.o.y + v.y * b.age - 4.9 * b.age * b.age * 0.6;
        pos[ix + 2] = b.o.z + v.z * b.age;
        col[ix] = b.c.r * fade;
        col[ix + 1] = b.c.g * fade;
        col[ix + 2] = b.c.b * fade;
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Searchlights sweeping the sky from the beach while the gala runs. */
export function Searchlights() {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#cfe6ff", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    []
  );
  const geo = useMemo(() => {
    const c = new THREE.ConeGeometry(2.4, 70, 24, 1, true);
    c.translate(0, -35, 0);
    c.rotateX(Math.PI);
    return c;
  }, []);
  useFrame(({ clock }) => {
    const on = getUI().gala !== null ? world.night : 0;
    mat.opacity += (on * 0.09 - mat.opacity) * 0.05;
    const t = clock.elapsedTime;
    g.current?.children.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 0.5 + i * 1.3) * 0.5;
      b.rotation.x = -0.35 + Math.cos(t * 0.4 + i) * 0.15;
    });
  });
  return (
    <group ref={g}>
      {[-22, -8, 6, 20].map((x, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[x, 0.5, 66 + (i % 2) * 2]} />
      ))}
    </group>
  );
}
