"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { heightAt, ISLAND_EDGE } from "./terrain";
import { getUI, setUI, TOUR, world } from "./store";
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
    const moving = fx !== 0 || fz !== 0;
    const run = k.has("shift");
    if (moving) {
      // move relative to the camera's heading
      const yaw = world.camYaw;
      const dx = fx * Math.cos(yaw) + fz * Math.sin(yaw);
      const dz = -fx * Math.sin(yaw) + fz * Math.cos(yaw);
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
    mat.current.opacity = Math.max(0, world.night * 1.2 - 0.2);
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
