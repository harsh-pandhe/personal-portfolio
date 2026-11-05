"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { world } from "../store";
import { Solid } from "../Props";
import { M, fontFamily, Billboard, ZoneGroup } from "./common";

/* Swarm Field: six TurtleBot-style robots covering a 16x16 grid with frontier targets, a separation
   (CBF-like) filter and comm links; one robot fails mid-run and reboots, the rest re-plan. */
const SW_G = 16,
  SW_S = 0.9;
const SW_COLS = ["#12f0c0", "#2d5bff", "#ffd23f", "#ff7ac6", "#9b7bff", "#ff8a3d"];
export function Swarm() {
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
