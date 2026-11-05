"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { heightAt, ISLAND_EDGE, MARS_C, PLAZA_R, ridgeTop, ROAD_HALF, ROAD_R } from "./terrain";
import { getUI, setUI, toast, TOUR, useUI, world } from "./store";
import { AMBIENT_POS } from "./Show";
import { resolve } from "./colliders";
import { REDUCED_MOTION } from "./device";
import { zoneById, zonePos, ZONES, type Zone, type ZoneId } from "./zones";

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
      // the touch joystick acts like a smooth WASD
      if (Math.hypot(world.joy.x, world.joy.y) > 0.12) {
        fx = world.joy.x;
        fz = world.joy.y;
      }
      if (k.has("w") || k.has("arrowup")) fz -= 1;
      if (k.has("s") || k.has("arrowdown")) fz += 1;
      if (k.has("a") || k.has("arrowleft")) fx -= 1;
      if (k.has("d") || k.has("arrowright")) fx += 1;
    }
    let dx = 0,
      dz = 0;
    let run = k.has("shift") || Math.hypot(world.joy.x, world.joy.y) > 0.9;
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
      [nx, nz] = resolve(nx, nz);
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
        bd = 16;
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
    el.style.touchAction = "none"; // the page must not scroll or zoom under a finger on the island
    let lx = 0,
      ly = 0,
      down = false,
      moved = 0;
    // two fingers on the island: pinch to zoom instead of turning
    const touches = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const pd = (e: PointerEvent) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      down = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
    };
    const pm = (e: PointerEvent) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && getUI().mode === "explore") {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        world.camDist = Math.min(Math.max(world.camDist - (d - pinch) * 0.04, 5), 26);
        pinch = d;
        world.dragging = true;
        return;
      }
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
    const pu = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size) return;
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
    addEventListener("pointercancel", pu);
    el.addEventListener("wheel", wh, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", pd);
      removeEventListener("pointermove", pm);
      removeEventListener("pointerup", pu);
      removeEventListener("pointercancel", pu);
      el.removeEventListener("wheel", wh);
    };
  }, [gl]);

  useFrame(({ clock, size }, dt) => {
    const ui = getUI();
    const t = clock.elapsedTime;
    // portrait screens see less sideways: widen the lens so the island and zones still fit
    const fov = size.width < size.height ? 58 : size.width < 900 ? 48 : 40;
    const pc = camera as THREE.PerspectiveCamera;
    if (pc.fov !== fov) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
    const portrait = size.width < size.height;
    let ease = 1 - Math.pow(0.04, dt);
    if (world.shot) {
      // story chapters and the gala drive the camera directly
      tmp.set(...world.shot.pos);
      tmp2.set(...world.shot.look);
      ease = 1 - Math.pow(0.25, dt);
    } else if (ui.mode === "intro") {
      if (world.night > 0.5) {
        // night: hold a view across the island toward the fixed drone show over the northern sea,
        // drifting a little instead of orbiting away from it
        const a = Math.sin(t * 0.05) * 0.28;
        tmp.set(Math.sin(a) * 150, 50, Math.cos(a) * 150);
        tmp2.set(AMBIENT_POS.x * 0.15, 24, AMBIENT_POS.z * 0.6);
      } else {
        const a = (REDUCED_MOTION ? 0 : t * 0.035) + 0.6;
        tmp.set(Math.sin(a) * 172, 92, Math.cos(a) * 172);
        // aim past the centre so the island sits in the upper right, clear of the panel and headline;
        // on a portrait phone the headline is under the island, so lift the aim instead
        if (portrait) tmp2.set(0, -38, 0);
        else tmp2.set(Math.sin(a - 0.5) * -14, -19, Math.cos(a - 0.5) * -14);
      }
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
      // the zones grew with the island: frame each one whole, tall ones (stadium, trading wall) from higher up
      const dist = id === "hq" ? 34 : id === "ropeway" ? 40 : id === "arena" ? 40 : id === "marsyard" ? 44 : id === "trading" ? 32 : 28;
      const lift = id === "hq" ? 16 : id === "arena" ? 18 : id === "marsyard" ? 24 : id === "trading" ? 17 : 12;
      // look at the zone from the island-centre side, slightly off-axis, so the billboard faces us
      tmp.set(x - ox * dist * 0.9 + oz * 6, y + lift, zz - oz * dist * 0.9 - ox * 6);
      tmp2.set(x, y + (id === "hq" ? 5 : id === "trading" ? 6 : 2.5), zz);
      if (id === "marsyard") tmp2.set(MARS_C[0], y + 1, MARS_C[1]);
      if (id === "ropeway") {
        // frame the whole line: aim between the valley station and the peaks, from higher up
        const [rx, rz] = ridgeTop();
        tmp2.set((x + rx) / 2 - 6, y + 9, (zz + rz) / 2 - 8);
        tmp.y += 14;
      }
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

/* ---------------- villagers: robots with roles who think out loud, ask, wave back and topple ---------------- */
type Villager = {
  key: string;
  zone: ZoneId;
  role: string;
  tint: string;
  anim: string;
  side: number;
  thoughts: string[];
  ask: string;
  walker?: { r: number; speed: number; phase: number };
};

const VILLAGERS: Villager[] = [
  {
    key: "arena", zone: "arena", role: "Hackathon teammate", tint: "#f5b301", anim: "Dance", side: 1,
    thoughts: ["10,000+ teams. We still took it.", "The pitch was scripted to the minute.", "Field Nigrani kept our hardware teammate on board.", "Next stop: Singapore, 15–17 Nov."],
    ask: "Want the story of how a rejected idea became a national win?",
  },
  {
    key: "mars", zone: "marsyard", role: "Flight-test engineer", tint: "#ff5a36", anim: "Idle", side: 1,
    thoughts: ["No GPS on Mars. LiDAR it is.", "Who mounted the Livox upside down?", "RC kill switch armed. Always.", "MAVROS out, direct MAVLink in."],
    ask: "Fancy a look at how the drone flies without GPS?",
  },
  {
    key: "swarm", zone: "swarm", role: "Swarm researcher", tint: "#12f0c0", anim: "ThumbsUp", side: 1,
    thoughts: ["Greedy robots all chase the same cell.", "Safety filter on. Competence… pending.", "Failure injected at step 100. Recovering.", "Fix the baseline before you blame it."],
    ask: "Three papers came out of this field. Want the short version?",
  },
  {
    key: "rope", zone: "ropeway", role: "Ropeway engineer", tint: "#e5322d", anim: "Wave", side: 1,
    thoughts: ["Two points in, an alignment out.", "Checked against 19 real lines.", "Eurocode says the sag is fine.", "Cabin 3 is running a bit warm."],
    ask: "Ask me what Harsh built at Doppelmayr?",
  },
  {
    key: "trade", zone: "trading", role: "Quant researcher", tint: "#00b37e", anim: "No", side: 1,
    thoughts: ["HRP? Rejected.", "XGBoost? Rejected.", "float('nan') is truthy. Ouch.", "Sixty days of paper trading first."],
    ask: "Want to see the ten ideas that didn't survive?",
  },
  {
    key: "morph", zone: "morpheus", role: "Hackathon organiser", tint: "#19e36b", anim: "Yes", side: 1,
    thoughts: ["Red pill or blue pill?", "Room 304's fan works now. It's logged.", "No double bookings. Atomic commits.", "200+ hackers, 24 hours, zero sleep."],
    ask: "Curious how we ran a national hackathon's hostels?",
  },
  {
    key: "lib", zone: "library", role: "Librarian", tint: "#00d2ff", anim: "Idle", side: 1,
    thoughts: ["Half these papers say what didn't work.", "803 views and counting.", "Negative results are results.", "Shh. Someone's reading about CBFs."],
    ask: "Shall I pull the six SSRN papers for you?",
  },
  {
    key: "w1", zone: "workshop", role: "Courier bot", tint: "#7a4dff", anim: "Walking", side: 1,
    walker: { r: ROAD_R + ROAD_HALF - 0.9, speed: 0.032, phase: 0 },
    thoughts: ["Delivering crates to the Workshop.", "25 builds and counting.", "Left at the roundabout, then straight."],
    ask: "Lost? The Workshop has everything else he's built.",
  },
  {
    key: "w2", zone: "hq", role: "Campus guide", tint: "#2d5bff", anim: "Walking", side: 1,
    walker: { r: PLAZA_R + 1.4, speed: -0.04, phase: 2.4 },
    thoughts: ["Mission Control is at the centre.", "Press T for the guided tour.", "Five medals are hidden out here."],
    ask: "First time on the island? Mission Control has the whole story.",
  },
  {
    key: "w3", zone: "home", role: "Night owl", tint: "#ff7ac6", anim: "Walking", side: 1,
    walker: { r: ROAD_R - ROAD_HALF + 0.9, speed: 0.026, phase: 4.1 },
    thoughts: ["Press L. The drone show is worth it.", "The lighthouse turns on at night.", "Home's the pink-roofed one."],
    ask: "Want to get in touch with Harsh? Home has a message form.",
  },
];

function Bubble({ kind, z, text, onOpen }: { kind: "think" | "ask"; z: Zone; text: string; onOpen?: () => void }) {
  if (kind === "think")
    return (
      <div className="relative animate-[pop_.35s_cubic-bezier(.16,1,.3,1)] w-max max-w-[210px] whitespace-normal rounded-2xl bg-white/90 px-3 py-2 text-center text-[12px] font-medium leading-snug text-neutral-800 [text-wrap:balance] shadow-lg backdrop-blur">
        {text}
        <span className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/90" />
        <span className="absolute -bottom-[14px] left-[calc(50%+6px)] h-1.5 w-1.5 rounded-full bg-white/90" />
      </div>
    );
  return (
    <div className="relative w-60 origin-bottom animate-[pop_.35s_cubic-bezier(.16,1,.3,1)] rounded-2xl bg-white px-3.5 py-3 text-[13px] font-medium leading-snug text-neutral-900 shadow-xl">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider" style={{ color: z.accent }}>
        {z.name}
      </span>
      {text}
      <span className="mt-2 flex items-center gap-2">
        <button onClick={onOpen} className="pointer-events-auto rounded-full bg-neutral-900 px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-black">
          Show me ↗
        </button>
        <span className="font-mono text-[10px] text-neutral-400">F to wave</span>
      </span>
      <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
    </div>
  );
}

function VillagerBot({ v }: { v: Villager }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ROBOT, false, true);
  const model = useMemo(() => {
    const c = skClone(scene);
    const tint = new THREE.Color(v.tint);
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
  }, [scene, v.tint]);
  const { actions } = useAnimations(animations, group);
  const [band, setBand] = useState<"far" | "think" | "ask">("far");
  const [thought, setThought] = useState(0);
  const z = zoneById[v.zone];
  const home = useMemo(() => {
    const [zx, zz] = zonePos(z);
    const inward = new THREE.Vector2(-zx, -zz).normalize();
    const px = zx + inward.x * 6.5 + inward.y * 4 * v.side;
    const pz = zz + inward.y * 6.5 - inward.x * 4 * v.side;
    return { x: px, z: pz, yaw: Math.atan2(-px, -pz) };
  }, [z, v.side]);
  const pos = useRef({ x: home.x, z: home.z });
  const state = useRef({ base: v.anim, busyUntil: 0, current: "" });

  const play = (name: string, once = false) => {
    const a = actions[name];
    if (!a) return;
    const prev = state.current.current ? actions[state.current.current] : null;
    a.reset();
    if (once) {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    } else a.setLoop(THREE.LoopRepeat, Infinity);
    a.fadeIn(0.25).play();
    if (prev && prev !== a) prev.fadeOut(0.25);
    state.current.current = name;
  };

  useEffect(() => {
    play(v.anim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  // cycle what they're thinking about
  useEffect(() => {
    const t = setInterval(() => setThought((n) => (n + 1) % v.thoughts.length), 4200 + v.key.length * 300);
    return () => clearInterval(t);
  }, [v.thoughts.length, v.key]);

  // wave back when the player waves nearby
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || getUI().mode !== "explore") return;
      const p = world.player;
      if (Math.hypot(p.x - pos.current.x, p.z - pos.current.z) < 10) {
        setTimeout(() => {
          play("Wave", true);
          state.current.busyUntil = performance.now() + 1700;
        }, 250);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    const p = world.player;
    const busy = now < state.current.busyUntil;
    // walkers stroll around the ring road
    if (v.walker && !busy && band !== "ask") {
      const a = clock.elapsedTime * v.walker.speed + v.walker.phase;
      pos.current.x = Math.cos(a) * v.walker.r;
      pos.current.z = Math.sin(a) * v.walker.r;
      g.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(v.walker.speed), Math.cos(a) * Math.sign(v.walker.speed));
    }
    g.position.set(pos.current.x, heightAt(pos.current.x, pos.current.z), pos.current.z);
    const d = Math.hypot(p.x - pos.current.x, p.z - pos.current.z);
    const explore = getUI().mode === "explore" && !getUI().open;
    const nb = !explore ? "far" : d < 5.5 ? "ask" : d < 16 ? "think" : "far";
    if (nb !== band) setBand(nb);
    // run into them and they topple over, then get back up
    if (explore && d < 0.95 && p.speed > 0 && !busy) {
      play("Death", true);
      state.current.busyUntil = now + 2600;
      const k = 1.3 / (d || 1);
      p.x = pos.current.x + (p.x - pos.current.x) * k;
      p.z = pos.current.z + (p.z - pos.current.z) * k;
      toast(`Oops, you bumped the ${v.role.toLowerCase()}`, "They'll be fine.");
    }
    if (!busy && state.current.current !== (band === "ask" && v.walker ? "Idle" : v.anim) && (state.current.current === "Death" || state.current.current === "Wave" || v.walker)) {
      play(band === "ask" && v.walker ? "Idle" : v.anim);
    }
    // turn to face the player when they come close
    if (!busy && (nb === "ask" || !v.walker)) {
      const want = nb === "ask" ? Math.atan2(p.x - pos.current.x, p.z - pos.current.z) : home.yaw;
      let dd = want - g.rotation.y;
      dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      g.rotation.y += dd * Math.min(dt * 4, 1);
    }
  });

  return (
    <group ref={group} position={[home.x, heightAt(home.x, home.z), home.z]} rotation-y={home.yaw}>
      <primitive object={model} scale={0.36} />
      {band !== "far" && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[25, 0]} style={{ pointerEvents: band === "ask" ? "auto" : "none" }}>
          <div className="flex flex-col items-center">
            {band === "ask" && <span className="mb-1 rounded-full bg-neutral-900/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/80">{v.role}</span>}
            <Bubble kind={band === "ask" ? "ask" : "think"} z={z} text={band === "ask" ? v.ask : v.thoughts[thought]} onOpen={() => setUI({ open: v.zone })} />
          </div>
        </Html>
      )}
    </group>
  );
}

export function Teammates() {
  return (
    <>
      {VILLAGERS.map((v) => (
        <VillagerBot key={v.key} v={v} />
      ))}
    </>
  );
}

/* ---------------- five hidden medals ---------------- */
export const MEDALS = [
  { name: "Smart India Hackathon 2025", note: "National Winner · ₹1,50,000", at: () => [Math.cos(-1.32) * 82, Math.sin(-1.32) * 82] as [number, number] },
  { name: "ISRO IRoC-U 2026", note: "Finalist · Team 10144", at: () => ridgeTop() },
  { name: "RoboRashtra 2026", note: "1st Runner-Up · Chakravyuh", at: () => [Math.cos(-0.44) * 76, Math.sin(-0.44) * 76] as [number, number] },
  { name: "Singapore–India Hackathon 2026", note: "Selected for the Grand Finale at SMU", at: () => [Math.cos(1.66) * 90, Math.sin(1.66) * 90] as [number, number] },
  { name: "PCU Ideathon 2.0", note: "Top 40 of 500+ teams", at: () => [Math.cos(3.07) * 72, Math.sin(3.07) * 72] as [number, number] },
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
