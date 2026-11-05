"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARENA, zoneToWorld } from "./colliders";
import { MarsYard } from "./MarsYard";
import { heightAt, ridgeTop, RIDGE_TOP, rng, ROAD_HALF, ROAD_R, ROPE_PEAKS } from "./terrain";
import { zoneById, zonePos, ZONES, type ZoneId } from "./zones";
import { setUI, TOUR, useUI, world } from "./store";
import { papers } from "@/lib/achievements";
import { Solid } from "./Props";

/* ---------------- shared materials ---------------- */
export const M = {
  metal: new THREE.MeshStandardMaterial({ color: "#eef2f7", metalness: 0.75, roughness: 0.18 }),
  white: new THREE.MeshStandardMaterial({ color: "#f7f8fa", roughness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: "#1d2128", roughness: 0.6, metalness: 0.3 }),
  // plain transparent glass: transmission would re-render the whole scene every frame
  glass: new THREE.MeshStandardMaterial({ color: "#cfefff", roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.45, depthWrite: false }),
  gold: new THREE.MeshStandardMaterial({ color: "#f5b301", metalness: 1, roughness: 0.22 }),
  red: new THREE.MeshStandardMaterial({ color: "#e5322d", roughness: 0.45, metalness: 0.2 }),
  wood: new THREE.MeshStandardMaterial({ color: "#a8754a", roughness: 0.9 }),
};

/** Emissive material whose glow follows night mode. */
export function useGlow(color: string, day = 0.25, night = 2.2) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 }), [color, day]);
  useFrame(() => {
    m.emissiveIntensity = day + (night - day) * world.night;
  });
  return m;
}

export function fontFamily() {
  if (typeof document === "undefined") return "sans-serif";
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

/* ---------------- billboards ---------------- */
function boardTexture(id: ZoneId) {
  const z = zoneById[id];
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 600;
  const g = c.getContext("2d")!;
  const ff = fontFamily();
  g.fillStyle = "#0b0d12";
  g.fillRect(0, 0, 1024, 600);
  const grd = g.createLinearGradient(0, 0, 1024, 0);
  grd.addColorStop(0, z.accent);
  grd.addColorStop(1, "#00d2ff");
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 10);
  g.fillStyle = z.accent;
  g.font = `500 26px ${ff}`;
  g.fillText(z.team.toUpperCase(), 56, 80);
  g.fillStyle = "#ffffff";
  g.font = `700 92px ${ff}`;
  g.fillText(z.name, 52, 190);
  // headline, wrapped
  g.font = `500 44px ${ff}`;
  g.fillStyle = "rgba(255,255,255,0.78)";
  const words = z.headline.split(" ");
  let line = "",
    y = 290;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > 900) {
      g.fillText(line, 56, y);
      line = w;
      y += 58;
    } else line = t;
  }
  g.fillText(line, 56, y);
  g.fillStyle = z.accent;
  g.font = `600 30px ${ff}`;
  g.fillText("Open  ↗", 56, 548);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.font = `500 26px ${ff}`;
  g.fillText(`press E  ·  ${z.key}`, 790, 548);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function hoverHandlers(id: ZoneId) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setUI({ open: id });
    },
  };
}

export function Billboard({ id, pos, rotY, scale = 1 }: { id: ZoneId; pos: [number, number, number]; rotY: number; scale?: number }) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  const accent = zoneById[id].accent;
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef2f7", metalness: 0.75, roughness: 0.18, emissive: accent, emissiveIntensity: 0 }), [accent]);
  useEffect(() => {
    let t: THREE.CanvasTexture | null = null;
    const make = () => {
      t = boardTexture(id);
      setTex(t);
    };
    if (document.fonts?.ready) document.fonts.ready.then(make);
    else make();
    return () => t?.dispose();
  }, [id]);
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.55, roughness: 0.35 }), []);
  useEffect(() => {
    screen.map = tex;
    screen.emissiveMap = tex;
    screen.needsUpdate = true;
  }, [tex, screen]);
  useFrame((_, dt) => {
    screen.emissiveIntensity = 0.55 + 0.6 * world.night + (hover ? 0.25 : 0);
    frame.emissiveIntensity += ((hover ? 0.9 : 0) - frame.emissiveIntensity) * Math.min(dt * 8, 1);
    if (g.current) {
      const s = scale * (hover ? 1.04 : 1);
      g.current.scale.x += (s - g.current.scale.x) * Math.min(dt * 8, 1);
      g.current.scale.y = g.current.scale.z = g.current.scale.x;
    }
  });
  const h = hoverHandlers(id);
  // sit on the ground under the board itself, not the zone centre's height
  const y = useMemo(() => pos[1] + groundOffset(id, pos[0], pos[2]), [id, pos]);
  return (
    <group ref={g} position={[pos[0], y, pos[2]]} rotation-y={rotY} scale={scale}>
      {[-2.2, 2.2].map((x) => (
        // posts run 1 m into the ground so they stay planted on a slope
        <mesh key={x} position={[x, 0.9, -0.32]} material={M.metal} castShadow>
          <boxGeometry args={[0.18, 3.8, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, -0.12]} material={frame} castShadow>
        <boxGeometry args={[5.4, 3.3, 0.16]} />
      </mesh>
      <mesh
        position={[0, 3.6, -0.03]}
        material={screen}
        onPointerOver={(e) => {
          h.onPointerOver(e);
          setHover(true);
        }}
        onPointerOut={() => {
          h.onPointerOut();
          setHover(false);
        }}
        onClick={h.onClick}
      >
        <planeGeometry args={[5.1, 3.0]} />
      </mesh>
      <Solid w={5.4} d={0.7} position={[0, 0, -0.25]} />
      {/* little concrete footings */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.08, -0.32]} material={M.white} receiveShadow>
          <boxGeometry args={[0.5, 0.16, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

/** Small floating pill above each zone, visible from the overview. */
function ZoneLabel({ id, y }: { id: ZoneId; y: number }) {
  const { mode, near, tour } = useUI();
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  const show = (mode === "tour" && TOUR[tour] === id) || (mode === "explore" && near === id);
  if (!show) return null; // drei Html costs a DOM update per frame, so only mount what's visible
  return (
    <Html position={[x, heightAt(x, zz) + y, zz]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        className={`whitespace-nowrap rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[12px] font-semibold tracking-tight text-neutral-900 shadow-lg backdrop-blur transition-all duration-500 ${
          show ? "opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: z.accent }} />
        {z.name}
      </div>
    </Html>
  );
}

/** Place a zone group on the terrain, facing the island centre. */
/** Ground height at a zone-local point, relative to the zone centre (ZoneGroup's origin). */
function groundOffset(id: ZoneId, lx: number, lz: number) {
  const [x, z] = zonePos(zoneById[id]);
  const [wx, wz] = id === "hq" ? [lx, lz] : zoneToWorld(id, lx, lz);
  return heightAt(wx, wz) - heightAt(x, z);
}

export function ZoneGroup({ id, children }: { id: ZoneId; children: React.ReactNode }) {
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  const face = Math.atan2(-x, -zz); // +z of the group points at HQ
  return (
    <group position={[x, heightAt(x, zz), zz]} rotation-y={id === "hq" ? 0 : face}>
      {children}
    </group>
  );
}

/* ================= ZONES ================= */

/* Mission Control's live ring: four screens orbiting the tower. Countdown to the Singapore finale,
   mission log, headline numbers and an IST clock with uplink bars. */
const FINALE = Date.UTC(2026, 10, 15, 1, 0); // 15 Nov 2026, 09:00 SGT
function ControlRing() {
  const g = useRef<THREE.Group>(null);
  const ff = useMemo(() => fontFamily(), []);
  const panels = useMemo(
    () =>
      [0, 1, 2, 3].map(() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 320;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return { c, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.8, side: THREE.DoubleSide }) };
      }),
    []
  );
  const acc = useRef(1);
  useFrame(({ clock }, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.12;
    panels.forEach((p) => (p.mat.emissiveIntensity = 0.7 + world.night * 1.1));
    acc.current += dt;
    if (acc.current < 1) return;
    acc.current = 0;
    const now = Date.now();
    const draw = (i: number, title: string, col: string, body: (x: CanvasRenderingContext2D) => void) => {
      const x = panels[i].c.getContext("2d")!;
      x.fillStyle = "#060b16";
      x.fillRect(0, 0, 512, 320);
      x.fillStyle = col;
      x.fillRect(0, 0, 512, 8);
      x.font = `700 24px ${ff}`;
      x.fillText(title, 24, 48);
      body(x);
      panels[i].tex.needsUpdate = true;
    };
    const left = Math.max(0, FINALE - now);
    const d = Math.floor(left / 864e5),
      h = Math.floor((left / 36e5) % 24),
      m = Math.floor((left / 6e4) % 60),
      sec = Math.floor((left / 1e3) % 60);
    draw(0, "T-MINUS · SINGAPORE FINALE", "#00d2ff", (x) => {
      x.fillStyle = "#ffffff";
      x.font = `800 84px ${ff}`;
      x.fillText(left ? `${d}d ${String(h).padStart(2, "0")}h` : "LIVE", 24, 160);
      x.font = `700 44px ${ff}`;
      x.fillStyle = "#9fdcff";
      x.fillText(`${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`, 24, 222);
      x.font = `500 22px ${ff}`;
      x.fillStyle = "rgba(255,255,255,.6)";
      x.fillText("SMU Singapore · 15–17 Nov 2026", 24, 286);
    });
    draw(1, "MISSION LOG", "#12f0c0", (x) => {
      const rows: [string, string, string][] = [
        ["SIH 2025", "NATIONAL WINNER", "#ffd23f"],
        ["RoboRashtra", "1ST RUNNER-UP", "#12f0c0"],
        ["IRoC-U 2026", "FINALIST", "#ff7a45"],
        ["Doppelmayr", "COMPLETE", "#9fb3ad"],
        ["Singapore", "NEXT", "#00d2ff"],
      ];
      rows.forEach(([k, v, c], i) => {
        x.fillStyle = "#c9d6e2";
        x.font = `600 24px ${ff}`;
        x.fillText(k, 24, 98 + i * 44);
        x.fillStyle = c;
        x.font = `800 22px ${ff}`;
        x.fillText(v, 290, 98 + i * 44);
      });
    });
    draw(2, "BY THE NUMBERS", "#ffd23f", (x) => {
      const nums: [string, string][] = [
        ["6", "SSRN papers"],
        ["102", "public repos"],
        ["45", "builds on the board"],
        ["161", "LinkedIn posts"],
      ];
      nums.forEach(([n, l], i) => {
        const cx = 24 + (i % 2) * 244,
          cy = 130 + Math.floor(i / 2) * 120;
        x.fillStyle = "#ffffff";
        x.font = `800 64px ${ff}`;
        x.fillText(n, cx, cy);
        x.fillStyle = "rgba(255,255,255,.6)";
        x.font = `500 20px ${ff}`;
        x.fillText(l, cx, cy + 32);
      });
    });
    draw(3, "UPLINK · NAVI MUMBAI", "#ff7ac6", (x) => {
      const ist = new Date(now + 5.5 * 36e5);
      x.fillStyle = "#ffffff";
      x.font = `800 72px ${ff}`;
      x.fillText(`${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}:${String(ist.getUTCSeconds()).padStart(2, "0")}`, 24, 150);
      x.fillStyle = "rgba(255,255,255,.6)";
      x.font = `500 22px ${ff}`;
      x.fillText("IST · all systems nominal", 24, 188);
      const t = clock.elapsedTime;
      for (let i = 0; i < 14; i++) {
        const hh = 20 + Math.abs(Math.sin(t * 1.7 + i * 0.9)) * 70;
        x.fillStyle = i % 3 ? "#ff7ac6" : "#00d2ff";
        x.fillRect(24 + i * 32, 300 - hh, 20, hh);
      }
    });
  });
  return (
    <group ref={g} position={[0, 9.6, 0]}>
      {panels.map((p, i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 2.9, 0, Math.cos(a) * 2.9]} rotation-y={a}>
            <mesh material={p.mat}>
              <planeGeometry args={[3.2, 2]} />
            </mesh>
            <mesh position={[0, 0, -0.04]} material={M.dark}>
              <boxGeometry args={[3.35, 2.15, 0.06]} />
            </mesh>
            <mesh position={[0, 0, -1.4]} rotation-x={Math.PI / 2} material={M.metal}>
              <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function HQ() {
  const dish = useRef<THREE.Group>(null);
  const ring = useGlow("#2d5bff", 0.4, 2.5);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.6;
  });
  return (
    <ZoneGroup id="hq">
      {/* the tower rises from the stone island in the middle of the fountain (Plaza.tsx) */}
      <mesh position={[0, 7, 0]} material={M.metal} castShadow>
        <cylinderGeometry args={[0.9, 1.4, 14, 24]} />
      </mesh>
      {[4.5, 8, 11.2].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={i === 1 ? ring : M.metal} castShadow>
          <torusGeometry args={[1.9 - i * 0.25, 0.14, 8, 40]} />
        </mesh>
      ))}
      <mesh position={[0, 14.4, 0]} material={M.glass}>
        <sphereGeometry args={[1.3, 24, 16]} />
      </mesh>
      <group ref={dish} position={[0, 15.8, 0]}>
        <mesh material={M.metal}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        </mesh>
        <mesh position={[0.4, 0.6, 0]} rotation-z={-0.9} material={M.white}>
          <sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, 1.0]} />
        </mesh>
      </group>
      <ControlRing />
      <Billboard id="hq" pos={[3.5, 0, 15.6]} rotY={0.12} scale={0.9} />
    </ZoneGroup>
  );
}

/* The SIH trophy: a two-handled cup with a lip, a knotted stem and a stepped ebony base with a
   gold plaque, standing on a stone plinth in the centre circle. */
function Trophy() {
  const g = useRef<THREE.Group>(null);
  const { cup, stem, handle } = useMemo(() => {
    const v = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.LatheGeometry(
      v([[0.0, 1.55], [0.32, 1.58], [0.62, 1.72], [0.86, 1.98], [1.02, 2.32], [1.1, 2.7], [1.14, 3.05], [1.22, 3.14], [1.2, 3.2], [1.06, 3.12], [1.0, 2.75], [0.9, 2.4], [0.7, 2.1], [0.0, 1.95]]),
      64
    );
    const stem = new THREE.LatheGeometry(
      v([[0.0, 0.62], [0.5, 0.62], [0.52, 0.7], [0.2, 0.78], [0.14, 0.95], [0.26, 1.08], [0.3, 1.16], [0.24, 1.26], [0.15, 1.36], [0.22, 1.5], [0.34, 1.58], [0.0, 1.6]]),
      48
    );
    // a handle: an S-curve tube from the bowl's shoulder out and down to its waist
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.0, 2.95, 0),
      new THREE.Vector3(1.55, 3.0, 0),
      new THREE.Vector3(1.75, 2.6, 0),
      new THREE.Vector3(1.45, 2.15, 0),
      new THREE.Vector3(0.95, 2.05, 0),
    ]);
    return { cup, stem, handle: new THREE.TubeGeometry(curve, 32, 0.07, 10, false) };
  }, []);
  const ebony = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.25, metalness: 0.3 }), []);
  const plaque = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c99a12";
    x.fillRect(0, 0, 512, 128);
    x.fillStyle = "#3a2a00";
    x.font = "700 40px serif";
    x.textAlign = "center";
    x.fillText("SMART INDIA HACKATHON 2025", 256, 58);
    x.font = "600 30px serif";
    x.fillText("Winner · Team Algo Sapiens", 256, 102);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.35 });
  }, []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.3;
  });
  return (
    <group>
      {/* plinth */}
      <mesh position={[0, 0.6, 0]} material={M.white} castShadow receiveShadow>
        <cylinderGeometry args={[1.25, 1.4, 1.2, 32]} />
      </mesh>
      <mesh position={[0, 1.23, 0]} material={M.metal}>
        <cylinderGeometry args={[1.3, 1.3, 0.06, 32]} />
      </mesh>
      <group ref={g} position={[0, 1.26, 0]} scale={1.15}>
        {/* stepped base */}
        <mesh position={[0, 0.16, 0]} material={ebony} castShadow>
          <boxGeometry args={[1.3, 0.32, 1.3]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={ebony} castShadow>
          <boxGeometry args={[1.0, 0.26, 1.0]} />
        </mesh>
        {[0, Math.PI].map((r) => (
          <mesh key={r} position={[Math.sin(r) * 0.66, 0.16, Math.cos(r) * 0.66]} rotation-y={r} material={plaque}>
            <planeGeometry args={[1.1, 0.27]} />
          </mesh>
        ))}
        <mesh geometry={stem} material={M.gold} castShadow />
        <mesh geometry={cup} material={M.gold} castShadow />
        {[0, Math.PI].map((r) => (
          <mesh key={r} geometry={handle} rotation-y={r} material={M.gold} castShadow />
        ))}
        {/* a star finial on the lid */}
        <mesh position={[0, 3.32, 0]} material={M.gold} castShadow>
          <octahedronGeometry args={[0.22, 0]} />
        </mesh>
      </group>
    </group>
  );
}

/* The Arena: a tiered bowl with a canopy, open toward HQ, full of seated fans doing the wave. */
const SHIRTS = ["#2d5bff", "#ff5a36", "#ffd23f", "#12f0c0", "#ff7ac6", "#f7f8fa", "#9b7bff", "#1d2128", "#3aa66b", "#e5322d"];
const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#a0663a", "#6b4423", "#f1c27d"];
function Crowd() {
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const seats = useMemo(() => {
    const r = rng(8);
    const out: { x: number; y: number; z: number; yaw: number; a: number; ph: number; shirt: number; skin: number }[] = [];
    for (let row = 0; row < 6; row++) {
      const rad = ARENA.r0 + 0.55 + row * 0.95;
      const n = Math.floor((rad * (Math.PI * 2 - ARENA.gapHalf * 2)) / 0.72);
      for (let k = 0; k < n; k++) {
        if (r() < 0.12) continue; // a few empty seats
        const a = ARENA.gapHalf + 0.06 + (k / n) * (Math.PI * 2 - ARENA.gapHalf * 2 - 0.12);
        const x = Math.sin(a) * rad,
          z = Math.cos(a) * rad;
        out.push({ x, y: 0.62 + row * 0.6, z, yaw: Math.atan2(-x, -z), a, ph: r() * 6, shirt: Math.floor(r() * SHIRTS.length), skin: Math.floor(r() * SKIN.length) });
      }
    }
    return out;
  }, []);
  const N = seats.length;
  const armGeo = useMemo(() => {
    // two arms as one geometry, pivoting at the shoulders (origin), hanging along -y
    const g1 = new THREE.BoxGeometry(0.1, 0.42, 0.1).translate(-0.27, -0.21, 0);
    const g2 = new THREE.BoxGeometry(0.1, 0.42, 0.1).translate(0.27, -0.21, 0);
    const g = mergeGeometries([g1, g2])!;
    return g;
  }, []);
  useEffect(() => {
    const c = new THREE.Color();
    seats.forEach((s, i) => {
      body.current!.setColorAt(i, c.set(SHIRTS[s.shirt]));
      arms.current!.setColorAt(i, c.set(SHIRTS[s.shirt]));
      head.current!.setColorAt(i, c.set(SKIN[s.skin]));
      legs.current!.setColorAt(i, c.set(s.shirt % 3 ? "#2a3446" : "#4a3b2c"));
    });
    [body, head, legs, arms].forEach((m) => m.current!.instanceColor && (m.current!.instanceColor.needsUpdate = true));
  }, [seats]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const cheer = world.gala > 0.5 ? 1 : 0;
    for (let i = 0; i < N; i++) {
      const s = seats[i];
      // a Mexican wave goes round the bowl; everyone fidgets a little
      const wave = Math.max(0, Math.sin(t * 1.5 - s.a * 2)) ** 8;
      const up = Math.min(1, wave + cheer * (0.5 + 0.5 * Math.sin(t * 6 + s.ph)));
      const hop = up * 0.18 + Math.abs(Math.sin(t * 2 + s.ph)) * 0.015;
      e.set(0, s.yaw, 0);
      q.setFromEuler(e);
      m.compose(v.set(s.x, s.y + 0.32 + hop, s.z), q, one);
      body.current!.setMatrixAt(i, m);
      m.compose(v.set(s.x, s.y + 0.72 + hop, s.z), q, one);
      head.current!.setMatrixAt(i, m);
      m.compose(v.set(s.x + Math.sin(s.yaw) * 0.14, s.y + 0.06, s.z + Math.cos(s.yaw) * 0.14), q, one);
      legs.current!.setMatrixAt(i, m);
      e.set(-Math.PI * up * 0.95, s.yaw, 0, "YXZ");
      q.setFromEuler(e);
      m.compose(v.set(s.x, s.y + 0.52 + hop, s.z), q, one);
      arms.current!.setMatrixAt(i, m);
    }
    [body, head, legs, arms].forEach((r) => (r.current!.instanceMatrix.needsUpdate = true));
  });
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, N]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.44, 0.5, 0.28]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.4, 0.14, 0.42]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, N]} geometry={armGeo} frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
}

function Arena() {
  const bowl = useMemo(() => {
    // stepped profile: six tiers of seating, then a back wall
    const pts: THREE.Vector2[] = [new THREE.Vector2(ARENA.r0, 0), new THREE.Vector2(ARENA.r0, 0.6)];
    for (let i = 0; i < 6; i++) {
      const r = ARENA.r0 + i * 0.95;
      pts.push(new THREE.Vector2(r + 0.95, 0.6 + i * 0.6), new THREE.Vector2(r + 0.95, 1.2 + i * 0.6));
    }
    pts.push(new THREE.Vector2(ARENA.r1, 4.4), new THREE.Vector2(ARENA.r1 + 0.3, 4.4), new THREE.Vector2(ARENA.r1 + 0.3, 0));
    return new THREE.LatheGeometry(pts, 96, ARENA.gapHalf, Math.PI * 2 - ARENA.gapHalf * 2);
  }, []);
  const canopy = useMemo(
    () => new THREE.LatheGeometry([new THREE.Vector2(ARENA.r1 + 0.4, 6.2), new THREE.Vector2(ARENA.r1 - 3.2, 6.9)], 96, ARENA.gapHalf, Math.PI * 2 - ARENA.gapHalf * 2),
    []
  );
  const seatMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9ced6", roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }), []);
  const cols = useMemo(() => Array.from({ length: 14 }, (_, i) => ARENA.gapHalf + 0.1 + (i / 13) * (Math.PI * 2 - ARENA.gapHalf * 2 - 0.2)), []);
  return (
    <ZoneGroup id="arena">
      {/* pitch with mowing stripes and a running track */}
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ARENA.r0, 64]} />
        <meshStandardMaterial color="#c4553a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ARENA.r0 - 1.3, 64]} />
        <meshStandardMaterial color="#4fae55" roughness={0.9} />
      </mesh>
      {[-4, -2, 0, 2, 4].map((x) => (
        <mesh key={x} position={[x, 0.075, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1, Math.sqrt(Math.max(0, (ARENA.r0 - 1.3) ** 2 - x * x)) * 2 - 0.2]} />
          <meshStandardMaterial color="#5cbc60" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.4, 2.55, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh geometry={bowl} material={seatMat} castShadow receiveShadow />
      <mesh geometry={canopy} material={roofMat} castShadow />
      {cols.map((a) => (
        <mesh key={a} position={[Math.sin(a) * (ARENA.r1 + 0.15), 5.3, Math.cos(a) * (ARENA.r1 + 0.15)]} material={M.metal}>
          <cylinderGeometry args={[0.12, 0.15, 2, 8]} />
        </mesh>
      ))}
      <Crowd />
      <Trophy />
      {/* on the plot's front lawn, clear of the stands and of the ring road's sidewalk */}
      <Billboard id="arena" pos={[-11.5, 0, 12.5]} rotY={0.7} />
    </ZoneGroup>
  );
}

// A light procedural F450-style quad (the old CAD GLB was ~350k vertices per copy and its props
// were merged into the frame, so they could never spin). Sized so scale 5.5 spans ~2 m.
const QMAT = {
  frame: new THREE.MeshStandardMaterial({ color: "#20242b", roughness: 0.55, metalness: 0.3 }),
  arm: new THREE.MeshStandardMaterial({ color: "#e8452c", roughness: 0.5, metalness: 0.1 }),
  motor: new THREE.MeshStandardMaterial({ color: "#9aa3ad", roughness: 0.3, metalness: 0.8 }),
  prop: new THREE.MeshStandardMaterial({ color: "#111418", roughness: 0.6 }),
  blur: new THREE.MeshBasicMaterial({ color: "#c9d2dc", transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  ledF: new THREE.MeshStandardMaterial({ color: "#1dff7a", emissive: "#1dff7a", emissiveIntensity: 2 }),
  ledB: new THREE.MeshStandardMaterial({ color: "#ff2d2d", emissive: "#ff2d2d", emissiveIntensity: 2 }),
  bat: new THREE.MeshStandardMaterial({ color: "#2d5bff", roughness: 0.6 }),
};

export function Quad({ scale = 5.5, spin = 1 }: { scale?: number; spin?: number }) {
  const props = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    // alternate spin directions, like a real X-quad
    props.current.forEach((p, i) => p && (p.rotation.y += dt * 38 * spin * (i % 3 === 0 ? 1 : -1)));
  });
  const k = scale / 5.5;
  const arm = 0.82;
  return (
    <group scale={k}>
      {/* body: bottom plate, top plate, battery, flight controller */}
      <mesh position={[0, 0.2, 0]} material={QMAT.frame} castShadow>
        <boxGeometry args={[0.55, 0.05, 0.55]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={QMAT.frame} castShadow>
        <boxGeometry args={[0.48, 0.04, 0.48]} />
      </mesh>
      <mesh position={[0, 0.43, 0]} material={QMAT.bat} castShadow>
        <boxGeometry args={[0.36, 0.14, 0.16]} />
      </mesh>
      <mesh position={[0, 0.27, 0]} material={QMAT.motor}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
      </mesh>
      {/* landing gear */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 0.26, 0.08, 0]} rotation-z={sx * 0.35} material={QMAT.frame}>
            <boxGeometry args={[0.03, 0.26, 0.03]} />
          </mesh>
          <mesh position={[sx * 0.31, -0.03, 0]} rotation-x={Math.PI / 2} material={QMAT.frame}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * arm,
          z = Math.sin(a) * arm;
        return (
          <group key={i}>
            <mesh position={[x / 2, 0.27, z / 2]} rotation-y={-a} material={QMAT.arm} castShadow>
              <boxGeometry args={[arm, 0.05, 0.08]} />
            </mesh>
            <mesh position={[x, 0.33, z]} material={QMAT.motor} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 14]} />
            </mesh>
            <mesh position={[x * 1.03, 0.22, z * 1.03]} material={i === 0 || i === 1 ? QMAT.ledF : QMAT.ledB}>
              <sphereGeometry args={[0.03, 8, 6]} />
            </mesh>
            <group position={[x, 0.41, z]} ref={(el) => void (props.current[i] = el!)}>
              <mesh material={QMAT.prop} castShadow>
                <boxGeometry args={[0.6, 0.012, 0.055]} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} material={QMAT.blur}>
                <circleGeometry args={[0.31, 24]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* Swarm Field: six TurtleBot-style robots covering a 16x16 grid with frontier targets, a separation
   (CBF-like) filter and comm links; one robot fails mid-run and reboots, the rest re-plan. */
const SW_G = 16,
  SW_S = 0.9;
const SW_COLS = ["#12f0c0", "#2d5bff", "#ffd23f", "#ff7ac6", "#9b7bff", "#ff8a3d"];
function Swarm() {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const bots = useRef<THREE.Group>(null);
  const lidars = useRef<(THREE.Mesh | null)[]>([]);
  const links = useRef<THREE.LineSegments>(null);
  const seen = useRef(new Float32Array(SW_G * SW_G));
  const st = useRef(
    SW_COLS.map((_, i) => ({ x: (i - 2.5) * 1.1, z: SW_G * SW_S * 0.45, tx: 0, tz: 0, alive: true, down: 0 }))
  );
  const runT = useRef(0);
  const c = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color("#2a3340"), []);
  const mint = useMemo(() => new THREE.Color("#12f0c0"), []);
  const half = (SW_G * SW_S) / 2;
  const cell = (i: number) => [(i % SW_G) * SW_S - half + SW_S / 2, Math.floor(i / SW_G) * SW_S - half + SW_S / 2] as const;
  const linkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(15 * 2 * 3), 3));
    return g;
  }, []);
  const hud = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 256;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.9 }) };
  }, []);
  const ff = useMemo(() => fontFamily(), []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < SW_G * SW_G; i++) {
      const [x, z] = cell(i);
      m.makeTranslation(x, 0.07, z);
      tiles.current!.setMatrixAt(i, m);
      tiles.current!.setColorAt(i, base);
    }
    tiles.current!.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);
  const pick = (b: (typeof st.current)[number]) => {
    let best = -1,
      bd = 1e9;
    for (let i = 0; i < seen.current.length; i++) {
      if (seen.current[i] > 0.5) continue;
      const [x, z] = cell(i);
      let d = Math.hypot(x - b.x, z - b.z);
      for (const o of st.current) if (o !== b && o.alive) d += 6 / (0.3 + Math.hypot(x - o.tx, z - o.tz));
      if (d < bd) (bd = d), (best = i);
    }
    if (best >= 0) [b.tx, b.tz] = cell(best);
  };
  const acc = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    dt = Math.min(dt, 0.05);
    runT.current += dt;
    const S = st.current;
    // failure injection 9 s into each run; the robot reboots 6 s later
    if (runT.current > 9 && S[2].alive && S[2].down === 0) (S[2].alive = false), (S[2].down = 6);
    if (!S[2].alive && (S[2].down -= dt) <= 0) (S[2].alive = true), (S[2].down = -1);
    let cov = 0;
    for (const v of seen.current) cov += v > 0.5 ? 1 : 0;
    if (cov / seen.current.length > 0.97) {
      seen.current.fill(0);
      runT.current = 0;
      S.forEach((b) => (b.down = 0));
    }
    S.forEach((b, i) => {
      if (!b.alive) return;
      const dx = b.tx - b.x,
        dz = b.tz - b.z,
        d = Math.hypot(dx, dz);
      let sx = 0,
        sz = 0;
      for (const o of S) {
        if (o === b) continue;
        const q = Math.hypot(b.x - o.x, b.z - o.z);
        if (q < 1.2 && q > 1e-3) (sx += (b.x - o.x) / q), (sz += (b.z - o.z) / q);
      }
      if (d < 0.15 || (b.tx === 0 && b.tz === 0)) pick(b);
      else {
        b.x += ((dx / d) * 1.4 + sx * 0.9) * dt;
        b.z += ((dz / d) * 1.4 + sz * 0.9) * dt;
      }
      b.x = Math.max(-half, Math.min(half, b.x));
      b.z = Math.max(-half, Math.min(half, b.z));
      const ci = Math.floor((b.x + half) / SW_S) + Math.floor((b.z + half) / SW_S) * SW_G;
      for (let oz = -1; oz <= 1; oz++)
        for (let ox = -1; ox <= 1; ox++) {
          const k = ci + ox + oz * SW_G;
          if (k >= 0 && k < seen.current.length) seen.current[k] = Math.min(1, seen.current[k] + dt * (ox || oz ? 1.3 : 3));
        }
      const g = bots.current?.children[i];
      if (g) {
        g.position.set(b.x, 0.08, b.z);
        g.scale.setScalar(1.5);
        if (d > 0.05) g.rotation.y = Math.atan2(dx, dz);
      }
      const l = lidars.current[i];
      if (l) l.rotation.y = t * 9;
    });
    // a fallen robot flashes red and sits still
    bots.current?.children.forEach((g, i) => {
      const body = g.children[0] as THREE.Mesh;
      (body.material as THREE.MeshStandardMaterial).emissiveIntensity = S[i].alive ? 0.25 + world.night : 0.6 + Math.abs(Math.sin(t * 8)) * 2;
      (body.material as THREE.MeshStandardMaterial).emissive.set(S[i].alive ? SW_COLS[i] : "#ff2d2d");
    });
    // comm links between robots within 5 m
    const pos = linkGeo.attributes.position.array as Float32Array;
    let n = 0;
    for (let i = 0; i < S.length; i++)
      for (let j = i + 1; j < S.length; j++) {
        const ok = S[i].alive && S[j].alive && Math.hypot(S[i].x - S[j].x, S[i].z - S[j].z) < 5;
        pos.set(ok ? [S[i].x, 0.55, S[i].z, S[j].x, 0.55, S[j].z] : [0, -9, 0, 0, -9, 0], n * 6);
        n++;
      }
    linkGeo.attributes.position.needsUpdate = true;
    if (tiles.current?.instanceColor) {
      for (let i = 0; i < SW_G * SW_G; i++) {
        tiles.current.getColorAt(i, c);
        c.lerp(seen.current[i] > 0.5 ? mint : base, Math.min(dt * 4, 1));
        tiles.current.setColorAt(i, c);
      }
      tiles.current.instanceColor.needsUpdate = true;
    }
    hud.mat.emissiveIntensity = 0.7 + world.night * 1.1;
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      const x = hud.cv.getContext("2d")!;
      x.fillStyle = "#060b16";
      x.fillRect(0, 0, 512, 256);
      x.fillStyle = "#12f0c0";
      x.fillRect(0, 0, 512, 6);
      x.font = `700 22px ${ff}`;
      x.fillText("MARS · GROUND STATION", 20, 40);
      x.fillStyle = "#ffffff";
      x.font = `800 72px ${ff}`;
      x.fillText(`${Math.round((cov / seen.current.length) * 100)}%`, 20, 130);
      x.font = `500 22px ${ff}`;
      x.fillStyle = "rgba(255,255,255,.65)";
      x.fillText(`coverage · ${S.filter((b) => b.alive).length}/6 robots up`, 20, 170);
      x.fillStyle = S[2].alive ? "#12f0c0" : "#ff4d5e";
      x.font = `700 22px ${ff}`;
      x.fillText(S[2].alive ? (S[2].down < 0 ? "R3 rebooted · rejoined" : "all robots nominal") : "R3 LOST · re-planning", 20, 222);
      hud.tex.needsUpdate = true;
    }
  });
  const botMats = useMemo(() => SW_COLS.map((col) => new THREE.MeshStandardMaterial({ color: "#f2f4f7", emissive: col, emissiveIntensity: 0.3, roughness: 0.5 })), []);
  return (
    <ZoneGroup id="swarm">
      <mesh position={[0, 0.03, 0]} material={M.dark} receiveShadow>
        <boxGeometry args={[SW_G * SW_S + 0.8, 0.06, SW_G * SW_S + 0.8]} />
      </mesh>
      <instancedMesh ref={tiles} args={[undefined, undefined, SW_G * SW_G]} receiveShadow frustumCulled={false}>
        <boxGeometry args={[SW_S * 0.9, 0.04, SW_S * 0.9]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <lineSegments ref={links} geometry={linkGeo} frustumCulled={false}>
        <lineBasicMaterial color="#7ff7dc" transparent opacity={0.7} />
      </lineSegments>
      <group ref={bots}>
        {SW_COLS.map((col, i) => (
          <group key={i}>
            {/* TurtleBot3-style stack: base, two decks on standoffs, a spinning LiDAR */}
            <mesh position={[0, 0.12, 0]} material={botMats[i]} castShadow>
              <cylinderGeometry args={[0.3, 0.32, 0.16, 20]} />
            </mesh>
            {[0.28, 0.42].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={M.dark}>
                <cylinderGeometry args={[0.28, 0.28, 0.03, 20]} />
              </mesh>
            ))}
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} position={[Math.cos(k * 1.57 + 0.78) * 0.2, 0.32, Math.sin(k * 1.57 + 0.78) * 0.2]} material={M.metal}>
                <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
              </mesh>
            ))}
            <mesh ref={(el) => void (lidars.current[i] = el)} position={[0, 0.5, 0]} material={M.dark}>
              <cylinderGeometry args={[0.09, 0.1, 0.1, 12]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[sx * 0.3, 0.08, 0]} rotation-z={Math.PI / 2} material={M.dark}>
                <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
              </mesh>
            ))}
            <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.58, 0.63, 32]} />
              <meshBasicMaterial color={col} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* ground-station screen */}
      <group position={[half + 1.6, 0, 0]} rotation-y={-Math.PI / 2 + 0.5}>
        <mesh position={[0, 1, 0]} material={M.metal}>
          <boxGeometry args={[0.12, 2, 0.12]} />
        </mesh>
        <mesh position={[0, 2.4, 0.05]} material={hud.mat}>
          <planeGeometry args={[2.6, 1.3]} />
        </mesh>
        <mesh position={[0, 2.4, 0]} material={M.dark}>
          <boxGeometry args={[2.75, 1.45, 0.06]} />
        </mesh>
      </group>
      <SwarmFence half={half + 1.1} />
      <Billboard id="swarm" pos={[7, 0, half + 3]} rotY={-0.4} />
    </ZoneGroup>
  );
}

/** A square safety fence round the test grid: posts every ~2 m, two rails and a kick board,
 *  with a 4 m gate in the side facing HQ (+z). */
function SwarmFence({ half }: { half: number }) {
  const runs = useMemo(() => {
    const G = 2; // gate half-width
    const out: { a: [number, number]; b: [number, number] }[] = [
      { a: [-half, -half], b: [half, -half] },
      { a: [half, -half], b: [half, half] },
      { a: [-half, half], b: [-half, -half] },
      { a: [half, half], b: [G, half] },
      { a: [-G, half], b: [-half, half] },
    ];
    return out.map(({ a, b }) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(len / 2));
      return { a, b, len, n, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number], yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    });
  }, [half]);
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffd23f", roughness: 0.5, metalness: 0.3 }), []);
  return (
    <group>
      {runs.map((r, i) => (
        <group key={i}>
          {Array.from({ length: r.n + 1 }, (_, k) => {
            const t = k / r.n;
            return (
              <mesh key={k} position={[r.a[0] + (r.b[0] - r.a[0]) * t, 0.55, r.a[1] + (r.b[1] - r.a[1]) * t]} material={M.metal} castShadow>
                <boxGeometry args={[0.1, 1.1, 0.1]} />
              </mesh>
            );
          })}
          <group position={[r.mid[0], 0, r.mid[1]]} rotation-y={r.yaw}>
            <Solid w={0.3} d={r.len} />
            {[0.55, 1.0].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={rail} castShadow>
                <boxGeometry args={[0.06, 0.07, r.len]} />
              </mesh>
            ))}
            <mesh position={[0, 0.12, 0]} material={M.dark}>
              <boxGeometry args={[0.04, 0.2, r.len]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* Ropeway Ridge: a multi-span gondola from the valley station over three coastal peaks. */
const RW_GLB = "/models/ropeway.glb";
useGLTF.preload(RW_GLB, false, true);
function Ropeway() {
  const z = zoneById.ropeway;
  const [vx, vz] = zonePos(z);
  const [tx, tz] = ridgeTop();
  // stations: valley, ridge, then the two outer peaks
  const stops = useMemo(() => {
    const pts: [number, number][] = [[vx, vz], [tx, tz], ...ROPE_PEAKS.map(([x, zz]) => [x, zz] as [number, number])];
    return pts.map(([x, zz], i) => new THREE.Vector3(x, heightAt(x, zz) + (i === 0 ? 4 : 4.6), zz));
  }, [vx, vz, tx, tz]);
  // one continuous line with a catenary sag in every span, so cabins ride straight through the stations
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s < stops.length - 1; s++) {
      const A = stops[s],
        B = stops[s + 1];
      const sag = A.distanceTo(B) * 0.055;
      for (let i = s ? 1 : 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(A.clone().lerp(B, t).setY(A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * sag));
      }
    }
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [stops]);
  const side = useMemo(() => {
    const d = stops[stops.length - 1].clone().sub(stops[0]);
    return new THREE.Vector3(d.z, 0, -d.x).normalize().multiplyScalar(1.1);
  }, [stops]);
  const cables = useMemo(
    () =>
      [-1, 1].map((sgn) => {
        const off = side.clone().multiplyScalar(sgn);
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(220).map((p) => p.clone().add(off))), 440, 0.05, 5);
      }),
    [curve, side]
  );
  // a lattice tower at the middle of every long span
  const towers = useMemo(() => {
    const out: { p: THREE.Vector3; g: number; yaw: number }[] = [];
    for (let s = 0; s < stops.length - 1; s++) {
      const A = stops[s],
        B = stops[s + 1];
      const L = A.distanceTo(B);
      const n = L > 24 ? 1 : 0;
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const p = A.clone().lerp(B, t);
        p.y = A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * L * 0.055 + 0.4;
        out.push({ p, g: heightAt(p.x, p.z), yaw: Math.atan2(B.x - A.x, B.z - A.z) });
      }
    }
    return out;
  }, [stops]);
  const cabins = useRef<THREE.Group>(null);
  const tan = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cabins.current?.children.forEach((cab, i) => {
      const up = i % 2 === 0;
      const k = (((t * 0.012 + i * 0.1) % 1) + 1) % 1;
      const u = up ? k : 1 - k;
      const p = curve.getPointAt(u).add(side.clone().multiplyScalar(up ? -1 : 1));
      cab.position.set(p.x, p.y, p.z);
      curve.getTangentAt(u, tan);
      cab.rotation.y = Math.atan2(tan.x, tan.z);
      cab.rotation.z = Math.sin(t * 1.3 + i) * 0.03; // a little sway
    });
  });
  const { scene: rwScene } = useGLTF(RW_GLB, false, true);
  const rw = useMemo(() => {
    const get = (n: string) => {
      const o = rwScene.getObjectByName(n)!.clone(true);
      o.position.set(0, 0, 0);
      o.traverse((m) => ((m as THREE.Mesh).isMesh ? (m.castShadow = true) : null));
      return o;
    };
    const cabin = get("RwCabin");
    return { tower: get("RwTower"), station: get("RwStation"), cabins: Array.from({ length: 10 }, () => cabin.clone(true)) };
  }, [rwScene]);
  return (
    <group>
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={M.dark} />
      ))}
      {/* towers, stations and cabins modelled in Blender (public/models/ropeway.glb) */}
      {towers.map(({ p, g, yaw }, i) => (
        <primitive key={i} object={rw.tower.clone(true)} position={[p.x, g, p.z]} rotation-y={yaw} scale={[1, (p.y - g) / 10.55, 1]} />
      ))}
      {stops.map((p, i) => {
        const nxt = stops[Math.min(i + 1, stops.length - 1)],
          prv = stops[Math.max(i - 1, 0)];
        const yaw = Math.atan2(nxt.x - prv.x, nxt.z - prv.z);
        const big = i === 0 || i === stops.length - 1;
        return <primitive key={`s${i}`} object={rw.station.clone(true)} position={[p.x, heightAt(p.x, p.z), p.z]} rotation-y={yaw} scale={big ? 1 : 0.8} />;
      })}
      <group ref={cabins}>
        {Array.from({ length: 10 }, (_, i) => (
          <primitive key={i} object={rw.cabins[i]} scale={0.8} />
        ))}
      </group>
      <ZoneGroup id="ropeway">
        <Billboard id="ropeway" pos={[-5.2, 0, 4.5]} rotY={0.5} />
      </ZoneGroup>
    </group>
  );
}

/* A walk-street trading wall: four instruments, AlgoTrade's real P&L, an equity curve and a ticker.
   The instrument prices are a simulated feed (clearly labelled); the AlgoTrade figures are from the
   SSRN papers and LinkedIn posts. */
const WALL_W = 1600,
  WALL_H = 800;
const INSTR = [
  { name: "NIFTY 50", base: 24300, vol: 0.0016, c: "#00e08a" },
  { name: "BANK NIFTY", base: 52100, vol: 0.002, c: "#2db5ff" },
  { name: "GOLD ₹/10g", base: 76400, vol: 0.0012, c: "#ffc93c" },
  { name: "USD / INR", base: 84.2, vol: 0.0005, c: "#c58bff" },
];
const EQUITY = [100, 104, 103, 111, 118, 114, 126, 139, 133, 148, 162, 158, 177, 196, 188, 212, 241, 233, 262, 289];

function Trading() {
  const c = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = WALL_W;
    cv.height = WALL_H;
    return cv;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [c]);
  const series = useRef(INSTR.map((q) => Array.from({ length: 60 }, (_, i) => q.base * (1 + Math.sin(i * 0.3 + q.base) * q.vol * 6))));
  const acc = useRef(0);
  const ff = useMemo(() => fontFamily(), []);
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.9 }), [tex]);
  useFrame(({ clock }, dt) => {
    acc.current += dt;
    screen.emissiveIntensity = 0.75 + world.night * 1.1;
    if (acc.current < 0.5) return;
    acc.current = 0;
    const t = clock.elapsedTime;
    const g = c.getContext("2d")!;
    g.fillStyle = "#03080a";
    g.fillRect(0, 0, WALL_W, WALL_H);
    // header
    g.fillStyle = "#0d1a16";
    g.fillRect(0, 0, WALL_W, 70);
    g.fillStyle = "#00e08a";
    g.font = `800 40px ${ff}`;
    g.fillText("ALGOTRADE · TRADING FLOOR", 28, 48);
    g.font = `600 22px ${ff}`;
    g.fillStyle = "#6f8f86";
    g.fillText("Instrument tiles: simulated feed, not live prices", 1050, 46);
    // instrument tiles
    INSTR.forEach((q, k) => {
      const s = series.current[k];
      s.push(s[s.length - 1] * (1 + (Math.random() - 0.48) * q.vol * 2));
      if (s.length > 60) s.shift();
      const x0 = 24 + k * 394,
        y0 = 90,
        w = 376,
        h = 250;
      g.fillStyle = "#08110f";
      g.fillRect(x0, y0, w, h);
      const last = s[s.length - 1],
        open = s[0],
        chg = ((last - open) / open) * 100;
      g.fillStyle = "#9fb3ad";
      g.font = `700 24px ${ff}`;
      g.fillText(q.name, x0 + 16, y0 + 34);
      g.fillStyle = "#ffffff";
      g.font = `800 40px ${ff}`;
      g.fillText(last.toLocaleString("en-IN", { maximumFractionDigits: q.base < 1000 ? 2 : 0 }), x0 + 16, y0 + 80);
      g.fillStyle = chg >= 0 ? "#00e08a" : "#ff4d5e";
      g.font = `700 24px ${ff}`;
      g.fillText(`${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}%`, x0 + w - 130, y0 + 80);
      const lo = Math.min(...s),
        hi = Math.max(...s);
      g.strokeStyle = q.c;
      g.lineWidth = 3;
      g.beginPath();
      s.forEach((v, i) => {
        const x = x0 + 14 + (i / 59) * (w - 28),
          y = y0 + h - 18 - ((v - lo) / (hi - lo || 1)) * 130;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
      g.lineTo(x0 + w - 14, y0 + h - 14);
      g.lineTo(x0 + 14, y0 + h - 14);
      g.fillStyle = q.c + "22";
      g.fill();
    });
    // P&L panel with the real backtest figures
    g.fillStyle = "#08110f";
    g.fillRect(24, 360, 560, 360);
    g.fillStyle = "#9fb3ad";
    g.font = `700 24px ${ff}`;
    g.fillText("STRATEGY P&L · WALK-FORWARD BACKTEST", 44, 400);
    const stats: [string, string, string][] = [
      ["CAGR", "40.2%", "#00e08a"],
      ["Sharpe", "1.68", "#00e08a"],
      ["Max drawdown", "−26.4%", "#ff4d5e"],
      ["Hypotheses rejected", "10", "#ffc93c"],
      ["Paper sessions", "60", "#2db5ff"],
    ];
    stats.forEach(([k, v, col], i) => {
      g.fillStyle = "#c9d6d2";
      g.font = `600 26px ${ff}`;
      g.fillText(k, 44, 452 + i * 52);
      g.fillStyle = col;
      g.font = `800 34px ${ff}`;
      g.fillText(v, 420, 452 + i * 52);
    });
    // equity curve: an illustrative shape, labelled as such on the wall
    g.fillStyle = "#08110f";
    g.fillRect(604, 360, 972, 360);
    g.fillStyle = "#9fb3ad";
    g.font = `700 24px ${ff}`;
    g.fillText("EQUITY CURVE · ILLUSTRATIVE, INDEXED TO 100", 624, 400);
    const reveal = Math.min(EQUITY.length, 2 + Math.floor((t * 1.5) % (EQUITY.length + 6)));
    g.strokeStyle = "#00e08a";
    g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i < reveal; i++) {
      const x = 640 + (i / (EQUITY.length - 1)) * 900,
        y = 690 - ((EQUITY[i] - 90) / 210) * 260;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = "#00e08a";
    g.font = `800 34px ${ff}`;
    g.fillText(`${EQUITY[reveal - 1]}`, 1460, 430);
    // ticker
    g.fillStyle = "#0d1a16";
    g.fillRect(0, 740, WALL_W, 60);
    g.fillStyle = "#b8ffe3";
    g.font = `600 28px ${ff}`;
    const tick = "MOMENTUM 12-1 BEATS XGBOOST RANKERS · SECTOR CAPS COST 8.6 PTS OF CAGR · HYSTERESIS BUFFER CUTS TURNOVER 51.7% · GATE E: PRODUCTION CLEARED · ";
    const off = (t * 90) % 1900;
    g.fillText(tick + tick, 20 - off, 782);
    tex.needsUpdate = true;
  });
  return (
    <ZoneGroup id="trading">
      {/* the exchange tower: glass floors between white slabs, the wall mounted on its podium */}
      <mesh position={[0, 8.5, -7]} material={M.white} castShadow receiveShadow>
        <boxGeometry args={[11, 17, 6]} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, 9.4 + i * 1.6, -3.98]} material={M.glass}>
          <boxGeometry args={[10.4, 1.0, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 17.2, -7]} material={M.metal}>
        <boxGeometry args={[11.4, 0.4, 6.4]} />
      </mesh>
      {/* the market wall at eye level: 16 x 8 m, bottom edge 0.9 m off the ground */}
      <mesh position={[0, 4.9, -3.6]} material={M.dark} castShadow>
        <boxGeometry args={[16.8, 8.8, 0.5]} />
      </mesh>
      <mesh position={[0, 4.9, -3.33]} material={screen} {...hoverHandlers("trading")}>
        <planeGeometry args={[16, 8]} />
      </mesh>
      {[-8.6, 8.6].map((x) => (
        <mesh key={x} position={[x, 4.4, -3.6]} material={M.dark} castShadow>
          <boxGeometry args={[0.6, 8.8, 0.9]} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, -3.2]} material={M.white} receiveShadow>
        <boxGeometry args={[17.6, 0.4, 1.4]} />
      </mesh>
      <Billboard id="trading" pos={[9.5, 0, 4.5]} rotY={-0.55} scale={0.85} />
    </ZoneGroup>
  );
}

/* A six-axis industrial arm (KUKA-style orange) running a pick-and-place loop with a crate. */
const ARM_KEYS: { t: number; j: [number, number, number, number, number]; grip: number; carry: boolean }[] = [
  // a1 yaw, a2 shoulder, a3 elbow, a5 wrist, a6 roll; grip 0 open .. 1 closed
  { t: 0, j: [0.9, -0.2, 1.0, 0.8, 0], grip: 0, carry: false },
  { t: 1.6, j: [0.9, 0.55, 0.65, 0.4, 0], grip: 0, carry: false }, // reach down to the crate
  { t: 2.2, j: [0.9, 0.55, 0.65, 0.4, 0], grip: 1, carry: true }, // grip
  { t: 3.6, j: [0.2, -0.35, 1.2, 0.7, 1.2], grip: 1, carry: true }, // lift and swing
  { t: 5.2, j: [-1.0, 0.45, 0.75, 0.45, 1.6], grip: 1, carry: true }, // over the pallet
  { t: 5.8, j: [-1.0, 0.45, 0.75, 0.45, 1.6], grip: 0, carry: false }, // release
  { t: 7.4, j: [-0.1, -0.2, 1.0, 0.8, 0.4], grip: 0, carry: false },
  { t: 8.6, j: [0.9, -0.2, 1.0, 0.8, 0], grip: 0, carry: false },
];
const ARM_GLB = "/models/robot-arm.glb";
useGLTF.preload(ARM_GLB, false, true);
/** The arm modelled in Blender (public/models/robot-arm.glb), joints J1-J6 driven here.
 *  Blender is Z-up: after glTF's Y-up conversion, its Y-axis joints turn about three's -Z. */
function IndustrialArm() {
  const { scene } = useGLTF(ARM_GLB, false, true);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
    return c;
  }, [scene]);
  const J = useMemo(() => Object.fromEntries(["J1", "J2", "J3", "J5", "J6", "FingerL", "FingerR"].map((n) => [n, model.getObjectByName(n)!])), [model]);
  const crate = useMemo(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshStandardMaterial({ color: "#12f0c0", roughness: 0.6 }));
    m.position.set(0.5, 0, 0);
    m.castShadow = true;
    J.J6?.add(m);
    return m;
  }, [J]);
  useFrame(({ clock }) => {
    const T = ARM_KEYS[ARM_KEYS.length - 1].t;
    const t = clock.elapsedTime % T;
    let k = 0;
    while (k < ARM_KEYS.length - 2 && t > ARM_KEYS[k + 1].t) k++;
    const A = ARM_KEYS[k],
      B = ARM_KEYS[k + 1];
    const u0 = (t - A.t) / (B.t - A.t || 1),
      u = u0 * u0 * (3 - 2 * u0);
    const j = A.j.map((v, i) => v + (B.j[i] - v) * u);
    const g = A.grip + (B.grip - A.grip) * u;
    J.J1.rotation.y = j[0];
    J.J2.rotation.z = -j[1];
    J.J3.rotation.z = -j[2];
    J.J5.rotation.z = -j[3];
    J.J6.rotation.x = j[4];
    J.FingerL.position.z = -(0.18 - g * 0.06);
    J.FingerR.position.z = 0.18 - g * 0.06;
    crate.visible = A.carry;
  });
  const led = useGlow("#12f0c0", 0.6, 3);
  return (
    <group>
      <primitive object={model} scale={0.72} />
      {/* safety fence and floor marking around the cell */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.6, 0.5, Math.sin(a) * 2.6]} material={M.metal}>
            <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} material={led}>
        <ringGeometry args={[2.5, 2.58, 4, 1, Math.PI / 4]} />
      </mesh>
    </group>
  );
}

const WS_GLB = "/models/workshop.glb";
useGLTF.preload(WS_GLB, false, true);
function Workshop() {
  const { scene: wsScene } = useGLTF(WS_GLB, false, true);
  const shed = useMemo(() => {
    const c = wsScene.clone(true);
    c.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = o.receiveShadow = true) : null));
    return c;
  }, [wsScene]);
  const crates = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 9 }, (_, i) => ({
      p: [-6 + (i % 3) * 1.15, 0.5 + Math.floor(i / 3) * 0.0, -4 + Math.floor(i / 3) * 1.15] as [number, number, number],
      s: 0.9 + r() * 0.15,
      c: ["#7a4dff", "#2d5bff", "#f7f8fa", "#12f0c0"][i % 4],
    }));
  }, []);
  return (
    <ZoneGroup id="workshop">
      {/* the makerspace, modelled in Blender (public/models/workshop.glb) */}
      <primitive object={shed} position={[3.8, 0, -4]} />
      <group position={[-1.5, 0, 1]} scale={1.15}>
        <IndustrialArm />
      </group>
      {crates.map((q, i) => (
        <mesh key={i} position={q.p} scale={q.s} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={q.c} roughness={0.6} />
        </mesh>
      ))}
      <Billboard id="workshop" pos={[9, 0, 6]} rotY={-0.5} scale={0.9} />
    </ZoneGroup>
  );
}

/* Research Library: a gothic hall modelled in Blender (public/models/library.glb). The six SSRN
   papers float in front of the doors like candles; hover one for its title, click to open. */
const LIB_GLB = "/models/library.glb";
useGLTF.preload(LIB_GLB, false, true);
function paperTexture(title: string, area: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 340;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbf6e9";
  g.fillRect(0, 0, 256, 340);
  g.fillStyle = area === "Quant" ? "#1d4ed8" : "#0f766e";
  g.fillRect(0, 0, 256, 10);
  g.fillStyle = "#1d2128";
  g.font = "700 20px serif";
  const words = title.split(":")[0].split(" ");
  let line = "",
    y = 52;
  for (const w of words) {
    if (g.measureText(line + w).width > 220) {
      g.fillText(line, 18, y);
      line = "";
      y += 26;
    }
    line += w + " ";
  }
  g.fillText(line, 18, y);
  g.fillStyle = "#9aa3ad";
  for (let i = 0; i < 9; i++) g.fillRect(18, y + 28 + i * 16, 220 - (i % 3) * 30, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/* Surface detail for the library GLB, which ships with flat colours: box-projected UVs and canvas
   textures for ashlar stone, slate, an oak plank door with iron straps and leaded stained glass. */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function noise(g: CanvasRenderingContext2D, w: number, h: number, cols: string[], n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
}
/** World-scale box projection: each triangle takes the plane its normal faces most. */
function boxUV(geo: THREE.BufferGeometry, metres: number) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const [u, w] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = u / metres;
      uv[(i + k) * 2 + 1] = w / metres;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
/** Fit 0..1 UVs over a mesh's front face (its two largest bounding-box axes). */
function fitUV(geo: THREE.BufferGeometry) {
  const g = geo.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const s = bb.getSize(new THREE.Vector3());
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const useZ = s.z > s.x; // window faces x or z
  for (let i = 0; i < p.count; i++) {
    const u = useZ ? (p.getZ(i) - bb.min.z) / (s.z || 1) : (p.getX(i) - bb.min.x) / (s.x || 1);
    uv[i * 2] = u;
    uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / (s.y || 1);
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
function libraryMaterials() {
  const stone = canvasTex(512, 512, (g) => {
    g.fillStyle = "#cfc7b6";
    g.fillRect(0, 0, 512, 512);
    noise(g, 512, 512, ["#c2b9a6", "#d9d2c3", "#b8ae9a"], 9000, 4);
    g.fillStyle = "#a39985";
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = (r * 512) / rows;
      g.fillRect(0, y, 512, 3);
      const off = r % 2 ? 0 : 64;
      for (let x = off; x < 512 + 128; x += 128) g.fillRect(x, y, 3, 512 / rows);
    }
  });
  const trim = canvasTex(256, 256, (g) => {
    g.fillStyle = "#e3dccb";
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, ["#d6cfbd", "#ece6d8"], 3000, 5);
  });
  const slate = canvasTex(256, 256, (g) => {
    g.fillStyle = "#3b4352";
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, ["#323946", "#465062", "#2c323d"], 3000, 6);
    g.fillStyle = "#232831";
    for (let r = 0; r < 8; r++) {
      g.fillRect(0, r * 32, 256, 2);
      for (let x = r % 2 ? 0 : 16; x < 256; x += 32) g.fillRect(x, r * 32, 2, 32);
    }
  });
  const door = canvasTex(
    256,
    512,
    (g) => {
      g.fillStyle = "#6b4022";
      g.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? "#74472a" : "#62391e";
        g.fillRect(i * 43, 0, 41, 512);
        g.fillStyle = "#3f2412";
        g.fillRect(i * 43 + 41, 0, 2, 512);
      }
      noise(g, 256, 512, ["#5a341b", "#7d5030"], 2500, 7);
      // iron straps with studs, and a ring handle
      g.fillStyle = "#24262a";
      for (const y of [90, 250, 410]) {
        g.fillRect(0, y, 256, 16);
        for (let x = 12; x < 256; x += 30) {
          g.beginPath();
          g.arc(x, y + 8, 4, 0, Math.PI * 2);
          g.fillStyle = "#4a4d52";
          g.fill();
          g.fillStyle = "#24262a";
        }
      }
      g.strokeStyle = "#2b2d31";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(200, 300, 18, 0, Math.PI * 2);
      g.stroke();
    },
    false
  );
  const glass = canvasTex(
    256,
    512,
    (g) => {
      const pal = ["#2c5fd6", "#c8312f", "#e7b43a", "#2f9a5c", "#7b3fb8", "#4fb3e0"];
      const r = rng(9);
      const cw = 32,
        ch = 40;
      for (let y = 0; y < 512; y += ch)
        for (let x = 0; x < 256; x += cw) {
          g.fillStyle = pal[Math.floor(r() * pal.length)];
          g.fillRect(x, y, cw, ch);
        }
      // a figure-ish medallion in the middle and lead came over everything
      g.fillStyle = "#f3d27a";
      g.beginPath();
      g.arc(128, 220, 60, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#c8312f";
      g.beginPath();
      g.arc(128, 220, 34, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#1b1d22";
      g.lineWidth = 5;
      for (let y = 0; y <= 512; y += ch) (g.beginPath(), g.moveTo(0, y), g.lineTo(256, y), g.stroke());
      for (let x = 0; x <= 256; x += cw) (g.beginPath(), g.moveTo(x, 0), g.lineTo(x, 512), g.stroke());
      g.lineWidth = 7;
      g.beginPath();
      g.arc(128, 220, 60, 0, Math.PI * 2);
      g.stroke();
      g.strokeRect(4, 4, 248, 504);
    },
    false
  );
  const rose = canvasTex(
    512,
    512,
    (g) => {
      const pal = ["#2c5fd6", "#c8312f", "#e7b43a", "#7b3fb8", "#2f9a5c"];
      g.fillStyle = "#1b1d22";
      g.fillRect(0, 0, 512, 512);
      for (let ring = 4; ring >= 1; ring--) {
        const R = ring * 60;
        for (let k = 0; k < 16; k++) {
          g.fillStyle = pal[(k + ring) % pal.length];
          g.beginPath();
          g.moveTo(256, 256);
          g.arc(256, 256, R, (k / 16) * Math.PI * 2 + 0.03, ((k + 1) / 16) * Math.PI * 2 - 0.03);
          g.fill();
        }
      }
      g.fillStyle = "#f3d27a";
      g.beginPath();
      g.arc(256, 256, 30, 0, Math.PI * 2);
      g.fill();
    },
    false
  );
  const mk = (map: THREE.Texture, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
  return {
    LibStone: { mat: mk(stone), uv: 3.2 },
    LibTrim: { mat: mk(trim), uv: 1.5 },
    LibSlate: { mat: mk(slate, { roughness: 0.6 }), uv: 1.6 },
    LibWood: { mat: mk(door, { roughness: 0.7 }), uv: 0 },
    LibGlass: { mat: mk(glass, { emissiveMap: glass, emissive: "#ffffff", emissiveIntensity: 0.4 }), uv: 0 },
    LibRose: { mat: mk(rose, { emissiveMap: rose, emissive: "#ffffff", emissiveIntensity: 0.4 }), uv: 0 },
  } as Record<string, { mat: THREE.MeshStandardMaterial; uv: number }>;
}

function Library() {
  const [hover, setHover] = useState<number | null>(null);
  const { scene } = useGLTF(LIB_GLB, false, true);
  const hall = useMemo(() => {
    const c = scene.clone(true);
    const mats = libraryMaterials();
    const glow = [mats.LibGlass.mat, mats.LibRose.mat];
    c.updateMatrixWorld(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      const q = mats[(m.material as THREE.Material).name];
      if (!q) return;
      if (q.uv) {
        // project in the hall's frame so the stone courses line up across separate meshes
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        const inv = m.matrixWorld.clone().invert();
        m.geometry = boxUV(g, q.uv).applyMatrix4(inv);
      } else m.geometry = fitUV(m.geometry);
      m.material = q.mat;
    });
    return { c, glow };
  }, [scene]);
  const sheets = useMemo(() => papers.map((p) => new THREE.MeshStandardMaterial({ map: paperTexture(p.title, p.area), emissive: "#ffcf7a", emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.9 })), []);
  const flames = useRef<THREE.Group>(null);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      n = world.night;
    hall.glow.forEach((m) => (m.emissiveIntensity = 0.4 + n * 2.2));
    sheets.forEach((m, i) => (m.emissiveIntensity = (hover === i ? 0.6 : 0.12) + n * 0.5));
    g.current?.children.forEach((s, i) => {
      s.position.y = 3.4 + (i % 3) * 0.7 + Math.sin(t * 0.9 + i) * 0.25;
      s.rotation.y = Math.sin(t * 0.4 + i) * 0.35;
      s.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.06;
    });
    flames.current?.children.forEach((f, i) => f.scale.setScalar(0.85 + Math.sin(t * 12 + i * 3) * 0.15));
  });
  return (
    <ZoneGroup id="library">
      <primitive object={hall.c} position={[0, 0, -6]} />
      <group ref={g}>
        {papers.map((p, i) => {
          const a = (i / (papers.length - 1) - 0.5) * 2.0;
          const x = Math.sin(a) * 5.2,
            z = 4.2 - Math.cos(a) * 1.4;
          return (
            <group key={p.id} position={[x, 4, z]}>
              <mesh
                material={sheets[i]}
                castShadow
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHover(i);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  setHover(null);
                  document.body.style.cursor = "";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUI({ open: "library" });
                }}
              >
                <planeGeometry args={[1.3, 1.72]} />
              </mesh>
              {hover === i && (
                <Html position={[0, 1.4, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                  <div className="w-64 rounded-xl border border-white/20 bg-neutral-900/90 p-3 text-white shadow-2xl backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-cyan-300">
                      {p.area} · {p.date}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold leading-snug">{p.title}</div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
      {/* candles on stands either side of the steps */}
      <group ref={flames}>
        {[-3.6, -2.2, 2.2, 3.6].map((x) => (
          <mesh key={x} position={[x, 1.55, 2.6]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshBasicMaterial color="#ffcf7a" />
          </mesh>
        ))}
      </group>
      {[-3.6, -2.2, 2.2, 3.6].map((x) => (
        <mesh key={x} position={[x, 0.7, 2.6]} material={M.dark}>
          <cylinderGeometry args={[0.05, 0.12, 1.4, 8]} />
        </mesh>
      ))}
      <Billboard id="library" pos={[7.5, 0, 7.5]} rotY={-0.45} scale={0.85} />
    </ZoneGroup>
  );
}

function rainTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, tex };
}

/* Morpheus Gate in projectmorpheus.in's own style: pixel-green CRT sign, a terminal kiosk and the
   five "levels" (domains) as monoliths. */
function crt(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return { c, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 1, color: "#000000" }) };
}
const LEVELS = ["EDTECH", "HEALTHCARE", "WOMEN SAFETY", "AGRITECH", "FINTECH"];
function MorpheusSigns() {
  const pix = useMemo(() => {
    const v = typeof document !== "undefined" ? getComputedStyle(document.body).getPropertyValue("--font-pixel").trim() : "";
    return v || "monospace";
  }, []);
  const sign = useMemo(() => crt(1024, 256), []);
  const term = useMemo(() => crt(512, 384), []);
  const lv = useMemo(() => LEVELS.map(() => crt(256, 512)), []);
  const scan = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = "rgba(0,0,0,.35)";
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  };
  useEffect(() => {
    let live = true;
    // the pixel font has to be loaded before it can be drawn into a canvas
    document.fonts
      .load(`20px ${pix}`)
      .catch(() => [])
      .then(() => live && paint());
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix]);
  const paint = () => {
    const g = sign.c.getContext("2d")!;
    g.fillStyle = "#020702";
    g.fillRect(0, 0, 1024, 256);
    g.font = `64px ${pix}`;
    g.fillStyle = "#0a5a14";
    g.fillText("PROJECT MORPHEUS", 46, 150);
    g.fillStyle = "#22ff4c";
    g.fillText("PROJECT MORPHEUS", 40, 144);
    g.font = `18px ${pix}`;
    g.fillStyle = "#ff2d2d";
    g.fillText("[SENTINEL] ACTIVE · SIT LONAVALA · FEB 26 2026", 40, 214);
    scan(g, 1024, 256);
    sign.tex.needsUpdate = true;
    lv.forEach((q, i) => {
      const x = q.c.getContext("2d")!;
      x.fillStyle = "#020702";
      x.fillRect(0, 0, 256, 512);
      x.strokeStyle = "#22ff4c";
      x.lineWidth = 6;
      x.strokeRect(10, 10, 236, 492);
      x.fillStyle = "#22ff4c";
      x.font = `20px ${pix}`;
      x.fillText(`LEVEL 0${i + 1}`, 30, 70);
      x.font = `16px ${pix}`;
      LEVELS[i].split(" ").forEach((w, k) => x.fillText(w, 30, 260 + k * 34));
      x.fillStyle = "rgba(34,255,76,.5)";
      x.font = `12px ${pix}`;
      x.fillText("> HOVER TO DECRYPT", 24, 470);
      scan(x, 256, 512);
      q.tex.needsUpdate = true;
    });
  };
  const acc = useRef(0);
  useFrame(({ clock }, dt) => {
    const n = world.night;
    sign.mat.emissiveIntensity = term.mat.emissiveIntensity = 0.9 + n * 1.2;
    lv.forEach((q) => (q.mat.emissiveIntensity = 0.7 + n * 1.2));
    acc.current += dt;
    if (acc.current < 0.12) return;
    acc.current = 0;
    const t = clock.elapsedTime;
    const line = "WAKE UP. BUILD THE FUTURE.";
    const k = Math.floor(t * 8) % (line.length + 16);
    const g = term.c.getContext("2d")!;
    g.fillStyle = "#020702";
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = "#22ff4c";
    g.font = `14px ${pix}`;
    g.fillText("oracle@morpheus:~$ ./wake.exe", 22, 44);
    g.font = `18px ${pix}`;
    g.fillText(line.slice(0, Math.min(k, line.length)) + (Math.floor(t * 2) % 2 ? "_" : " "), 22, 110);
    const stats: [string, string][] = [
      ["24", "HOURS"],
      ["5", "DOMAINS"],
      ["2L+", "PRIZES"],
    ];
    stats.forEach(([v, l], i) => {
      g.fillStyle = "#22ff4c";
      g.font = `30px ${pix}`;
      g.fillText(v, 22 + i * 165, 220);
      g.fillStyle = "rgba(34,255,76,.6)";
      g.font = `12px ${pix}`;
      g.fillText(l, 22 + i * 165, 250);
    });
    g.fillStyle = "#ff2d2d";
    g.font = `12px ${pix}`;
    g.fillText("RED PILL OR BLUE PILL?", 22, 330);
    scan(g, 512, 384);
    term.tex.needsUpdate = true;
  });
  return (
    <group>
      {/* the sign across the top of the arch */}
      <mesh position={[0, 5.4, -1]} material={sign.mat}>
        <planeGeometry args={[8, 2]} />
      </mesh>
      <mesh position={[0, 5.4, -1.06]} material={M.dark}>
        <boxGeometry args={[8.3, 2.25, 0.08]} />
      </mesh>
      {/* terminal kiosk */}
      <group position={[4.6, 0, 3.4]} rotation-y={-0.5}>
        <mesh position={[0, 0.6, 0]} material={M.dark} castShadow>
          <boxGeometry args={[1.6, 1.2, 0.8]} />
        </mesh>
        <mesh position={[0, 1.75, -0.1]} rotation-x={-0.2} material={term.mat}>
          <planeGeometry args={[2, 1.5]} />
        </mesh>
        <mesh position={[0, 1.75, -0.15]} rotation-x={-0.2} material={M.dark}>
          <boxGeometry args={[2.15, 1.65, 0.06]} />
        </mesh>
      </group>
      {/* the five levels */}
      {LEVELS.map((_, i) => {
        const a = ((-60 + i * 30) * Math.PI) / 180;
        const x = Math.sin(a) * 7.6,
          z = -Math.cos(a) * 7.6 - 1;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={-a}>
            <mesh position={[0, 1.6, 0]} material={M.dark} castShadow>
              <boxGeometry args={[1.5, 3.2, 0.5]} />
            </mesh>
            <mesh position={[0, 1.6, 0.26]} material={lv[i].mat}>
              <planeGeometry args={[1.4, 3.05]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Morpheus() {
  const { c, tex } = useMemo(rainTexture, []);
  const drops = useRef<number[]>(Array.from({ length: 16 }, () => Math.random() * 30));
  const acc = useRef(0);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 1.1, color: "#000000" }), [tex]);
  const arch = useGlow("#19e36b", 0.7, 3);
  const pills = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (pills.current) {
      pills.current.rotation.y += dt * 0.5;
      pills.current.position.y = 3 + Math.sin(clock.elapsedTime * 1.5) * 0.25;
    }
    acc.current += dt;
    if (acc.current < 0.07) return;
    acc.current = 0;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, 0, 256, 512);
    g.font = "bold 16px monospace";
    drops.current.forEach((y, i) => {
      g.fillStyle = Math.random() > 0.9 ? "#d6ffe6" : "#19e36b";
      g.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)), i * 16, y * 16);
      drops.current[i] = y * 16 > 512 && Math.random() > 0.95 ? 0 : y + 1;
    });
    tex.needsUpdate = true;
  });
  return (
    <ZoneGroup id="morpheus">
      <mesh position={[0, 0, -1]} rotation-z={0} material={arch} castShadow>
        <torusGeometry args={[4.2, 0.28, 12, 48, Math.PI]} />
      </mesh>
      {[-4.2, 4.2].map((x) => (
        <group key={x} position={[x, 0, -1]}>
          <mesh position={[0, 2.3, 0]} material={M.dark} castShadow>
            <boxGeometry args={[1.4, 4.6, 1.4]} />
          </mesh>
          {[0.71, -0.71].map((z) => (
            <mesh key={z} position={[0, 2.3, z]} rotation-y={z > 0 ? 0 : Math.PI} material={mat}>
              <planeGeometry args={[1.25, 4.4]} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={pills} position={[0, 3, -1]}>
        <mesh position={[-0.7, 0, 0]} rotation-z={1.2}>
          <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
          <meshStandardMaterial color="#ff2b2b" emissive="#ff2b2b" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.7, 0, 0]} rotation-z={-1.2}>
          <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
          <meshStandardMaterial color="#2b6bff" emissive="#2b6bff" emissiveIntensity={0.6} />
        </mesh>
      </group>
      <MorpheusSigns />
      <Billboard id="morpheus" pos={[0, 0, 5.5]} rotY={0} scale={0.85} />
    </ZoneGroup>
  );
}

/* Home: a modern two-storey Navi Mumbai house with a lit glazed ground floor, a cantilevered
   upper floor and balcony, solar panels and the black water tank on the roof, and coconut palms. */
function Palm({ x, z, h = 5.5, lean = 0.25 }: { x: number; z: number; h?: number; lean?: number }) {
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9a7652", roughness: 1 }), []);
  const frond = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3f9b46", roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), []);
  const segs = 6;
  return (
    <group position={[x, 0, z]} rotation-z={lean}>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / segs) * 1.2) * 0.25, (i + 0.5) * (h / segs), 0]} material={trunk} castShadow>
          <cylinderGeometry args={[0.16 - i * 0.012, 0.19 - i * 0.012, h / segs + 0.02, 7]} />
        </mesh>
      ))}
      <group position={[0.3, h, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} rotation={[0, (i / 8) * Math.PI * 2, 0.95]} position={[0, 0, 0]} material={frond} castShadow>
            <coneGeometry args={[0.35, 2.6, 4, 1, true]} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.22, -0.2, Math.sin(i * 2.1) * 0.22]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#6b5a2a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Home() {
  const win = useGlow("#ffd27a", 0.05, 2.4);
  const plaster = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f6f1e8", roughness: 0.85 }), []);
  const upper = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8d2c8", roughness: 0.8 }), []);
  const cladding = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a86b3c", roughness: 0.75 }), []);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2f36", roughness: 0.5, metalness: 0.4 }), []);
  const solar = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b2c5a", roughness: 0.25, metalness: 0.6 }), []);
  const lawn = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5fb85a", roughness: 1 }), []);
  const pot = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c46a3e", roughness: 0.9 }), []);
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b9a4a", roughness: 0.8, flatShading: true }), []);
  return (
    <ZoneGroup id="home">
      {/* front lawn and a stone path to the door */}
      <mesh position={[0, 0.03, -0.2]} rotation-x={-Math.PI / 2} material={lawn} receiveShadow>
        <planeGeometry args={[12, 3]} />
      </mesh>
      {[0.6, -0.4, -1.4].map((z) => (
        <mesh key={z} position={[0.2, 0.05, z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.38, 8]} />
          <meshStandardMaterial color="#cfc8bb" roughness={1} />
        </mesh>
      ))}
      <group position={[0, 0, -4.2]}>
        {/* ground floor */}
        <mesh position={[0, 1.6, 0]} material={plaster} castShadow receiveShadow>
          <boxGeometry args={[7.4, 3.2, 5]} />
        </mesh>
        {/* glazed front, lit from inside at night */}
        <mesh position={[0.9, 1.45, 2.49]} material={win}>
          <planeGeometry args={[4.6, 2.5]} />
        </mesh>
        <mesh position={[0.9, 1.45, 2.53]} material={M.glass}>
          <planeGeometry args={[4.6, 2.5]} />
        </mesh>
        {[-1.4, -0.25, 0.9, 2.05, 3.2].map((x) => (
          <mesh key={x} position={[x, 1.45, 2.56]} material={frame}>
            <boxGeometry args={[0.07, 2.55, 0.06]} />
          </mesh>
        ))}
        {/* wood-clad entrance with the front door */}
        <mesh position={[-2.6, 1.6, 2.52]} material={cladding}>
          <boxGeometry args={[2.2, 3.2, 0.06]} />
        </mesh>
        <mesh position={[-2.6, 1.1, 2.57]} material={frame}>
          <boxGeometry args={[1.0, 2.2, 0.05]} />
        </mesh>
        <mesh position={[-2.6, 3.05, 3.2]} material={upper} castShadow>
          <boxGeometry args={[2.4, 0.14, 1.4]} />
        </mesh>
        {[-3.5, -1.7].map((x) => (
          <mesh key={x} position={[x, 2.2, 2.62]} material={win}>
            <boxGeometry args={[0.16, 0.3, 0.1]} />
          </mesh>
        ))}
        {/* cantilevered upper floor */}
        <mesh position={[0.4, 4.65, 0.5]} material={upper} castShadow receiveShadow>
          <boxGeometry args={[8.2, 2.9, 5]} />
        </mesh>
        <mesh position={[0.4, 4.75, 3.01]} material={win}>
          <planeGeometry args={[6.8, 1.5]} />
        </mesh>
        {[-2.6, -0.9, 0.8, 2.5].map((x) => (
          <mesh key={x} position={[x + 0.4, 4.75, 3.04]} material={frame}>
            <boxGeometry args={[0.06, 1.55, 0.05]} />
          </mesh>
        ))}
        {/* vertical louvres on the side */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[4.55, 4.65, -1.4 + i * 0.6]} material={cladding}>
            <boxGeometry args={[0.08, 2.7, 0.22]} />
          </mesh>
        ))}
        {/* balcony with a glass rail and planters */}
        <mesh position={[0.4, 3.15, 3.8]} material={upper} castShadow>
          <boxGeometry args={[8.2, 0.2, 1.6]} />
        </mesh>
        <mesh position={[0.4, 3.75, 4.58]} material={M.glass}>
          <boxGeometry args={[8.2, 1, 0.04]} />
        </mesh>
        <mesh position={[0.4, 4.27, 4.58]} material={frame}>
          <boxGeometry args={[8.2, 0.05, 0.07]} />
        </mesh>
        {[-3, 3.6].map((x) => (
          <group key={x} position={[x, 3.25, 4.1]}>
            <mesh position={[0, 0.25, 0]} material={pot}>
              <cylinderGeometry args={[0.28, 0.22, 0.5, 10]} />
            </mesh>
            <mesh position={[0, 0.8, 0]} material={leaf}>
              <icosahedronGeometry args={[0.45, 0]} />
            </mesh>
          </group>
        ))}
        {/* roof: parapet, solar panels and the water tank */}
        <mesh position={[0.4, 6.2, 0.5]} material={plaster}>
          <boxGeometry args={[8.4, 0.25, 5.2]} />
        </mesh>
        {[-2.2, -0.6, 1.0].map((x) =>
          [-0.6, 1.0].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 6.65, z]} rotation-x={-0.35} material={solar} castShadow>
              <boxGeometry args={[1.4, 0.06, 1.1]} />
            </mesh>
          ))
        )}
        <mesh position={[3.2, 7.0, -0.8]} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.3, 14]} />
          <meshStandardMaterial color="#1c1f24" roughness={0.6} />
        </mesh>
        <mesh position={[3.2, 6.45, -0.8]} material={frame}>
          <boxGeometry args={[1.4, 0.2, 1.4]} />
        </mesh>
      </group>
      <Palm x={-5.6} z={-1.6} h={6.2} lean={0.18} />
      <Palm x={5.4} z={-2.4} h={5.4} lean={-0.22} />
      {/* bench + mailbox */}
      <mesh position={[-3.8, 0.45, 0.6]} material={M.wood} castShadow>
        <boxGeometry args={[2, 0.15, 0.6]} />
      </mesh>
      <mesh position={[3.4, 0.8, 1.0]} material={M.red} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.7]} />
      </mesh>
      <mesh position={[3.4, 0.4, 1.0]} material={M.dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
      </mesh>
      <Billboard id="home" pos={[6.5, 0, 5.6]} rotY={-0.35} scale={0.85} />
    </ZoneGroup>
  );
}

/* ---------------- street lamps on the ring road ---------------- */
function Lamps() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const glow = useGlow("#ffe3a1", 0.05, 3.2);
  const N = 40;
  useEffect(() => {
    const m = new THREE.Matrix4();
    const spokes = ZONES.filter((z) => z.radius).map((z) => Math.atan2(zonePos(z)[1], zonePos(z)[0]));
    let k = 0;
    for (let i = 0; i < N; i++) {
      // nudge lamps that would stand in a boulevard mouth along the kerb, clear of the crossing
      let a = (i / N) * Math.PI * 2;
      for (const sp of spokes) {
        const d = Math.atan2(Math.sin(a - sp), Math.cos(a - sp));
        if (Math.abs(d) * ROAD_R < 4.5) a = sp + Math.sign(d || 1) * (4.5 / ROAD_R);
      }
      // alternate sides, on the back edge of each sidewalk
      const rr = ROAD_R + (i % 2 ? -1 : 1) * (ROAD_HALF - 0.35);
      const x = Math.cos(a) * rr,
        z = Math.sin(a) * rr;
      const y = heightAt(x, z);
      m.makeTranslation(x, y + 1.3, z);
      poles.current!.setMatrixAt(k, m);
      m.makeTranslation(x, y + 2.7, z);
      bulbs.current!.setMatrixAt(k++, m);
    }
    poles.current!.instanceMatrix.needsUpdate = true;
    bulbs.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={poles} args={[undefined, undefined, N]} material={M.dark} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, N]} material={glow}>
        <sphereGeometry args={[0.18, 10, 8]} />
      </instancedMesh>
    </>
  );
}

/* ---------------- delivery drones between zones ---------------- */
function Couriers() {
  const g = useRef<THREE.Group>(null);
  const routes = useMemo(() => [0.9, 1.25, 1.6].map((s, i) => ({ r: 26 + i * 13, h: 15 + i * 2.5, s: 0.06 * s * (i % 2 ? -1 : 1), o: i * 2 })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((d, i) => {
      const q = routes[i];
      const a = t * q.s + q.o;
      d.position.set(Math.cos(a) * q.r, q.h + Math.sin(t * 1.3 + i) * 0.5, Math.sin(a) * q.r);
      d.rotation.y = -a + (q.s > 0 ? 0 : Math.PI);
    });
  });
  return (
    <group ref={g}>
      {routes.map((_, i) => (
        <group key={i} scale={0.55}>
          <group rotation-y={Math.PI / 4}>
            <Quad />
          </group>
        </group>
      ))}
    </group>
  );
}

export default function Landmarks() {
  return (
    <>
      <HQ />
      <Arena />
      <MarsYard />
      <Swarm />
      <Ropeway />
      <Trading />
      <Workshop />
      <Library />
      <Morpheus />
      <Home />
      <Lamps />
      <Couriers />
      {ZONES.map((z) => (
        <ZoneLabel key={z.id} id={z.id} y={z.id === "hq" ? 18 : z.id === "trading" ? 19 : 9} />
      ))}
    </>
  );
}
