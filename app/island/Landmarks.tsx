"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heightAt, ridgeTop, RIDGE_TOP, rng, ROAD_R } from "./terrain";
import { zoneById, zonePos, ZONES, type ZoneId } from "./zones";
import { setUI, TOUR, useUI, world } from "./store";
import { papers } from "@/lib/achievements";

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
function useGlow(color: string, day = 0.25, night = 2.2) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 }), [color, day]);
  useFrame(() => {
    m.emissiveIntensity = day + (night - day) * world.night;
  });
  return m;
}

function fontFamily() {
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
  return (
    <group ref={g} position={pos} rotation-y={rotY} scale={scale}>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.4, -0.32]} material={M.metal} castShadow>
          <boxGeometry args={[0.18, 2.8, 0.18]} />
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
function ZoneGroup({ id, children }: { id: ZoneId; children: React.ReactNode }) {
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

function HQ() {
  const dish = useRef<THREE.Group>(null);
  const ring = useGlow("#2d5bff", 0.4, 2.5);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.6;
  });
  return (
    <ZoneGroup id="hq">
      <mesh position={[0, 0.2, 0]} material={M.white} receiveShadow>
        <cylinderGeometry args={[6.2, 6.6, 0.4, 48]} />
      </mesh>
      <mesh position={[0, 0.4, 0]} material={M.glass}>
        <sphereGeometry args={[3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
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
      <Billboard id="hq" pos={[0, 0.4, 5.2]} rotY={0} scale={0.9} />
    </ZoneGroup>
  );
}

function Trophy() {
  const g = useRef<THREE.Group>(null);
  const cup = useMemo(() => {
    const pts = [
      [0, 0], [1.1, 0], [1.1, 0.25], [0.35, 0.4], [0.25, 1.4], [0.5, 1.7], [1.25, 2.1], [1.5, 3.4], [1.45, 3.5], [1.2, 2.3], [0, 2.1],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.35;
  });
  return (
    <group ref={g} position={[0, 2.2, 0]}>
      <mesh geometry={cup} material={M.gold} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.55, 2.7, 0]} rotation-y={s > 0 ? 0 : Math.PI} material={M.gold}>
          <torusGeometry args={[0.45, 0.09, 8, 24, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
}

function Arena() {
  const crops = useRef<THREE.InstancedMesh>(null);
  const N = 520;
  useEffect(() => {
    const m = new THREE.Matrix4();
    const r = rng(3);
    let i = 0;
    for (let row = 0; row < 13; row++)
      for (let k = 0; k < 40 && i < N; k++) {
        const x = -9.5 + k * 0.48 + (r() - 0.5) * 0.15;
        const z = -8 - row * 0.62;
        const s = 0.5 + r() * 0.35;
        m.makeScale(s, s * 1.6, s).setPosition(x, 0.35 * s + 0.1, z);
        crops.current!.setMatrixAt(i++, m);
      }
    crops.current!.count = i;
    crops.current!.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    if (crops.current) crops.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.004;
  });
  return (
    <ZoneGroup id="arena">
      {/* pitch */}
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[6.2, 48]} />
        <meshStandardMaterial color="#5cb85c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.4, 2.55, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* stands */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.7, 0]} rotation-x={-Math.PI / 2} material={i === 2 ? M.metal : M.white} castShadow receiveShadow>
          <torusGeometry args={[7 + i * 0.75, 0.42, 6, 64, Math.PI * 1.45]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]} material={M.white}>
        <cylinderGeometry args={[0.9, 1.1, 1.2, 24]} />
      </mesh>
      <Trophy />
      <instancedMesh ref={crops} args={[undefined, undefined, N]} castShadow>
        <sphereGeometry args={[0.32, 6, 5]} />
        <meshStandardMaterial color="#ffd21f" roughness={0.7} />
      </instancedMesh>
      <Billboard id="arena" pos={[0, 0, 9.2]} rotY={0} />
    </ZoneGroup>
  );
}

const QUAD = "/models/quad-f450.glb";
useGLTF.preload(QUAD, false, true);

function Quad({ scale = 5.5 }: { scale?: number }) {
  const { scene } = useGLTF(QUAD, false, true);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.metalness = 0.35;
          mat.roughness = 0.45;
        }
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} scale={scale} />;
}

/** A rotor blur disc so the props look like they're spinning. */
function PropDiscs({ r = 0.95, span = 1.15, y = 0.42 }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    g.current?.children.forEach((c, i) => (c.rotation.z += dt * (i % 2 ? 40 : -40)));
  });
  return (
    <group ref={g}>
      {[
        [span, span],
        [-span, span],
        [span, -span],
        [-span, -span],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.15, r, 24, 1, 0, Math.PI * 1.6]} />
          <meshBasicMaterial color="#1b1f26" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function MarsYard() {
  const quad = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const padRing = useGlow("#ff5a36", 0.6, 3);
  const rocks = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 22 }, () => ({
      p: [(r() - 0.5) * 15, 0.15, (r() - 0.5) * 13] as [number, number, number],
      s: 0.2 + r() * 0.55,
      rot: r() * 3,
    })).filter((q) => Math.hypot(q.p[0], q.p[2] - 1) > 3.6);
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // flight plan: take off, survey loop, land, rest
    const cyc = t % 22;
    let y = 0.55,
      x = 0,
      z = 1,
      yaw = 0;
    if (cyc < 3) y = 0.55 + (cyc / 3) * 4.5;
    else if (cyc < 15) {
      const a = ((cyc - 3) / 12) * Math.PI * 2;
      x = Math.sin(a) * 4.5;
      z = 1 + Math.cos(a) * 3.5 - 3.5;
      y = 5 + Math.sin(a * 2) * 0.6;
      yaw = -a;
    } else if (cyc < 18) y = 5 - ((cyc - 15) / 3) * 4.45;
    if (cyc >= 3 && cyc < 15) z += 3.5;
    if (quad.current) {
      quad.current.position.set(x, y, z);
      quad.current.rotation.y = yaw;
      quad.current.rotation.z = Math.sin(t * 2.1) * 0.04;
    }
    if (scan.current) {
      const k = (t % 2.2) / 2.2;
      scan.current.scale.setScalar(0.3 + k * 6);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55;
      scan.current.position.set(x, 0.12, z);
    }
  });
  return (
    <ZoneGroup id="marsyard">
      {/* landing pad */}
      <mesh position={[0, 0.1, 1]} material={M.dark} receiveShadow>
        <cylinderGeometry args={[2.4, 2.5, 0.2, 48]} />
      </mesh>
      <mesh position={[0, 0.21, 1]} rotation-x={-Math.PI / 2} material={padRing}>
        <ringGeometry args={[2.0, 2.18, 48]} />
      </mesh>
      {[
        [-0.55, 0, 0.18, 1.5],
        [0.55, 0, 0.18, 1.5],
        [0, 0, 1.1, 0.18],
      ].map(([x, , w, d], i) => (
        <mesh key={i} position={[x, 0.22, 1]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh ref={scan} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial color="#ff5a36" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <group ref={quad}>
        <group rotation-y={Math.PI / 4}>
          <Quad />
        </group>
      </group>
      {/* docking station */}
      <group position={[-5.2, 0, -3]}>
        <mesh position={[0, 0.8, 0]} material={M.white} castShadow>
          <boxGeometry args={[2.6, 1.6, 2.2]} />
        </mesh>
        <mesh position={[0, 1.75, 0]} rotation-z={0.25} material={M.metal} castShadow>
          <boxGeometry args={[3.0, 0.12, 2.4]} />
        </mesh>
        <mesh position={[0, 0.9, 1.12]} material={padRing}>
          <boxGeometry args={[1.6, 0.08, 0.02]} />
        </mesh>
      </group>
      {rocks.map((q, i) => (
        <mesh key={i} position={q.p} rotation={[q.rot, q.rot * 2, 0]} scale={q.s} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a3a1f" roughness={1} flatShading />
        </mesh>
      ))}
      <Billboard id="marsyard" pos={[4.6, 0, 6]} rotY={-0.5} />
    </ZoneGroup>
  );
}

function Swarm() {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const bots = useRef<THREE.Group>(null);
  const G = 12,
    S = 0.95;
  const covered = useRef(new Float32Array(G * G));
  const c = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color("#dfe7e3"), []);
  const mint = useMemo(() => new THREE.Color("#12f0c0"), []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        m.makeTranslation((i - G / 2 + 0.5) * S, 0.06, (j - G / 2 + 0.5) * S - 0.5);
        tiles.current!.setMatrixAt(i * G + j, m);
        tiles.current!.setColorAt(i * G + j, base);
      }
    tiles.current!.instanceMatrix.needsUpdate = true;
  }, [base]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const B = 4;
    const lanes = G / B; // each bot sweeps 3 columns, boustrophedon
    const period = 16;
    const k = (t % period) / period;
    if (k < 0.01) covered.current.fill(0);
    bots.current?.children.forEach((bot, b) => {
      const steps = lanes * G;
      const s = Math.min(k * 1.15, 0.999) * steps;
      const col = Math.floor(s / G);
      let row = s % G;
      if (col % 2) row = G - 1 - row;
      const gi = b * lanes + col;
      const gx = (gi - G / 2 + 0.5) * S;
      const gz = (row - G / 2 + 0.5) * S - 0.5;
      bot.position.set(gx, 0.2, gz);
      bot.rotation.y = col % 2 ? Math.PI : 0;
      covered.current[gi * G + Math.floor(row)] = 1;
    });
    if (tiles.current?.instanceColor) {
      for (let i = 0; i < G * G; i++) {
        const target = covered.current[i];
        tiles.current.getColorAt(i, c);
        c.lerp(target ? mint : base, Math.min(dt * 4, 1));
        tiles.current.setColorAt(i, c);
      }
      if (tiles.current.instanceColor) tiles.current.instanceColor.needsUpdate = true;
    }
  });
  const glow = useGlow("#12f0c0", 0.8, 3);
  return (
    <ZoneGroup id="swarm">
      <mesh position={[0, 0.03, -0.5]} material={M.dark} receiveShadow>
        <boxGeometry args={[G * S + 0.6, 0.06, G * S + 0.6]} />
      </mesh>
      <instancedMesh ref={tiles} args={[undefined, undefined, G * G]} receiveShadow>
        <boxGeometry args={[S * 0.9, 0.05, S * 0.9]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <group ref={bots}>
        {Array.from({ length: 4 }, (_, i) => (
          <group key={i}>
            <mesh material={M.white} castShadow>
              <cylinderGeometry args={[0.32, 0.36, 0.22, 20]} />
            </mesh>
            <mesh position={[0, 0.14, 0]} material={glow}>
              <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
            </mesh>
            {/* CBF safety halo */}
            <mesh position={[0, -0.08, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.62, 0.68, 32]} />
              <meshBasicMaterial color="#12f0c0" transparent opacity={0.6} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 8.6, 0.6, Math.sin(a) * 8.6 - 0.5]} material={M.metal} castShadow>
            <boxGeometry args={[0.14, 1.2, 0.14]} />
          </mesh>
        );
      })}
      <Billboard id="swarm" pos={[-5.5, 0, 7]} rotY={0.6} />
    </ZoneGroup>
  );
}

function Ropeway() {
  const z = zoneById.ropeway;
  const [vx, vz] = zonePos(z);
  const [tx, tz] = ridgeTop();
  const a = useMemo(() => new THREE.Vector3(vx, heightAt(vx, vz) + 3.2, vz), [vx, vz]);
  const b = useMemo(() => new THREE.Vector3(tx, heightAt(tx, tz) + 3.6, tz), [tx, tz]);
  const side = useMemo(() => new THREE.Vector3(b.z - a.z, 0, -(b.x - a.x)).normalize().multiplyScalar(0.9), [a, b]);
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 1.6; // sag
      pts.push(p);
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [a, b]);
  const cables = useMemo(
    () =>
      [-1, 1].map((s) => {
        const off = side.clone().multiplyScalar(s);
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(60).map((p) => p.clone().add(off))), 120, 0.035, 5);
      }),
    [curve, side]
  );
  const cabins = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cabins.current?.children.forEach((cab, i) => {
      const up = i % 2 === 0;
      const k = ((t * 0.035 + i * 0.25) % 1 + 1) % 1;
      const u = up ? k : 1 - k;
      const p = curve.getPointAt(u).add(side.clone().multiplyScalar(up ? -1 : 1));
      cab.position.set(p.x, p.y - 1.25, p.z);
      cab.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    });
  });
  const towers = [0.33, 0.66].map((t) => {
    const p = curve.getPointAt(t);
    const g = heightAt(p.x, p.z);
    return { p, g };
  });
  const lamp = useGlow("#ffe8a3", 0.1, 2.5);
  return (
    <group>
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={M.dark} />
      ))}
      {towers.map(({ p, g }, i) => (
        <group key={i} position={[p.x, g, p.z]} rotation-y={Math.atan2(b.x - a.x, b.z - a.z)}>
          <mesh position={[0, (p.y - g) / 2, 0]} material={M.metal} castShadow>
            <boxGeometry args={[0.45, p.y - g, 0.45]} />
          </mesh>
          <mesh position={[0, p.y - g, 0]} material={M.metal} castShadow>
            <boxGeometry args={[2.4, 0.2, 0.3]} />
          </mesh>
        </group>
      ))}
      {/* stations */}
      {[a, b].map((p, i) => (
        <group key={i} position={[p.x, heightAt(p.x, p.z), p.z]} rotation-y={Math.atan2(b.x - a.x, b.z - a.z)}>
          <mesh position={[0, 1.6, 0]} material={M.white} castShadow receiveShadow>
            <boxGeometry args={[4.2, 3.2, 3.2]} />
          </mesh>
          <mesh position={[0, 3.35, 0]} material={M.red} castShadow>
            <boxGeometry args={[4.8, 0.3, 4]} />
          </mesh>
          <mesh position={[0, 2.2, i ? -1.62 : 1.62]} material={lamp}>
            <boxGeometry args={[3, 0.6, 0.04]} />
          </mesh>
        </group>
      ))}
      <group ref={cabins}>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i}>
            <mesh position={[0, 1.15, 0]} material={M.dark}>
              <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
            </mesh>
            <mesh material={M.red} castShadow>
              <boxGeometry args={[0.95, 0.8, 0.95]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={M.glass}>
              <boxGeometry args={[0.98, 0.35, 0.98]} />
            </mesh>
          </group>
        ))}
      </group>
      <ZoneGroup id="ropeway">
        <Billboard id="ropeway" pos={[-5.2, 0, 4.5]} rotY={0.5} />
      </ZoneGroup>
    </group>
  );
}

function ledTexture() {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 384;
  return { c, tex: new THREE.CanvasTexture(c) };
}

function Trading() {
  const { c, tex } = useMemo(ledTexture, []);
  const series = useRef<number[]>([]);
  const acc = useRef(0);
  const ff = useMemo(() => fontFamily(), []);
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.9 }), [tex]);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    let v = 100;
    const r = rng(5);
    for (let i = 0; i < 40; i++) {
      v *= 1 + (r() - 0.45) * 0.05;
      series.current.push(v);
    }
  }, [tex]);
  useFrame(({ clock }, dt) => {
    acc.current += dt;
    screen.emissiveIntensity = 0.8 + world.night * 1.2;
    if (acc.current < 0.6) return;
    acc.current = 0;
    const s = series.current;
    s.push(s[s.length - 1] * (1 + (Math.random() - 0.44) * 0.045));
    if (s.length > 40) s.shift();
    const g = c.getContext("2d")!;
    g.fillStyle = "#04130d";
    g.fillRect(0, 0, 768, 384);
    g.strokeStyle = "rgba(0,255,170,0.08)";
    for (let y = 60; y < 384; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(768, y);
      g.stroke();
    }
    const lo = Math.min(...s) * 0.97,
      hi = Math.max(...s) * 1.02;
    const Y = (v: number) => 360 - ((v - lo) / (hi - lo)) * 270;
    for (let i = 1; i < s.length; i++) {
      const up = s[i] >= s[i - 1];
      g.fillStyle = up ? "#00e08a" : "#ff4d5e";
      const x = 20 + i * 18;
      const y1 = Y(s[i - 1]),
        y2 = Y(s[i]);
      g.fillRect(x, Math.min(y1, y2), 11, Math.max(3, Math.abs(y2 - y1)));
      g.fillRect(x + 5, Math.min(y1, y2) - 8, 1.5, Math.abs(y2 - y1) + 16);
    }
    g.fillStyle = "#00e08a";
    g.font = `700 34px ${ff}`;
    g.fillText("ALGOTRADE · NIFTY 500 MOMENTUM", 22, 46);
    g.font = `600 26px ${ff}`;
    g.fillStyle = "#b8ffe3";
    const t = clock.elapsedTime;
    const tick = "CAGR 40.2%   SHARPE 1.68   MAX DD −26.4%   10 HYPOTHESES REJECTED   60 PAPER SESSIONS   ";
    const off = (t * 60) % 900;
    g.fillText(tick + tick, 22 - off, 376);
    tex.needsUpdate = true;
  });
  return (
    <ZoneGroup id="trading">
      <mesh position={[0, 3, -1.5]} material={M.white} castShadow receiveShadow>
        <boxGeometry args={[9, 6, 4]} />
      </mesh>
      {[1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, i * 1.4 - 0.2, 0.52]} material={M.glass}>
          <boxGeometry args={[8.6, 0.6, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, 6.2, -1.5]} material={M.metal}>
        <boxGeometry args={[9.4, 0.3, 4.4]} />
      </mesh>
      {/* giant LED wall on the roof */}
      <mesh position={[0, 9.4, -1.2]} material={M.dark} castShadow>
        <boxGeometry args={[8.4, 4.4, 0.3]} />
      </mesh>
      <mesh position={[0, 9.4, -1.03]} material={screen} {...hoverHandlers("trading")}>
        <planeGeometry args={[8, 4]} />
      </mesh>
      <Billboard id="trading" pos={[0, 0, 6]} rotY={0} scale={0.85} />
    </ZoneGroup>
  );
}

function Workshop() {
  const arm = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);
  const j3 = useRef<THREE.Group>(null);
  const tip = useGlow("#7a4dff", 0.6, 3);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 0.6) * 1.2;
    if (j2.current) j2.current.rotation.z = -0.6 + Math.sin(t * 1.1) * 0.35;
    if (j3.current) j3.current.rotation.z = 1.1 + Math.sin(t * 1.3 + 1) * 0.4;
  });
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
      {/* sawtooth shed */}
      <group position={[3.5, 0, -3]}>
        <mesh position={[0, 1.8, 0]} material={M.white} castShadow receiveShadow>
          <boxGeometry args={[7, 3.6, 4.5]} />
        </mesh>
        {[-2.3, 0, 2.3].map((x) => (
          <mesh key={x} position={[x, 4.05, 0]} rotation-z={0.5} material={M.metal} castShadow>
            <boxGeometry args={[2.6, 0.12, 4.6]} />
          </mesh>
        ))}
        <mesh position={[0, 1.3, 2.26]} material={M.dark}>
          <boxGeometry args={[3, 2.6, 0.02]} />
        </mesh>
      </group>
      {/* robot arm */}
      <group position={[-1.5, 0, 1]}>
        <mesh position={[0, 0.3, 0]} material={M.dark} castShadow>
          <cylinderGeometry args={[0.7, 0.8, 0.6, 24]} />
        </mesh>
        <group ref={arm} position={[0, 0.6, 0]}>
          <mesh position={[0, 0.9, 0]} material={M.white} castShadow>
            <boxGeometry args={[0.45, 1.8, 0.45]} />
          </mesh>
          <group ref={j2} position={[0, 1.8, 0]}>
            <mesh material={M.dark}>
              <sphereGeometry args={[0.3, 16, 12]} />
            </mesh>
            <mesh position={[0.9, 0, 0]} material={M.white} castShadow>
              <boxGeometry args={[1.8, 0.35, 0.35]} />
            </mesh>
            <group ref={j3} position={[1.8, 0, 0]}>
              <mesh material={M.dark}>
                <sphereGeometry args={[0.24, 16, 12]} />
              </mesh>
              <mesh position={[0.6, 0, 0]} material={M.white} castShadow>
                <boxGeometry args={[1.2, 0.26, 0.26]} />
              </mesh>
              <mesh position={[1.25, 0, 0]} material={tip}>
                <sphereGeometry args={[0.16, 12, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {crates.map((q, i) => (
        <mesh key={i} position={q.p} scale={q.s} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={q.c} roughness={0.6} />
        </mesh>
      ))}
      <Billboard id="workshop" pos={[2.5, 0, 5.5]} rotY={-0.3} scale={0.9} />
    </ZoneGroup>
  );
}

function Library() {
  const [hover, setHover] = useState<number | null>(null);
  const glow = useGlow("#00d2ff", 0.2, 2.2);
  return (
    <ZoneGroup id="library">
      {papers.map((p, i) => {
        const a = (i / (papers.length - 1) - 0.5) * 2.2;
        const x = Math.sin(a) * 6,
          z = -Math.cos(a) * 6 + 2;
        const h = 4.4 + (i % 3) * 0.9;
        return (
          <group key={p.id} position={[x, 0, z]} rotation-y={-a}>
            <mesh
              position={[0, h / 2, 0]}
              material={M.metal}
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
              <boxGeometry args={[1.5, h, 0.45]} />
            </mesh>
            <mesh position={[0, h * 0.8, 0.23]} material={glow}>
              <boxGeometry args={[1.0, 0.06, 0.01]} />
            </mesh>
            {hover === i && (
              <Html position={[0, h + 0.8, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
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
      <Billboard id="library" pos={[0, 0, 6.6]} rotY={0} scale={0.85} />
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
      {[
        [-6.5, -5],
        [-3.5, -6.5],
        [3.5, -6.5],
        [6.5, -5],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.1, z]} material={M.white} castShadow>
          <coneGeometry args={[1.5, 2.2, 6]} />
        </mesh>
      ))}
      <Billboard id="morpheus" pos={[0, 0, 5.5]} rotY={0} scale={0.85} />
    </ZoneGroup>
  );
}

function Home() {
  const win = useGlow("#ffd27a", 0.05, 2.6);
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e86a6a", roughness: 0.7 }), []);
  return (
    <ZoneGroup id="home">
      <group position={[0, 0, -2.5]}>
        <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 3.2, 4.4]} />
          <meshStandardMaterial color="#fff4e2" roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.1, 0]} rotation-y={Math.PI / 4} material={roof} castShadow>
          <coneGeometry args={[4.6, 2.2, 4]} />
        </mesh>
        <mesh position={[0, 1.05, 2.21]} material={M.wood}>
          <boxGeometry args={[1.1, 2.1, 0.05]} />
        </mesh>
        {[-1.9, 1.9].map((x) => (
          <mesh key={x} position={[x, 1.9, 2.21]} material={win}>
            <boxGeometry args={[1.1, 0.9, 0.05]} />
          </mesh>
        ))}
        <mesh position={[1.6, 3.9, -0.6]} material={M.white} castShadow>
          <boxGeometry args={[0.6, 1.6, 0.6]} />
        </mesh>
      </group>
      {/* bench + mailbox */}
      <mesh position={[-3.5, 0.45, 2]} material={M.wood} castShadow>
        <boxGeometry args={[2, 0.15, 0.6]} />
      </mesh>
      <mesh position={[3.4, 0.8, 2.6]} material={M.red} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.7]} />
      </mesh>
      <mesh position={[3.4, 0.4, 2.6]} material={M.dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
      </mesh>
      <Billboard id="home" pos={[0, 0, 5.8]} rotY={0} scale={0.85} />
    </ZoneGroup>
  );
}

/* ---------------- street lamps on the ring road ---------------- */
function Lamps() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const glow = useGlow("#ffe3a1", 0.05, 3.2);
  const N = 28;
  useEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * (ROAD_R + 2.1),
        z = Math.sin(a) * (ROAD_R + 2.1);
      const y = heightAt(x, z);
      m.makeTranslation(x, y + 1.3, z);
      poles.current!.setMatrixAt(i, m);
      m.makeTranslation(x, y + 2.7, z);
      bulbs.current!.setMatrixAt(i, m);
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
  const routes = useMemo(() => [0.9, 1.25, 1.6].map((s, i) => ({ r: 18 + i * 9, h: 13 + i * 2.5, s: 0.08 * s * (i % 2 ? -1 : 1), o: i * 2 })), []);
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
          <PropDiscs />
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
        <ZoneLabel key={z.id} id={z.id} y={z.id === "hq" ? 18 : z.id === "trading" ? 13 : 9} />
      ))}
    </>
  );
}
