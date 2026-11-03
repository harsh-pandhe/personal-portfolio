"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { heightAt, ISLAND_EDGE, ridgeTop } from "./terrain";
import { getUI, setUI, toast, TOUR, useUI, world } from "./store";
import { zoneById, zonePos, ZONES } from "./zones";
import { droneShape, globeShape, helixShape, ringsShape, textShape } from "../experience/shapes";

const ROBOT = "/models/robot.glb";
useGLTF.preload(ROBOT, false, true);

/* ---------------- the player: an expressive little robot ---------------- */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ROBOT, false, true);
  const model = useMemo(() => {
    const c = skClone(scene);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string>("");
  const play = (name: string) => {
    if (current.current === name) return;
    const next = actions[name];
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    if (current.current) actions[current.current]?.fadeOut(0.25);
    current.current = name;
  };
  useEffect(() => {
    play("Idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      world.keys.add(e.key.toLowerCase());
      if (e.key === " " && getUI().mode === "explore") play("Jump");
      if (e.key.toLowerCase() === "f" && getUI().mode === "explore") play("Wave");
    };
    const up = (e: KeyboardEvent) => world.keys.delete(e.key.toLowerCase());
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  const oneShot = useRef(0);
  useFrame((_, dt) => {
    const p = world.player;
    const k = world.keys;
    const ui = getUI();
    let fx = 0,
      fz = 0;
    if (ui.mode === "explore" && !ui.open) {
      if (k.has("w") || k.has("arrowup")) fz -= 1;
      if (k.has("s") || k.has("arrowdown")) fz += 1;
      if (k.has("a") || k.has("arrowleft")) fx -= 1;
      if (k.has("d") || k.has("arrowright")) fx += 1;
    }
    let dx = 0,
      dz = 0;
    let run = k.has("shift");
    if (fx !== 0 || fz !== 0) {
      // keys win over click-to-walk; move relative to the camera's heading
      world.target = null;
      const yaw = world.camYaw;
      dx = fx * Math.cos(yaw) + fz * Math.sin(yaw);
      dz = -fx * Math.sin(yaw) + fz * Math.cos(yaw);
    } else if (world.target && ui.mode === "explore" && !ui.open) {
      dx = world.target.x - p.x;
      dz = world.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.35) {
        world.target = null;
        dx = dz = 0;
      } else if (dist > 10) run = true;
    }
    const moving = dx !== 0 || dz !== 0;
    p.speed = moving ? (run ? 2 : 1) : 0;
    if (moving) {
      const len = Math.hypot(dx, dz) || 1;
      const sp = (run ? 9 : 4.6) * dt;
      let nx = p.x + (dx / len) * sp,
        nz = p.z + (dz / len) * sp;
      const r = Math.hypot(nx, nz);
      if (r > ISLAND_EDGE + 1) {
        nx *= (ISLAND_EDGE + 1) / r;
        nz *= (ISLAND_EDGE + 1) / r;
      }
      p.x = nx;
      p.z = nz;
      const target = Math.atan2(dx, dz);
      let d = target - p.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.yaw += d * Math.min(dt * 10, 1);
    }
    const anim = current.current;
    const busy = (anim === "Jump" || anim === "Wave") && (oneShot.current += dt) < (anim === "Jump" ? 0.9 : 1.6);
    if (!busy) {
      oneShot.current = 0;
      play(moving ? (run ? "Running" : "Walking") : "Idle");
    }
    if (group.current) {
      group.current.position.set(p.x, heightAt(p.x, p.z), p.z);
      group.current.rotation.y = p.yaw;
    }
    // nearest zone
    if (ui.mode === "explore") {
      let best: (typeof ZONES)[number] | null = null,
        bd = 11;
      for (const z of ZONES) {
        const [x, zz] = zonePos(z);
        const d = Math.hypot(p.x - x, p.z - zz);
        if (d < bd) {
          bd = d;
          best = z;
        }
      }
      setUI({ near: best ? best.id : null });
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} scale={0.42} />
    </group>
  );
}

/* ---------------- camera: overview orbit · third-person follow · guided tour ---------------- */
export function CameraRig() {
  const { camera, gl } = useThree();
  const pos = useRef(new THREE.Vector3(70, 60, 90));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;
    let lx = 0,
      ly = 0,
      down = false,
      moved = 0;
    const pd = (e: PointerEvent) => {
      down = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
    };
    const pm = (e: PointerEvent) => {
      if (!down || getUI().mode !== "explore") return;
      const dx = e.clientX - lx,
        dy = e.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy);
      lx = e.clientX;
      ly = e.clientY;
      world.camYaw -= dx * 0.005;
      world.camPitch = Math.min(Math.max(world.camPitch + dy * 0.003, 0.12), 1.2);
      world.dragging = moved > 4;
    };
    const pu = () => {
      down = false;
      setTimeout(() => (world.dragging = false), 0);
    };
    const wh = (e: WheelEvent) => {
      if (getUI().mode !== "explore") return;
      world.camDist = Math.min(Math.max(world.camDist + e.deltaY * 0.01, 5), 26);
    };
    el.addEventListener("pointerdown", pd);
    addEventListener("pointermove", pm);
    addEventListener("pointerup", pu);
    el.addEventListener("wheel", wh, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", pd);
      removeEventListener("pointermove", pm);
      removeEventListener("pointerup", pu);
      el.removeEventListener("wheel", wh);
    };
  }, [gl]);

  useFrame(({ clock }, dt) => {
    const ui = getUI();
    const t = clock.elapsedTime;
    let ease = 1 - Math.pow(0.04, dt);
    if (ui.mode === "intro") {
      const a = t * 0.035 + 0.6;
      tmp.set(Math.sin(a) * 104, 58, Math.cos(a) * 104);
      // aim past the centre so the island sits in the upper right, clear of the panel and headline
      tmp2.set(Math.sin(a - 0.5) * -10, -14 + 26 * world.night, Math.cos(a - 0.5) * -10); // tilt up at night for the show
      ease = 1 - Math.pow(0.3, dt);
    } else if (ui.mode === "tour" || ui.open) {
      const id = ui.mode === "tour" ? TOUR[ui.tour] : ui.open!;
      const z = zoneById[id];
      const [x, zz] = zonePos(z);
      const out = z.radius ? new THREE.Vector2(x, zz).normalize() : new THREE.Vector2(0.35, 1).normalize();
      const y = heightAt(x, zz);
      const orbit = Math.sin(t * 0.15) * 0.25;
      const ox = out.x * Math.cos(orbit) - out.y * Math.sin(orbit);
      const oz = out.x * Math.sin(orbit) + out.y * Math.cos(orbit);
      const dist = id === "hq" ? 30 : id === "ropeway" ? 34 : 24;
      // look at the zone from the island-centre side, slightly off-axis, so the billboard faces us
      tmp.set(x - ox * dist * 0.9 + oz * 6, y + (id === "hq" ? 14 : 10), zz - oz * dist * 0.9 - ox * 6);
      tmp2.set(x, y + (id === "hq" ? 5 : 2.5), zz);
      // shift the aim down-left so the zone lands up-right of the panel and tour card
      const fx = tmp2.x - tmp.x,
        fz = tmp2.z - tmp.z;
      const fl = Math.hypot(fx, fz) || 1;
      tmp2.x += (fz / fl) * -5.5;
      tmp2.z += (-fx / fl) * -5.5;
      tmp2.y -= 3.2;
      if (ui.mode === "explore") {
        // modal opened while walking: frame the zone but keep the player context
      }
      ease = 1 - Math.pow(0.12, dt);
    } else {
      const p = world.player;
      const d = world.camDist;
      tmp.set(
        p.x + Math.sin(world.camYaw) * Math.cos(world.camPitch) * d,
        heightAt(p.x, p.z) + 1.6 + Math.sin(world.camPitch) * d,
        p.z + Math.cos(world.camYaw) * Math.cos(world.camPitch) * d
      );
      const ground = heightAt(tmp.x, tmp.z) + 1;
      if (tmp.y < ground) tmp.y = ground;
      tmp2.set(p.x, heightAt(p.x, p.z) + 1.6, p.z);
      ease = 1 - Math.pow(0.0005, dt);
    }
    pos.current.lerp(tmp, ease);
    look.current.lerp(tmp2, ease);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    // day/night easing lives here: one place, every frame
    world.night += (world.nightTarget - world.night) * (1 - Math.pow(0.3, dt));
  });
  return null;
}

/* ---------------- Taramandal: a drone light show over the sea at night ---------------- */
export function LightShow() {
  const N = 900;
  const geo = useRef<THREE.BufferGeometry>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const shapes = useRef<Float32Array[] | null>(null);
  const pos = useMemo(() => new Float32Array(N * 3), []);
  const cols = useMemo(() => new Float32Array(N * 3), []);
  const pal = useMemo(() => ["#00d2ff", "#7a4dff", "#12f0c0", "#ff7ac6", "#ffd23f"].map((c) => new THREE.Color(c)), []);
  useEffect(() => {
    const build = () => {
      shapes.current = [textShape(N, "HARSH"), droneShape(N), globeShape(N, 2.4), ringsShape(N), helixShape(N), textShape(N, "SIH'25")];
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
  }, []);
  const holder = useRef<THREE.Points>(null);
  useFrame(({ clock, camera }) => {
    // keep the show over the sea on the far side of the island from the camera
    if (holder.current) {
      const l = Math.hypot(camera.position.x, camera.position.z) || 1;
      holder.current.position.set((-camera.position.x / l) * 85, 30, (-camera.position.z / l) * 85);
      holder.current.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    }
    if (!shapes.current || !geo.current || !mat.current) return;
    mat.current.opacity = Math.max(0, world.night * 1.2 - 0.2);
    if (world.night < 0.02) return; // invisible by day: skip the work
    const t = clock.elapsedTime;
    const S = shapes.current;
    const per = 7;
    const i = Math.floor(t / per) % S.length;
    const f = Math.min(((t % per) / per) * 2.2, 1);
    const k = f * f * (3 - 2 * f);
    const A = S[i],
      B = S[(i + 1) % S.length];
    const ca = pal[i % pal.length],
      cb = pal[(i + 1) % pal.length];
    for (let j = 0; j < N; j++) {
      const ix = j * 3;
      const kk = Math.min(Math.max((k - (j % 7) * 0.02) / 0.88, 0), 1);
      pos[ix] = A[ix] + (B[ix] - A[ix]) * kk;
      pos[ix + 1] = A[ix + 1] + (B[ix + 1] - A[ix + 1]) * kk + Math.sin(t + j) * 0.02;
      pos[ix + 2] = A[ix + 2] + (B[ix + 2] - A[ix + 2]) * kk;
      const c = kk > 0.5 ? cb : ca;
      cols[ix] = c.r;
      cols[ix + 1] = c.g;
      cols[ix + 2] = c.b;
    }
    geo.current.attributes.position.needsUpdate = true;
    geo.current.attributes.color.needsUpdate = true;
  });
  return (
    <points ref={holder} scale={5} frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[cols, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={0.13} vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ---------------- click-to-walk target marker ---------------- */
export function TargetMarker() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#22d36b", transparent: true, opacity: 0, depthWrite: false }), []);
  useFrame(({ clock }) => {
    const t = world.target;
    if (!ref.current) return;
    if (!t) {
      mat.opacity = Math.max(0, mat.opacity - 0.08);
      return;
    }
    ref.current.position.set(t.x, heightAt(t.x, t.z) + 0.06, t.z);
    const k = (clock.elapsedTime * 1.4) % 1;
    ref.current.scale.setScalar(0.6 + k * 0.6);
    mat.opacity = 0.9 * (1 - k);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={mat}>
      <ringGeometry args={[0.55, 0.75, 32]} />
    </mesh>
  );
}

/* ---------------- dust puffs while running ---------------- */
export function Dust() {
  const N = 24;
  const ref = useRef<THREE.InstancedMesh>(null);
  const life = useMemo(() => new Float32Array(N), []);
  const pos = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), []);
  const acc = useRef(0);
  const next = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    const p = world.player;
    acc.current += dt;
    if (p.speed > 0 && acc.current > (p.speed > 1 ? 0.07 : 0.16)) {
      acc.current = 0;
      const i = next.current++ % N;
      life[i] = 1;
      pos[i].set(p.x + (Math.random() - 0.5) * 0.3, heightAt(p.x, p.z) + 0.1, p.z + (Math.random() - 0.5) * 0.3);
    }
    if (!ref.current) return;
    for (let i = 0; i < N; i++) {
      life[i] = Math.max(0, life[i] - dt * 1.6);
      const l = life[i];
      const sc = l > 0 ? (1.2 - l) * 0.35 : 0;
      pos[i].y += dt * 0.25;
      m.makeScale(sc, sc, sc).setPosition(pos[i]);
      ref.current.setMatrixAt(i, m);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#efe6d2" roughness={1} transparent opacity={0.65} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------------- teammates: robots at the zones who talk when you come close ---------------- */
const TEAM: { zone: (typeof ZONES)[number]["id"]; tint: string; anim: string; line: string; side: number }[] = [
  { zone: "arena", tint: "#f5b301", anim: "Dance", line: "Team Algo Sapiens! 10,000+ teams and we still took SIH 2025.", side: 1 },
  { zone: "marsyard", tint: "#ff5a36", anim: "Idle", line: "No GPS on Mars. FAST-LIO and a Livox Mid-360 keep us honest.", side: 1 },
  { zone: "swarm", tint: "#12f0c0", anim: "ThumbsUp", line: "My safety halo stops me bumping the others. Mostly.", side: 1 },
  { zone: "ropeway", tint: "#e5322d", anim: "Wave", line: "Two coordinates in, a ropeway out. Ask me about RopeIQ.", side: 1 },
  { zone: "trading", tint: "#00b37e", anim: "No", line: "Ten upgrades tested, ten rejected. Plain momentum stays.", side: 1 },
  { zone: "morpheus", tint: "#19e36b", anim: "Yes", line: "Red pill or blue pill? Registrations close at midnight.", side: 1 },
  { zone: "library", tint: "#00d2ff", anim: "Sitting", line: "Half these papers say what didn't work. That's the point.", side: 1 },
];

function Teammate({ t }: { t: (typeof TEAM)[number] }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ROBOT, false, true);
  const model = useMemo(() => {
    const c = skClone(scene);
    const tint = new THREE.Color(t.tint);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => {
        const n = (mm as THREE.MeshStandardMaterial).clone();
        // recolour the body panels ("Main"), keep the grey joints and black visor
        if (n.name === "Main") n.color.copy(tint);
        return n;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    return c;
  }, [scene, t.tint]);
  const { actions } = useAnimations(animations, group);
  const [near, setNear] = useState(false);
  const z = zoneById[t.zone];
  const [zx, zz] = zonePos(z);
  const inward = new THREE.Vector2(-zx, -zz).normalize();
  const px = zx + inward.x * 6.5 + inward.y * 4 * t.side;
  const pz = zz + inward.y * 6.5 - inward.x * 4 * t.side;
  const baseYaw = Math.atan2(-px, -pz); // face the island centre
  useEffect(() => {
    const a = actions[t.anim] ?? actions["Idle"];
    a?.reset().fadeIn(0.3).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions, t.anim]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const p = world.player;
    const d = Math.hypot(p.x - px, p.z - pz);
    const isNear = getUI().mode === "explore" && !getUI().open && d < 6;
    if (isNear !== near) {
      setNear(isNear);
      const wave = actions["Wave"];
      if (isNear && wave) {
        wave.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play();
        wave.clampWhenFinished = false;
      }
    }
    // turn to face the player when they come close
    const want = isNear ? Math.atan2(p.x - px, p.z - pz) : baseYaw;
    let dd = want - group.current.rotation.y;
    dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    group.current.rotation.y += dd * Math.min(dt * 4, 1);
  });
  return (
    <group ref={group} position={[px, heightAt(px, pz), pz]} rotation-y={baseYaw}>
      <primitive object={model} scale={0.36} />
      {near && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
          <div className="relative w-56 origin-bottom animate-[pop_.35s_cubic-bezier(.16,1,.3,1)] rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-medium leading-snug text-neutral-900 shadow-xl">
            <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-wider" style={{ color: t.tint }}>
              {z.name}
            </span>
            {t.line}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        </Html>
      )}
    </group>
  );
}

export function Teammates() {
  return (
    <>
      {TEAM.map((t) => (
        <Teammate key={t.zone} t={t} />
      ))}
    </>
  );
}

/* ---------------- five hidden medals ---------------- */
export const MEDALS = [
  { name: "Smart India Hackathon 2025", note: "National Winner · ₹1,50,000", at: () => [9, -45] as [number, number] },
  { name: "ISRO IRoC-U 2026", note: "Finalist · Team 10144", at: () => ridgeTop() },
  { name: "RoboRashtra 2026", note: "1st Runner-Up · Chakravyuh", at: () => [44, -16] as [number, number] },
  { name: "Singapore–India Hackathon 2026", note: "Selected for the Grand Finale at SMU", at: () => [Math.cos(1.66) * 50, Math.sin(1.66) * 50] as [number, number] },
  { name: "PCU Ideathon 2.0", note: "Top 40 of 500+ teams", at: () => [Math.cos(3.45) * 49, Math.sin(3.45) * 49] as [number, number] },
];

function loadMedals(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem("hp-medals") || "[]");
    return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function Medals() {
  const ui = useUI();
  const refs = useRef<(THREE.Group | null)[]>([]);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f5b301", metalness: 1, roughness: 0.2, emissive: "#7a5200", emissiveIntensity: 0.4 }), []);
  const ribbon = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2d5bff", roughness: 0.6 }), []);
  const spots = useMemo(() => MEDALS.map((m) => m.at()), []);
  useEffect(() => {
    const saved = loadMedals();
    if (saved.length) setUI({ medals: saved });
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = world.player;
    const found = getUI().medals;
    spots.forEach(([x, z], i) => {
      const g = refs.current[i];
      if (!g) return;
      g.rotation.y = t * 1.6 + i;
      gold.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.25 + world.night * 1.2;
      g.position.y = heightAt(x, z) + 1.1 + Math.sin(t * 2 + i) * 0.15;
      if (getUI().mode === "explore" && !found.includes(i) && Math.hypot(p.x - x, p.z - z) < 1.8) {
        const next = [...found, i];
        setUI({ medals: next });
        try {
          localStorage.setItem("hp-medals", JSON.stringify(next));
        } catch {}
        toast(`Medal ${next.length} of ${MEDALS.length} · ${MEDALS[i].name}`, next.length === MEDALS.length ? "All five found. That's the whole mission log." : MEDALS[i].note);
      }
    });
  });
  return (
    <>
      {spots.map(([x, z], i) =>
        ui.medals.includes(i) ? null : (
          <group key={i} ref={(el) => (refs.current[i] = el)} position={[x, heightAt(x, z) + 1.1, z]}>
            <mesh material={gold} castShadow rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.42, 0.42, 0.09, 28]} />
            </mesh>
            <mesh material={ribbon} position={[0, 0.62, 0]}>
              <boxGeometry args={[0.32, 0.55, 0.04]} />
            </mesh>
          </group>
        )
      )}
    </>
  );
}
