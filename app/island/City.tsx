"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt, ROAD_R, rng } from "./terrain";
import { world } from "./store";

// KayKit City Builder Bits (CC0): cars on the ring road and the Navi Mumbai skyline across the water.
const CARS = ["car_taxi", "car_sedan", "car_taxi", "car_hatchback", "car_police"] as const;
const BUILDINGS = ["a", "b", "c", "d", "e", "f", "g", "h"];
CARS.forEach((c) => useGLTF.preload(`/models/city/${c}.glb`, false, true));
BUILDINGS.forEach((b) => useGLTF.preload(`/models/city/building_${b}.glb`, false, true));

function Car({ kind, lane, speed, phase }: { kind: (typeof CARS)[number]; lane: number; speed: number; phase: number }) {
  const { scene } = useGLTF(`/models/city/${kind}.glb`, false, true);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
  const wheels = useMemo(() => {
    const w: THREE.Object3D[] = [];
    model.traverse((o) => {
      if (/wheel/i.test(o.name)) w.push(o);
    });
    return w;
  }, [model]);
  const g = useRef<THREE.Group>(null);
  const ang = useRef(phase);
  const v = useRef(speed);
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff6d8", emissive: "#fff2c0", emissiveIntensity: 0.2 }), []);
  const tail = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff3b3b", emissive: "#ff2020", emissiveIntensity: 0.2 }), []);
  useFrame((_, dt) => {
    const d = Math.sign(speed);
    // slow down for anyone standing in the lane ahead
    const ahead = ang.current + d * 0.16;
    const ax = Math.cos(ahead) * lane,
      az = Math.sin(ahead) * lane;
    const blocked = Math.hypot(world.player.x - ax, world.player.z - az) < 3.2;
    v.current += ((blocked ? 0 : speed) - v.current) * Math.min(dt * 2.5, 1);
    ang.current += (v.current / lane) * dt;
    const x = Math.cos(ang.current) * lane,
      z = Math.sin(ang.current) * lane;
    if (g.current) {
      g.current.position.set(x, heightAt(x, z) + 0.06, z);
      g.current.rotation.y = Math.atan2(-Math.sin(ang.current) * d, Math.cos(ang.current) * d);
    }
    wheels.forEach((w) => (w.rotation.x += (v.current / 0.3) * dt * d));
    lamp.emissiveIntensity = 0.2 + world.night * 3;
    tail.emissiveIntensity = 0.2 + world.night * 2;
  });
  return (
    <group ref={g}>
      {/* KayKit cars are ~0.6 units long; at 3.6 they read as ~2.2 m next to the visitors */}
      <group scale={3.6}>
        <primitive object={model} />
        {[-0.1, 0.1].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.11, 0.335]} material={lamp}>
              <boxGeometry args={[0.05, 0.025, 0.01]} />
            </mesh>
            <mesh position={[x, 0.12, -0.335]} material={tail}>
              <boxGeometry args={[0.05, 0.02, 0.01]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export function Traffic() {
  return (
    <>
      {CARS.map((k, i) => (
        <Car key={i} kind={k} lane={i % 2 ? ROAD_R - 1.15 : ROAD_R + 1.15} speed={(i % 2 ? -1 : 1) * (3.2 + i * 0.35)} phase={i * 1.25} />
      ))}
    </>
  );
}

/** Navi Mumbai across the water: a skyline on a far shore, with lit windows at night and a creek bridge. */
export function Skyline() {
  const gltfs = useGLTF(BUILDINGS.map((b) => `/models/city/building_${b}.glb`), false, true);
  const night = useMemo(() => new THREE.Color("#ffd27a"), []);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const items = useMemo(() => {
    const r = rng(404);
    const out: { k: number; x: number; z: number; s: number; rot: number }[] = [];
    // an arc of the far shore to the east-north-east
    for (let i = 0; i < 46; i++) {
      const a = ((-38 + i * 1.5 + (r() - 0.5)) * Math.PI) / 180;
      const d = 148 + r() * 22;
      out.push({ k: Math.floor(r() * BUILDINGS.length), x: Math.cos(a) * d, z: Math.sin(a) * d, s: 5 + r() * 4.5, rot: r() * Math.PI * 2 });
    }
    return out;
  }, []);
  const clones = useMemo(
    () =>
      items.map((it) => {
        const c = gltfs[it.k].scene.clone(true);
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.emissive = night.clone();
          mat.emissiveMap = mat.map;
          mat.emissiveIntensity = 0;
          m.material = mat;
          mats.current.push(mat);
        });
        return c;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );
  useEffect(() => () => mats.current.forEach((m) => m.dispose()), []);
  useFrame(() => {
    const k = world.night * 0.55;
    for (const m of mats.current) m.emissiveIntensity = k;
  });
  return (
    <group>
      {/* the far shore */}
      <mesh position={[150, -1.2, -40]} rotation-y={0.25}>
        <boxGeometry args={[46, 2, 150]} />
        <meshStandardMaterial color="#8fa98a" roughness={1} />
      </mesh>
      {items.map((it, i) => (
        <primitive key={i} object={clones[i]} position={[it.x, -0.2, it.z]} scale={it.s} rotation-y={it.rot} />
      ))}
      {/* a creek bridge on concrete piers */}
      <group position={[118, 0, 38]} rotation-y={-0.9}>
        <mesh position={[0, 3.2, 0]}>
          <boxGeometry args={[70, 0.8, 4]} />
          <meshStandardMaterial color="#d6d9de" roughness={0.8} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[-31 + i * 8.8, 1.2, 0]}>
            <boxGeometry args={[1.2, 4, 3]} />
            <meshStandardMaterial color="#c4c8ce" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

