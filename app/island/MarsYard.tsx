"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Flag, Solid } from "./Props";
import { Billboard, fontFamily, M, Quad, useGlow, ZoneGroup } from "./Landmarks";
import { rng } from "./terrain";
import { world } from "./store";

/* Mars Yard: the IRoC-U 2026 finals field. Zone-local (+z faces HQ); the field runs outward to -z.
   Three drones fly GPS-denied missions over pads, craters and an ice patch while the ground
   station's dashboard shows the lead drone's telemetry. */

const FIELD = { x: 11, z0: -23, z1: 3 }; // arena boundary, inside the flat yard
const PADS = {
  home: [-8, -1] as const,
  a: [6, -7] as const,
  b: [-7, -17] as const,
  dock: [8, -21] as const,
};
const ICE = [2, -14] as const;
const CRATERS: [number, number, number][] = [
  [-9, -9, 2.2],
  [10, -13, 1.6],
  [-2, -23, 2.6],
];

/** Lead drone: take off from home, survey A, scan the ice, visit B, land on the dock. */
const ROUTE: { p: [number, number, number]; t: number; mode: string }[] = [
  { p: [PADS.home[0], 0.7, PADS.home[1]], t: 0, mode: "ARMED" },
  { p: [PADS.home[0], 6, PADS.home[1]], t: 3, mode: "TAKEOFF" },
  { p: [PADS.a[0], 6, PADS.a[1]], t: 8, mode: "GUIDED" },
  { p: [PADS.a[0], 3, PADS.a[1]], t: 10, mode: "SURVEY" },
  { p: [ICE[0], 4, ICE[1]], t: 15, mode: "SCAN ICE" },
  { p: [PADS.b[0], 5, PADS.b[1]], t: 21, mode: "GUIDED" },
  { p: [PADS.dock[0], 5, PADS.dock[1]], t: 27, mode: "APPROACH" },
  { p: [PADS.dock[0], 0.8, PADS.dock[1]], t: 30, mode: "LAND" },
  { p: [PADS.dock[0], 0.8, PADS.dock[1]], t: 33, mode: "DOCKED" },
  { p: [PADS.home[0], 6, PADS.home[1]], t: 40, mode: "RTL" },
  { p: [PADS.home[0], 0.7, PADS.home[1]], t: 43, mode: "LANDED" },
];
const LEAD = { x: 0, y: 0, z: 0, mode: "ARMED", wp: 0, bat: 100 };

function leadAt(t: number) {
  const T = ROUTE[ROUTE.length - 1].t;
  const k = t % T;
  let i = 0;
  while (i < ROUTE.length - 2 && k > ROUTE[i + 1].t) i++;
  const A = ROUTE[i],
    B = ROUTE[i + 1];
  const u0 = (k - A.t) / (B.t - A.t || 1),
    u = u0 * u0 * (3 - 2 * u0);
  LEAD.x = A.p[0] + (B.p[0] - A.p[0]) * u;
  LEAD.y = A.p[1] + (B.p[1] - A.p[1]) * u;
  LEAD.z = A.p[2] + (B.p[2] - A.p[2]) * u;
  LEAD.mode = B.mode;
  LEAD.wp = i;
  LEAD.bat = 100 - (k / T) * 38;
  return LEAD;
}

function canvasMat(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.9 }) };
}

/** ArUco-style marker for the pads (a fixed 6x6 pattern per pad). */
function markerTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 96, 96);
  const r = rng(seed);
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) if (r() > 0.5) (g.fillStyle = "#fff"), g.fillRect(x * 12, y * 12, 12, 12);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

function Pad({ at, label, color, seed }: { at: readonly [number, number]; label: string; color: string; seed: number }) {
  const ring = useGlow(color, 0.5, 2.6);
  const marker = useMemo(() => new THREE.MeshBasicMaterial({ map: markerTexture(seed) }), [seed]);
  const sign = useMemo(() => {
    const s = canvasMat(256, 96);
    const g = s.c.getContext("2d")!;
    g.fillStyle = "#0b0d12";
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = color;
    g.font = "800 44px monospace";
    g.fillText(label, 18, 64);
    s.tex.needsUpdate = true;
    return s.mat;
  }, [label, color]);
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.06, 0]} material={M.dark} receiveShadow>
        <cylinderGeometry args={[1.9, 2, 0.12, 40]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation-x={-Math.PI / 2} material={ring}>
        <ringGeometry args={[1.6, 1.75, 40]} />
      </mesh>
      <mesh position={[0, 0.131, 0]} rotation-x={-Math.PI / 2} material={marker}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <mesh position={[2.2, 0.7, 0]} rotation-y={-Math.PI / 2} material={sign}>
        <planeGeometry args={[1.4, 0.52]} />
      </mesh>
    </group>
  );
}

function IcePatch() {
  const geo = useMemo(() => {
    const r = rng(5);
    const pts = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const rad = 3.2 + (r() - 0.5) * 1.4;
      return new THREE.Vector2(Math.cos(a) * rad * 1.3, Math.sin(a) * rad);
    });
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.12, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.06, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#dff4ff", roughness: 0.08, metalness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 }), []);
  const shards = useMemo(() => {
    const r = rng(6);
    return Array.from({ length: 9 }, () => ({ x: (r() - 0.5) * 6, z: (r() - 0.5) * 4, s: 0.2 + r() * 0.35, ry: r() * 3 }));
  }, []);
  return (
    <group position={[ICE[0], 0.04, ICE[1]]}>
      <mesh geometry={geo} material={mat} receiveShadow />
      {shards.map((q, i) => (
        <mesh key={i} position={[q.x, 0.25, q.z]} rotation={[0.3, q.ry, 0.2]} scale={q.s} material={mat} castShadow>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function FlyingQuad({ path, scale = 3.2, scanRef }: { path: (t: number) => [number, number, number, number]; scale?: number; scanRef?: React.RefObject<THREE.Mesh | null> }) {
  const g = useRef<THREE.Group>(null);
  const prev = useRef(new THREE.Vector3());
  useFrame(({ clock }) => {
    const [x, y, z, tilt] = path(clock.elapsedTime);
    if (!g.current) return;
    const vx = x - prev.current.x,
      vz = z - prev.current.z;
    g.current.position.set(x, y, z);
    if (Math.hypot(vx, vz) > 0.002) g.current.rotation.y = Math.atan2(vx, vz);
    g.current.rotation.x = tilt;
    prev.current.set(x, y, z);
    if (scanRef?.current) {
      scanRef.current.position.set(x, y / 2, z);
      scanRef.current.scale.set(1, y, 1);
    }
  });
  return (
    <group ref={g}>
      <group rotation-y={Math.PI / 4}>
        <Quad scale={scale} />
      </group>
    </group>
  );
}

function Dashboard() {
  const s = useMemo(() => canvasMat(1024, 576), []);
  const ff = useMemo(() => fontFamily(), []);
  const trail = useRef<[number, number][]>([]);
  const acc = useRef(0);
  useFrame(({ clock }, dt) => {
    s.mat.emissiveIntensity = 0.8 + world.night * 1.1;
    acc.current += dt;
    if (acc.current < 0.2) return;
    acc.current = 0;
    const L = leadAt(clock.elapsedTime);
    trail.current.push([L.x, L.z]);
    if (trail.current.length > 120) trail.current.shift();
    const g = s.c.getContext("2d")!;
    g.fillStyle = "#06090f";
    g.fillRect(0, 0, 1024, 576);
    g.fillStyle = "#ff7a00";
    g.fillRect(0, 0, 1024, 10);
    g.font = `800 30px ${ff}`;
    g.fillText("IRoC-U 2026 · FINALS · MISSION CONTROL", 28, 54);
    g.font = `600 20px ${ff}`;
    g.fillStyle = "rgba(255,255,255,.55)";
    g.fillText("TEAM 10144 · SIT LONAVALA · URSC", 28, 84);
    // telemetry column
    const rows: [string, string, string][] = [
      ["MODE", L.mode, "#12f0c0"],
      ["ALTITUDE", `${L.y.toFixed(1)} m`, "#ffffff"],
      ["BATTERY", `${L.bat.toFixed(0)} %`, L.bat > 70 ? "#12f0c0" : "#ffd23f"],
      ["GPS SATS", "0  (GPS-denied)", "#ff5a6e"],
      ["POSE", "FAST-LIO + EKF2", "#9fdcff"],
      ["WAYPOINT", `${Math.min(L.wp + 1, ROUTE.length - 1)} / ${ROUTE.length - 1}`, "#ffffff"],
    ];
    rows.forEach(([k, v, c], i) => {
      g.fillStyle = "rgba(255,255,255,.55)";
      g.font = `600 20px ${ff}`;
      g.fillText(k, 28, 140 + i * 66);
      g.fillStyle = c;
      g.font = `800 32px ${ff}`;
      g.fillText(v, 28, 174 + i * 66);
    });
    // live map of the field with pads, ice, craters and the drone's trail
    const mx = 470,
      my = 110,
      mw = 520,
      mh = 440;
    g.strokeStyle = "rgba(255,122,0,.6)";
    g.lineWidth = 2;
    g.strokeRect(mx, my, mw, mh);
    const P = (x: number, z: number) => [mx + ((x + FIELD.x) / (2 * FIELD.x)) * mw, my + ((z - FIELD.z1) / (FIELD.z0 - FIELD.z1)) * mh] as const;
    g.fillStyle = "rgba(200,240,255,.35)";
    const [ix, iz] = P(ICE[0], ICE[1]);
    g.beginPath();
    g.ellipse(ix, iz, 60, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.25)";
    CRATERS.forEach(([x, z, r]) => {
      const [cx, cz] = P(x, z);
      g.beginPath();
      g.arc(cx, cz, r * 14, 0, Math.PI * 2);
      g.stroke();
    });
    Object.entries(PADS).forEach(([k, [x, z]]) => {
      const [px, pz] = P(x, z);
      g.fillStyle = k === "dock" ? "#12f0c0" : "#ffd23f";
      g.fillRect(px - 9, pz - 9, 18, 18);
    });
    g.strokeStyle = "#ff7a00";
    g.lineWidth = 3;
    g.beginPath();
    trail.current.forEach(([x, z], i) => {
      const [px, pz] = P(x, z);
      i ? g.lineTo(px, pz) : g.moveTo(px, pz);
    });
    g.stroke();
    const [dx, dz] = P(L.x, L.z);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(dx, dz, 9, 0, Math.PI * 2);
    g.fill();
    s.tex.needsUpdate = true;
  });
  return (
    <group>
      <mesh position={[0, 2.6, 0.06]} material={s.mat}>
        <planeGeometry args={[5.6, 3.15]} />
      </mesh>
      <mesh position={[0, 2.6, 0]} material={M.dark}>
        <boxGeometry args={[5.85, 3.4, 0.1]} />
      </mesh>
      <mesh position={[0, 0.5, -0.05]} material={M.metal}>
        <boxGeometry args={[0.16, 1.1, 0.16]} />
      </mesh>
    </group>
  );
}

function GroundStation() {
  const canopy = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f7f8fa", roughness: 0.7, side: THREE.DoubleSide }), []);
  const laptop = useGlow("#9fdcff", 0.4, 1.8);
  return (
    <group>
      {/* white canopy tent on four legs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 3, 1.3, sz * 2]} material={M.metal}>
            <cylinderGeometry args={[0.05, 0.05, 2.6, 6]} />
          </mesh>
        ))
      )}
      <mesh position={[0, 2.95, 0]} rotation-y={Math.PI / 4} material={canopy} castShadow>
        <coneGeometry args={[4.6, 0.9, 4, 1, true]} />
      </mesh>
      <Solid w={5.2} d={1.5} position={[0, 0, -0.6]} />
      <Solid w={3} d={0.6} position={[0, 0, -2.6]} />
      <mesh position={[0, 0.75, -0.6]} material={M.white} castShadow>
        <boxGeometry args={[5, 0.08, 1.3]} />
      </mesh>
      {[-1.6, 0, 1.6].map((x) => (
        <group key={x} position={[x, 0.8, -0.6]}>
          <mesh material={M.dark}>
            <boxGeometry args={[0.7, 0.03, 0.5]} />
          </mesh>
          <mesh position={[0, 0.22, -0.22]} rotation-x={-0.25} material={laptop}>
            <boxGeometry args={[0.7, 0.45, 0.02]} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0, -2.6]} rotation-y={Math.PI}>
        <Dashboard />
      </group>
    </group>
  );
}

function FinalsArch() {
  const banner = useMemo(() => {
    const s = canvasMat(1024, 160);
    const g = s.c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, "#0b2a6b");
    grad.addColorStop(1, "#12306e");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 160);
    g.fillStyle = "#ff7a00";
    g.fillRect(0, 0, 1024, 12);
    g.fillRect(0, 148, 1024, 12);
    g.fillStyle = "#ffffff";
    g.font = "800 50px sans-serif";
    g.fillText("ISRO ROBOTICS CHALLENGE · URSC", 40, 78);
    g.font = "700 34px monospace";
    g.fillStyle = "#ffb15c";
    g.fillText("IRoC-U 2026 · FINALS · TEAM 10144", 40, 128);
    s.tex.needsUpdate = true;
    return s.mat;
  }, []);
  return (
    <group>
      {[-6.5, 6.5].map((x) => (
        <Solid key={`s${x}`} r={0.45} position={[x, 0, 0]} />
      ))}
      {[-6.5, 6.5].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]} material={M.white} castShadow>
          <boxGeometry args={[0.5, 5.2, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, 4.6, 0.05]} material={banner}>
        <planeGeometry args={[12.6, 1.97]} />
      </mesh>
      <mesh position={[0, 4.6, -0.02]} material={M.dark}>
        <boxGeometry args={[12.9, 2.1, 0.08]} />
      </mesh>
    </group>
  );
}

export function MarsYard() {
  const scan = useRef<THREE.Mesh>(null);
  const scanMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff5a36", transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), []);
  const net = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d2128", transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }), []);
  const rocks = useMemo(() => {
    const r = rng(11);
    const keep = (x: number, z: number) =>
      Object.values(PADS).every(([px, pz]) => Math.hypot(x - px, z - pz) > 3.2) && Math.hypot(x - ICE[0], z - ICE[1]) > 5 && CRATERS.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr + 0.6);
    const out: { p: [number, number, number]; s: number; rot: number }[] = [];
    while (out.length < 46) {
      const x = (r() - 0.5) * 2 * (FIELD.x - 1),
        z = FIELD.z0 + 1 + r() * (FIELD.z1 - FIELD.z0 - 2);
      if (keep(x, z)) out.push({ p: [x, 0.1, z], s: 0.2 + r() * 0.7, rot: r() * 3 });
    }
    return out;
  }, []);
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -FIELD.x; x <= FIELD.x; x += 3.25) out.push([x, FIELD.z0], [x, FIELD.z1]);
    for (let z = FIELD.z0 + 3; z < FIELD.z1; z += 3) out.push([-FIELD.x, z], [FIELD.x, z]);
    return out;
  }, []);
  // the survey drone mows the far half of the field; the third hovers on a test tether
  const survey = (t: number): [number, number, number, number] => {
    const k = (t * 0.06) % 1;
    const lane = Math.floor(k * 6),
      u = (k * 6) % 1;
    const x = (lane % 2 ? 1 - u : u) * 20 - 10;
    return [x, 8 + Math.sin(t) * 0.2, -24 + lane * 2.2, 0.08];
  };
  const tether = (t: number): [number, number, number, number] => [-11, 2.4 + Math.sin(t * 1.3) * 0.5, 2.2, Math.sin(t * 0.9) * 0.05];
  const lead = (t: number): [number, number, number, number] => {
    const L = leadAt(t);
    return [L.x, L.y, L.z, L.mode === "GUIDED" || L.mode === "RTL" ? 0.14 : 0];
  };
  return (
    <ZoneGroup id="marsyard">
      {/* boundary: a low barrier and a safety net on poles */}
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 2, z]} material={M.metal}>
          <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
        </mesh>
      ))}
      {[
        [0, FIELD.z0, 2 * FIELD.x, 0],
        [0, FIELD.z1, 2 * FIELD.x, 0],
        [-FIELD.x, (FIELD.z0 + FIELD.z1) / 2, FIELD.z1 - FIELD.z0, Math.PI / 2],
        [FIELD.x, (FIELD.z0 + FIELD.z1) / 2, FIELD.z1 - FIELD.z0, Math.PI / 2],
      ].map(([x, z, len, ry], i) =>
        // the HQ side stays open as the entrance
        i === 1 ? null : (
          <group key={i} position={[x, 0, z]} rotation-y={ry}>
            <Solid w={len} d={0.35} />
            <mesh position={[0, 0.3, 0]} material={M.red}>
              <boxGeometry args={[len, 0.6, 0.12]} />
            </mesh>
            <mesh position={[0, 2.3, 0]} material={net}>
              <planeGeometry args={[len, 3.4]} />
            </mesh>
          </group>
        )
      )}
      <Pad at={PADS.home} label="H · HOME" color="#ffd23f" seed={1} />
      <Pad at={PADS.a} label="WP-A" color="#ffd23f" seed={2} />
      <Pad at={PADS.b} label="WP-B" color="#ffd23f" seed={3} />
      <Pad at={PADS.dock} label="DOCK" color="#12f0c0" seed={4} />
      {/* docking station on the final pad */}
      <group position={[PADS.dock[0] + 3.6, 0, PADS.dock[1]]}>
        <Solid w={2.6} d={2.4} />
        <mesh position={[0, 0.8, 0]} material={M.white} castShadow>
          <boxGeometry args={[2.4, 1.6, 2.2]} />
        </mesh>
        <mesh position={[0, 1.7, 0]} rotation-z={0.25} material={M.metal} castShadow>
          <boxGeometry args={[2.8, 0.12, 2.4]} />
        </mesh>
      </group>
      <IcePatch />
      {CRATERS.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[r, 28]} />
            <meshStandardMaterial color="#7a2f19" roughness={1} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2} castShadow>
            <torusGeometry args={[r, 0.32, 8, 28]} />
            <meshStandardMaterial color="#b14a28" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
      {rocks.map((q, i) => (
        <mesh key={i} position={q.p} rotation={[q.rot, q.rot * 2, 0]} scale={q.s} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a3a1f" roughness={1} flatShading />
        </mesh>
      ))}
      <FlyingQuad path={lead} scale={3.4} scanRef={scan} />
      <mesh ref={scan} material={scanMat}>
        <coneGeometry args={[1.6, 1, 24, 1, true]} />
      </mesh>
      <FlyingQuad path={survey} scale={3} />
      <FlyingQuad path={tether} scale={2.8} />
      <group position={[-10.5, 0, 7.5]} rotation-y={0.5}>
        <GroundStation />
      </group>
      <group position={[0, 0, FIELD.z1 + 0.5]}>
        <FinalsArch />
      </group>
      {[-8.5, 8.5].map((x, i) => (
        <group key={x} position={[x, 0, FIELD.z1 + 1.4]}>
          <Flag kind="india" height={6.5} width={2.1} phase={i * 1.3} />
        </group>
      ))}
      <Billboard id="marsyard" pos={[4.5, 0, 9.5]} rotY={-0.25} />
    </ZoneGroup>
  );
}
