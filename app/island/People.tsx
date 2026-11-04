"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { heightAt, ROAD_R, rng } from "./terrain";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { getUI, world } from "./store";

// Human visitors: KayKit Adventurers bodies (CC0) sharing one animation library.
const BODIES = ["knight", "mage", "rogue", "barbarian"] as const;
const ANIMS = "/models/people/people-anims.glb";
BODIES.forEach((b) => useGLTF.preload(`/models/people/${b}.glb`, false, true));
useGLTF.preload(ANIMS, false, true);

type Plan =
  | { kind: "stand"; x: number; z: number; yaw: number; anim: "Idle" | "Cheer" | "Interact" }
  | { kind: "sit"; x: number; z: number; yaw: number; y: number }
  | { kind: "walk"; r: number; speed: number; phase: number }
  | { kind: "crowd"; x: number; z: number; yaw: number };

type Person = { id: string; body: (typeof BODIES)[number]; plan: Plan; line: string };

/** Benches sit 6.2 m from a zone's centre, either side of its approach (same rule as Decor). */
function bench(id: ZoneId, k: -1 | 1) {
  const z = zoneById[id];
  const [zx, zz] = zonePos(z);
  const base = z.radius ? Math.atan2(zx, zz) : 0;
  const a = base + k * 0.9 + Math.PI;
  return { x: zx + Math.sin(a) * 6.2 - Math.sin(a) * 0.12, z: zz + Math.cos(a) * 6.2 - Math.cos(a) * 0.12, yaw: a + Math.PI };
}

function nearZone(id: ZoneId, inward: number, side: number) {
  const [zx, zz] = zonePos(zoneById[id]);
  const u = new THREE.Vector2(-zx, -zz).normalize();
  const x = zx + u.x * inward + u.y * side,
    z = zz + u.y * inward - u.x * side;
  return { x, z, yaw: Math.atan2(zx - x, zz - z) };
}

function buildPeople(): Person[] {
  const out: Person[] = [];
  const b = (i: number) => BODIES[i % BODIES.length];
  // fans at the Arena
  [-2.2, 0, 2.2].forEach((s, i) => {
    const p = nearZone("arena", 4.2, s);
    out.push({ id: `fan${i}`, body: b(i), plan: { kind: "stand", ...p, anim: "Cheer" }, line: ["Algo Sapiens!", "That trophy's real?", "Ten thousand teams…"][i] });
  });
  // people on benches
  (["library", "home", "trading", "morpheus"] as ZoneId[]).forEach((id, i) => {
    const q = bench(id, i % 2 ? 1 : -1);
    out.push({ id: `sit${i}`, body: b(i + 1), plan: { kind: "sit", ...q, y: 0.02 }, line: ["Reading the MARS paper.", "Nice evening for it.", "Momentum, huh?", "Waiting for registrations."][i] });
  });
  // workers
  out.push({ id: "maker", body: "barbarian", plan: { kind: "stand", ...nearZone("workshop", 1.5, -4.5), anim: "Interact" }, line: "This crate goes to the Mars yard." });
  out.push({ id: "pilot", body: "rogue", plan: { kind: "stand", ...nearZone("marsyard", 4.5, -4.2), anim: "Interact" }, line: "Pre-flight checks done. Kill switch armed." });
  // walkers on the outer pavement of the ring road
  [0, 1, 2, 3].forEach((i) =>
    out.push({ id: `walk${i}`, body: b(i + 2), plan: { kind: "walk", r: ROAD_R + 2.4 + (i % 2) * 0.5, speed: (i % 2 ? -1 : 1) * (0.028 + i * 0.004), phase: i * 1.6 }, line: ["Lovely island.", "Which way to the lighthouse?", "Did you find a medal yet?", "The drone show is at night."][i] })
  );
  // the gala crowd on the south beach by the pier
  const r = rng(61);
  for (let i = 0; i < 8; i++) {
    const a = ((88 + (i - 4) * 3.2) * Math.PI) / 180;
    const d = 59 + r() * 2.5;
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    out.push({ id: `crowd${i}`, body: b(i), plan: { kind: "crowd", x, z, yaw: Math.atan2(x, z) }, line: "" });
  }
  return out;
}

function Human({ p, clips }: { p: Person; clips: THREE.AnimationClip[] }) {
  const { scene } = useGLTF(`/models/people/${p.body}.glb`, false, true);
  const model = useMemo(() => {
    const c = skClone(scene);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
  const group = useRef<THREE.Group>(null);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const current = useRef<THREE.AnimationAction | null>(null);
  const [near, setNear] = useState(false);
  const play = (name: string) => {
    const clip = clips.find((c) => c.name === name);
    if (!clip) return;
    const a = mixer.clipAction(clip);
    if (current.current === a) return;
    a.reset().fadeIn(0.35).play();
    current.current?.fadeOut(0.35);
    current.current = a;
  };
  useEffect(() => {
    const plan = p.plan;
    play(plan.kind === "walk" ? "Walking_A" : plan.kind === "sit" ? "Sit_Chair_Idle" : plan.kind === "crowd" ? "Idle" : plan.anim);
    // offset each person's cycle so crowds don't move in lockstep
    mixer.setTime(Math.random() * 3);
    return () => {
      mixer.stopAllAction();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer]);
  useFrame(({ clock }, dt) => {
    mixer.update(Math.min(dt, 0.1));
    const g = group.current;
    if (!g) return;
    const plan = p.plan;
    if (plan.kind === "walk") {
      const a = clock.elapsedTime * plan.speed + plan.phase;
      const x = Math.cos(a) * plan.r,
        z = Math.sin(a) * plan.r;
      g.position.set(x, heightAt(x, z), z);
      const s = Math.sign(plan.speed);
      g.rotation.y = Math.atan2(-Math.sin(a) * s, Math.cos(a) * s);
    }
    if (plan.kind === "crowd") play(world.gala > 0.5 ? "Cheer" : "Idle");
    const pl = world.player;
    const d = Math.hypot(pl.x - g.position.x, pl.z - g.position.z);
    const n = getUI().mode === "explore" && !getUI().open && d < 4.5 && !!p.line;
    if (n !== near) setNear(n);
  });
  const start = useMemo(() => {
    const plan = p.plan;
    if (plan.kind === "walk") return { x: plan.r, z: 0, yaw: 0, y: 0 };
    return { x: plan.x, z: plan.z, yaw: plan.yaw, y: plan.kind === "sit" ? plan.y : 0 };
  }, [p.plan]);
  return (
    <group ref={group} position={[start.x, heightAt(start.x, start.z) + start.y, start.z]} rotation-y={start.yaw}>
      <primitive object={model} scale={0.62} />
      {near && (
        <Html position={[0, 1.75, 0]} center zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
          <div className="animate-[pop_.35s_cubic-bezier(.16,1,.3,1)] whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-900 shadow-lg">{p.line}</div>
        </Html>
      )}
    </group>
  );
}

export default function People() {
  const anims = useGLTF(ANIMS, false, true);
  const people = useMemo(buildPeople, []);
  return (
    <>
      {people.map((p) => (
        <Human key={p.id} p={p} clips={anims.animations} />
      ))}
    </>
  );
}
