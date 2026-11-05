"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt, ISLAND_EDGE, MARS_C, rng, ROAD_R } from "./terrain";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { zoneToWorld } from "./colliders";
import { Bench, Planter } from "./Props";

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
    const N = 160;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * ROAD_R,
        z = Math.sin(a) * ROAD_R;
      out.push([x, heightAt(x, z) + 0.09, z, -a, 0.15, 0.02, 1.4]);
    }
    return out;
  }, []);
  useInstances(ref, list);
  return (
    <instancedMesh frustumCulled={false} ref={ref} args={[undefined, undefined, list.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </instancedMesh>
  );
}

/** Benches at the front of each zone's plot, in zone-local metres (+z points at HQ), facing the
 *  landmark. People.tsx seats visitors on these, so they are the single source of bench positions. */
export const ZONE_BENCHES: Partial<Record<ZoneId, [number, number][]>> = {
  marsyard: [[-7.5, 11.5]],
  trading: [[-6.5, 10.5], [6.5, 10.5]],
  workshop: [[-6.5, 12.5], [6.5, 12.5]],
  library: [[-6, 10.5], [6, 10.5]],
  morpheus: [[-7, 12.5], [7, 12.5]],
  home: [[-6, 10.5], [6, 10.5]],
};

/** World position and yaw of a zone bench (yaw turns the bench's +z seat front toward the landmark). */
export function benchAt(id: ZoneId, i: number) {
  const [lx, lz] = ZONE_BENCHES[id]![i];
  const [x, z] = zoneToWorld(id, lx, lz);
  const [zx, zz] = zonePos(zoneById[id]);
  return { x, z, yaw: Math.atan2(-zx, -zz) + Math.PI };
}

function PlazaFurniture() {
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3f9b4a", roughness: 0.85, flatShading: true }), []);
  const list = useMemo(
    () =>
      (Object.keys(ZONE_BENCHES) as ZoneId[]).flatMap((id) =>
        ZONE_BENCHES[id]!.map((_, i) => {
          const b = benchAt(id, i);
          // a planter at the outer end of every bench
          const [lx, lz] = ZONE_BENCHES[id]![i];
          const [px, pz] = zoneToWorld(id, lx + Math.sign(lx || 1) * 1.8, lz);
          return { ...b, y: heightAt(b.x, b.z), px, pz, py: heightAt(px, pz), key: `${id}${i}` };
        })
      ),
    []
  );
  return (
    <>
      {list.map((b) => (
        <group key={b.key}>
          <group position={[b.x, b.y, b.z]} rotation-y={b.yaw}>
            <Bench />
          </group>
          <group position={[b.px, b.py, b.pz]}>
            <Planter size={1.1} leaf={leaf} />
          </group>
        </group>
      ))}
    </>
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
    <instancedMesh frustumCulled={false} ref={ref} args={[undefined, undefined, list.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#9aa29a" roughness={1} flatShading />
    </instancedMesh>
  );
}

/** A six-wheeled rover pottering around the Mars yard. */
function Rover() {
  const g = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const [cx, cz] = MARS_C;
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * 0.22;
    const x = cx + Math.cos(t) * 10,
      zz = cz + Math.sin(t * 2) * 4.5;
    const nx = cx + Math.cos(t + 0.02) * 10,
      nz = cz + Math.sin((t + 0.02) * 2) * 4.5;
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
      <BeachRocks />
      <Rover />
    </>
  );
}
