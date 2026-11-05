"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { heightAt, ROAD_HALF, ROAD_R, rng } from "./terrain";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { getUI, world } from "./store";
import { benchAt } from "./Decor";
import { plazaSeat } from "./Plaza";

// Human visitors: KayKit Adventurers bodies (CC0) sharing one animation library.
const BODIES = ["knight", "mage", "rogue", "barbarian"] as const;
const ANIMS = "/models/people/people-anims.glb";
// KayKit bodies are chibi-sized; at this scale an adult stands ~1.45 m and sits at SEAT_Y (Props.tsx)
const HUMAN_SCALE = 1.05;
// in Sit_Chair_Idle the hips sit this far behind the root, so shift the body to put them on the seat
const SIT_BACK = 0.36;
BODIES.forEach((b) => useGLTF.preload(`/models/people/${b}.glb`, false, true));
useGLTF.preload(ANIMS, false, true);

type Plan =
  | { kind: "stand"; x: number; z: number; yaw: number; anim: "Idle" | "Cheer" | "Interact" }
  | { kind: "sit"; x: number; z: number; yaw: number; y: number }
  | { kind: "walk"; r: number; speed: number; phase: number }
  | { kind: "crowd"; x: number; z: number; yaw: number };

type Person = { id: string; body: (typeof BODIES)[number]; plan: Plan; line: string };

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
    const q = benchAt(id, i % 2);
    out.push({ id: `sit${i}`, body: b(i + 1), plan: { kind: "sit", ...q, y: 0 }, line: ["Reading the MARS paper.", "Nice evening for it.", "Momentum, huh?", "Waiting for registrations."][i] });
  });
  // and two in the city-centre plaza, by the fountain
  ([[0, -1], [5, 1]] as const).forEach(([slot, side], i) => {
    const q = plazaSeat(slot, side);
    out.push({ id: `psit${i}`, body: b(i + 3), plan: { kind: "sit", ...q, y: heightAt(0, 0) - heightAt(q.x, q.z) }, line: ["The fountain's new.", "Eight stops from school to Singapore."][i] });
  });
  // workers
  out.push({ id: "maker", body: "barbarian", plan: { kind: "stand", ...nearZone("workshop", 1.5, -4.5), anim: "Interact" }, line: "This crate goes to the Mars yard." });
  out.push({ id: "pilot", body: "rogue", plan: { kind: "stand", ...nearZone("marsyard", 4.5, -4.2), anim: "Interact" }, line: "Pre-flight checks done. Kill switch armed." });
  // walkers on the outer pavement of the ring road
  [0, 1, 2, 3].forEach((i) =>
    out.push({ id: `walk${i}`, body: b(i + 2), plan: { kind: "walk", r: ROAD_R + (i % 2 ? -1 : 1) * (ROAD_HALF - 1.1), speed: (i % 2 ? -1 : 1) * (0.028 + i * 0.004), phase: i * 1.6 }, line: ["Lovely island.", "Which way to the lighthouse?", "Did you find a medal yet?", "The drone show is at night."][i] })
  );
  // the gala crowd on the south beach by the pier
  const r = rng(61);
  for (let i = 0; i < 8; i++) {
    const a = ((88 + (i - 4) * 3.2) * Math.PI) / 180;
    const d = 86 + r() * 3;
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
      // forget the action too, or a remount (StrictMode, HMR) thinks it is still playing and leaves a T-pose
      mixer.stopAllAction();
      current.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer]);
  // KayKit's walk holds the arms out as if carrying weapons; pull them most of the way down
  const arms = useMemo(() => ["upperarm.l", "upperarm.r"].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Bone[], [model]);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Quaternion(), p: new THREE.Quaternion() }), []);
  useFrame(({ clock }, dt) => {
    mixer.update(Math.min(dt, 0.1));
    if (p.plan.kind === "walk") {
      for (const arm of arms) {
        const lower = arm.children.find((c) => /lowerarm/.test(c.name));
        if (!lower || !arm.parent) continue;
        arm.updateWorldMatrix(true, true);
        arm.getWorldPosition(tmp.a);
        lower.getWorldPosition(tmp.b);
        tmp.b.sub(tmp.a).normalize();
        tmp.d.set(0, -1, 0).lerp(tmp.b, 0.3).normalize(); // keep a little of the clip's swing
        tmp.q.setFromUnitVectors(tmp.b, tmp.d);
        arm.getWorldQuaternion(tmp.w);
        arm.parent.getWorldQuaternion(tmp.p);
        arm.quaternion.copy(tmp.p.invert().multiply(tmp.q.multiply(tmp.w)));
      }
    }
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
      <primitive object={model} scale={HUMAN_SCALE} position-z={p.plan.kind === "sit" ? SIT_BACK : 0} />
      {near && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
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
