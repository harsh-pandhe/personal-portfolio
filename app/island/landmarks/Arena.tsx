"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARENA } from "../colliders";
import { heightAt, rng } from "../terrain";
import { zoneById, zonePos } from "../zones";
import { world } from "../store";
import { M, Billboard, ZoneGroup, fontFamily } from "./common";

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
  const here = useMemo(() => {
    const [x, z] = zonePos(zoneById.arena);
    return new THREE.Vector3(x, heightAt(x, z), z);
  }, []);
  useFrame(({ clock, camera }) => {
    // the wave is only animated while the stadium is close enough to see it
    if (camera.position.distanceTo(here) > 95) return;
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

export function Arena() {
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
  // the outside of the bowl: concrete fins, hanging banners in the zone colours and the name
  const facade = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#d9dbdf";
    g.fillRect(0, 0, 2048, 256);
    for (let x = 0; x < 2048; x += 64) {
      g.fillStyle = "#c3c6cb";
      g.fillRect(x, 0, 14, 256);
    }
    g.fillStyle = "#b8bcc2";
    g.fillRect(0, 226, 2048, 30);
    const cols = ["#2d5bff", "#ffd23f", "#ff5a36", "#12f0c0"];
    for (let k = 0; k < 8; k++) {
      const x = 90 + k * 250;
      g.fillStyle = cols[k % cols.length];
      g.fillRect(x, 20, 54, 150);
      g.beginPath();
      g.moveTo(x, 170);
      g.lineTo(x + 27, 196);
      g.lineTo(x + 54, 170);
      g.fill();
    }
    g.fillStyle = "#1d2128";
    g.font = `800 92px ${fontFamily()}`;
    g.fillText("THE ARENA", 760, 140);
    g.font = `600 30px ${fontFamily()}`;
    g.fillText("SMART INDIA HACKATHON 2025 · NATIONAL WINNERS", 640, 196);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  }, []);
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
      <mesh position={[0, 2.2, 0]} material={facade}>
        <cylinderGeometry args={[ARENA.r1 + 0.34, ARENA.r1 + 0.34, 4.4, 96, 1, true, ARENA.gapHalf, Math.PI * 2 - ARENA.gapHalf * 2]} />
      </mesh>
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
