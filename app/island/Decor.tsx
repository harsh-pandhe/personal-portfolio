"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt, ISLAND_EDGE, rng, ROAD_R } from "./terrain";
import { zonePos, ZONES } from "./zones";

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

/** Fill an instanced mesh from a list of [x, y, z, yaw, sx, sy, sz]. */
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, list: number[][], colors?: string[]) {
  useEffect(() => {
    const im = ref.current;
    if (!im) return;
    const c = new THREE.Color();
    list.forEach((v, i) => {
      q.setFromAxisAngle(up, v[3]);
      m4.compose(new THREE.Vector3(v[0], v[1], v[2]), q, new THREE.Vector3(v[4], v[5], v[6]));
      im.setMatrixAt(i, m4);
      if (colors) im.setColorAt(i, c.set(colors[i % colors.length]));
    });
    im.count = list.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [ref, list, colors]);
}

/** Dashed centre line on the ring road. */
function RoadDashes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const out: number[][] = [];
    const N = 120;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * ROAD_R,
        z = Math.sin(a) * ROAD_R;
      out.push([x, heightAt(x, z) + 0.1, z, -a, 0.12, 0.02, 0.55]);
    }
    return out;
  }, []);
  useInstances(ref, list);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </instancedMesh>
  );
}

/** Benches and planters around every zone's plaza. */
function PlazaFurniture() {
  const seats = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const pots = useRef<THREE.InstancedMesh>(null);
  const blooms = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const s: number[][] = [],
      l: number[][] = [],
      p: number[][] = [],
      b: number[][] = [];
    for (const z of ZONES) {
      if (z.id === "ropeway" || z.id === "swarm") continue;
      const [zx, zz] = zonePos(z);
      const base = z.radius ? Math.atan2(zx, zz) : 0;
      for (const k of [-1, 1]) {
        // two benches either side of the approach road, facing the plaza
        const a = base + k * 0.9 + Math.PI;
        const bx = zx + Math.sin(a) * 6.2,
          bz = zz + Math.cos(a) * 6.2;
        const y = heightAt(bx, bz);
        s.push([bx, y + 0.45, bz, a, 1.7, 0.1, 0.5]);
        s.push([bx + Math.sin(a) * 0.22, y + 0.75, bz + Math.cos(a) * 0.22, a, 1.7, 0.45, 0.08]);
        for (const e of [-0.7, 0.7]) l.push([bx + Math.cos(a) * e, y + 0.22, bz - Math.sin(a) * e, a, 0.08, 0.45, 0.4]);
        // planters
        const pa = base + k * 1.5 + Math.PI;
        const px = zx + Math.sin(pa) * 5.4,
          pz = zz + Math.cos(pa) * 5.4;
        const py = heightAt(px, pz);
        p.push([px, py + 0.3, pz, 0, 0.9, 0.6, 0.9]);
        b.push([px, py + 0.75, pz, 0, 0.62, 0.42, 0.62]);
      }
    }
    return { s, l, p, b };
  }, []);
  useInstances(seats, data.s);
  useInstances(legs, data.l);
  useInstances(pots, data.p);
  useInstances(blooms, data.b, ["#ff8fb1", "#9b7bff", "#ffd23f", "#ff6b5b"]);
  return (
    <>
      <instancedMesh ref={seats} args={[undefined, undefined, data.s.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b07a4c" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, data.l.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2f36" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={pots} args={[undefined, undefined, data.p.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.42, 1, 12]} />
        <meshStandardMaterial color="#eef1f4" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={blooms} args={[undefined, undefined, data.b.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.8} flatShading />
      </instancedMesh>
    </>
  );
}

/** Flags on poles around the HQ plaza, one per zone colour, waving. */
function Flags() {
  const g = useRef<THREE.Group>(null);
  const flags = useMemo(() => ZONES.filter((z) => z.radius).map((z, i, arr) => ({ a: (i / arr.length) * Math.PI * 2 + 0.55, c: z.accent })), []);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.3, 0.75, 8, 1);
    g.translate(0.65, 0, 0);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(t * 4 - x * 3.2) * 0.12 * x);
    }
    pos.needsUpdate = true;
  });
  return (
    <group ref={g}>
      {flags.map((f, i) => {
        const x = Math.cos(f.a) * 7.4,
          z = Math.sin(f.a) * 7.4;
        const y = heightAt(x, z);
        return (
          <group key={i} position={[x, y, z]} rotation-y={-f.a}>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 4.4, 6]} />
              <meshStandardMaterial color="#d9dde3" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh geometry={geo} position={[0.04, 3.9, 0]}>
              <meshStandardMaterial color={f.c} side={THREE.DoubleSide} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Pebbles and boulders along the beach. */
function BeachRocks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const r = rng(303);
    const out: number[][] = [];
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = ISLAND_EDGE - 1 + r() * 5;
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d;
      const s = 0.25 + r() * r() * 1.2;
      out.push([x, heightAt(x, z) + s * 0.3, z, r() * 6, s * (1 + r() * 0.4), s * 0.7, s]);
    }
    return out;
  }, []);
  useInstances(ref, list);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#9aa29a" roughness={1} flatShading />
    </instancedMesh>
  );
}

/** A six-wheeled rover pottering around the Mars yard. */
function Rover() {
  const g = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const z = ZONES.find((zz) => zz.id === "marsyard")!;
  const [cx, cz] = zonePos(z);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * 0.22;
    const x = cx + Math.cos(t) * 5.8,
      zz = cz + Math.sin(t * 2) * 2.6;
    const nx = cx + Math.cos(t + 0.02) * 5.8,
      nz = cz + Math.sin((t + 0.02) * 2) * 2.6;
    if (g.current) {
      g.current.position.set(x, heightAt(x, zz) + 0.05, zz);
      g.current.rotation.y = Math.atan2(nx - x, nz - zz);
    }
    wheels.current?.children.forEach((w) => (w.rotation.x += dt * 3));
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.3, 1.3]} />
        <meshStandardMaterial color="#f2f3f5" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0.1]} castShadow>
        <boxGeometry args={[1.1, 0.04, 0.9]} />
        <meshStandardMaterial color="#1f3f8f" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0.5]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
        <meshStandardMaterial color="#2a2f36" />
      </mesh>
      <mesh position={[0, 1.38, 0.5]}>
        <boxGeometry args={[0.26, 0.14, 0.14]} />
        <meshStandardMaterial color="#2a2f36" />
      </mesh>
      <group ref={wheels}>
        {[-0.5, 0, 0.5].flatMap((zz) =>
          [-0.52, 0.52].map((x) => (
            <mesh key={`${x}${zz}`} position={[x, 0.2, zz]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.2, 0.2, 0.16, 12]} />
              <meshStandardMaterial color="#1b1f26" roughness={0.9} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

export default function Decor() {
  return (
    <>
      <RoadDashes />
      <PlazaFurniture />
      <Flags />
      <BeachRocks />
      <Rover />
    </>
  );
}
