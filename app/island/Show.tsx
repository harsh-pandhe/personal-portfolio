"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getUI, world } from "./store";
import { droneShape, globeShape, helixShape, ringsShape, rocketShape, textShape, trophyShape } from "./shapes";
import { sfx } from "./audio";

const N = 1600;

/** The gala programme: each formation holds for one step while its caption shows. */
export const GALA_STEPS: { key: string; caption: string; sub: string; color: string }[] = [
  { key: "name", caption: "Harsh Pandhe", sub: "Welcome to the gala on Mission Island", color: "#00d2ff" },
  { key: "trophy", caption: "SIH 2025 · National Winner", sub: "10,000+ teams · Team Algo Sapiens · Telhan Sathi", color: "#ffd23f" },
  { key: "drone", caption: "ISRO IRoC-U 2026 · Finalist", sub: "A drone that flies without GPS", color: "#ff7a45" },
  { key: "helix", caption: "Six papers on SSRN", sub: "Markets and multi-robot learning, written up honestly", color: "#9b7bff" },
  { key: "rings", caption: "Ropeways at Doppelmayr", sub: "Two coordinates in, an alignment out", color: "#ff5a6e" },
  { key: "rocket", caption: "RoboRashtra · Morpheus · MARS", sub: "Robots, hackathons and swarms", color: "#12f0c0" },
  { key: "globe", caption: "Next stop: Singapore", sub: "Singapore–India Hackathon Grand Finale · 15–17 Nov 2026", color: "#00d2ff" },
  { key: "thanks", caption: "Thank you for visiting", sub: "Say hello: harshpandhehome@gmail.com", color: "#ffffff" },
];

export const GALA_POS = new THREE.Vector3(-8, 30, 104);
export const GALA_CAM = { pos: [-2, 7, 22] as [number, number, number], look: [-8, 14, 104] as [number, number, number] };

export function LightShow() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const holder = useRef<THREE.Points>(null);
  const shapes = useRef<Record<string, Float32Array> | null>(null);
  const pos = useMemo(() => new Float32Array(N * 3), []);
  const cols = useMemo(() => new Float32Array(N * 3), []);
  const from = useRef<Float32Array>(new Float32Array(N * 3));
  const to = useRef<Float32Array>(new Float32Array(N * 3));
  const fromCol = useRef(new THREE.Color("#00d2ff"));
  const toCol = useRef(new THREE.Color("#00d2ff"));
  const tStart = useRef(0);
  const lastKey = useRef("");
  const tmp = useMemo(() => new THREE.Color(), []);
  const ambient = ["name", "drone", "globe", "rings", "helix", "sih"];
  const ambientCol = ["#00d2ff", "#7a4dff", "#12f0c0", "#ff7ac6", "#ffd23f", "#ffffff"];

  useEffect(() => {
    const build = () => {
      shapes.current = {
        name: textShape(N, "HARSH"),
        sih: textShape(N, "SIH'25"),
        thanks: textShape(N, "THANK YOU", 11),
        trophy: trophyShape(N),
        drone: droneShape(N),
        helix: helixShape(N),
        rings: ringsShape(N),
        rocket: rocketShape(N),
        globe: globeShape(N, 2.4),
      };
      from.current.set(shapes.current.name);
      to.current.set(shapes.current.name);
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
  }, []);

  useFrame(({ clock, camera }) => {
    const S = shapes.current;
    if (!S || !geo.current || !mat.current || !holder.current) return;
    const galaIdx = getUI().gala;
    const gala = galaIdx !== null;
    // in the gala the show hangs over the sea in front of the pier; otherwise opposite the camera
    if (gala) {
      holder.current.position.lerp(GALA_POS, 0.05);
      holder.current.rotation.y = Math.atan2(-GALA_POS.x + GALA_CAM.pos[0], -GALA_POS.z + GALA_CAM.pos[2]);
    } else {
      const l = Math.hypot(camera.position.x, camera.position.z) || 1;
      holder.current.position.set((-camera.position.x / l) * 85, 36, (-camera.position.z / l) * 85);
      holder.current.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    }
    mat.current.opacity = Math.max(0, world.night * 1.2 - 0.2);
    if (world.night < 0.02) return;
    const t = clock.elapsedTime;
    // pick the current formation
    let key: string, col: string;
    if (gala) {
      const step = GALA_STEPS[Math.min(galaIdx, GALA_STEPS.length - 1)];
      key = step.key;
      col = step.color;
    } else {
      const i = Math.floor(t / 8) % ambient.length;
      key = ambient[i];
      col = ambientCol[i];
    }
    if (key !== lastKey.current) {
      from.current.set(pos);
      fromCol.current.copy(tmp);
      to.current = S[key];
      toCol.current.set(col);
      tStart.current = t;
      lastKey.current = key;
    }
    const f = Math.min((t - tStart.current) / 2.6, 1);
    tmp.copy(fromCol.current).lerp(toCol.current, f);
    const A = from.current,
      B = to.current;
    for (let j = 0; j < N; j++) {
      const ix = j * 3;
      // staggered: each drone leaves a little after its neighbour, then eases in
      const kk = Math.min(Math.max((f - (j % 9) * 0.03) / 0.73, 0), 1);
      const e = kk * kk * (3 - 2 * kk);
      const lift = Math.sin(e * Math.PI) * 0.6;
      pos[ix] = A[ix] + (B[ix] - A[ix]) * e;
      pos[ix + 1] = A[ix + 1] + (B[ix + 1] - A[ix + 1]) * e + lift + Math.sin(t * 1.3 + j) * 0.015;
      pos[ix + 2] = A[ix + 2] + (B[ix + 2] - A[ix + 2]) * e;
      // a sparkle runs through the formation
      const tw = 0.82 + 0.18 * Math.sin(t * 6 + j * 0.37);
      cols[ix] = tmp.r * tw;
      cols[ix + 1] = tmp.g * tw;
      cols[ix + 2] = tmp.b * tw;
    }
    geo.current.attributes.position.needsUpdate = true;
    geo.current.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={holder} scale={5} frustumCulled={false} renderOrder={10}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[cols, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={0.12} vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Fireworks over the water during the gala. */
export function Fireworks() {
  const P = 140,
    B = 6;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * B * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(P * B * 3), 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const bursts = useRef(
    Array.from({ length: B }, () => ({ age: 99, o: new THREE.Vector3(), v: [] as THREE.Vector3[], c: new THREE.Color() }))
  );
  const next = useRef(1);
  const pal = ["#ffd23f", "#ff5a6e", "#12f0c0", "#00d2ff", "#ff7ac6", "#ffffff"];
  useFrame((_, dt) => {
    const on = getUI().gala !== null && world.night > 0.6;
    next.current -= dt;
    if (on && next.current < 0) {
      next.current = 0.7 + Math.random() * 1.6;
      const b = bursts.current.find((q) => q.age > 2.4);
      if (b) {
        b.age = 0;
        b.o.set(GALA_POS.x + (Math.random() - 0.5) * 70, 22 + Math.random() * 22, GALA_POS.z + 10 + Math.random() * 20);
        b.c.set(pal[Math.floor(Math.random() * pal.length)]);
        b.v = Array.from({ length: P }, () => new THREE.Vector3().randomDirection().multiplyScalar(7 + Math.random() * 5));
        sfx("firework");
      }
    }
    const pos = geo.attributes.position.array as Float32Array;
    const col = geo.attributes.color.array as Float32Array;
    bursts.current.forEach((b, bi) => {
      b.age += dt;
      const fade = Math.max(0, 1 - b.age / 2.2);
      for (let i = 0; i < P; i++) {
        const ix = (bi * P + i) * 3;
        const v = b.v[i];
        if (!v || b.age > 2.4) {
          pos[ix + 1] = -999;
          continue;
        }
        pos[ix] = b.o.x + v.x * b.age;
        pos[ix + 1] = b.o.y + v.y * b.age - 4.9 * b.age * b.age * 0.6;
        pos[ix + 2] = b.o.z + v.z * b.age;
        col[ix] = b.c.r * fade;
        col[ix + 1] = b.c.g * fade;
        col[ix + 2] = b.c.b * fade;
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Searchlights sweeping the sky from the beach while the gala runs. */
export function Searchlights() {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#cfe6ff", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    []
  );
  const geo = useMemo(() => {
    const c = new THREE.ConeGeometry(2.4, 70, 24, 1, true);
    c.translate(0, -35, 0);
    c.rotateX(Math.PI);
    return c;
  }, []);
  useFrame(({ clock }) => {
    const on = getUI().gala !== null ? world.night : 0;
    mat.opacity += (on * 0.09 - mat.opacity) * 0.05;
    const t = clock.elapsedTime;
    g.current?.children.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 0.5 + i * 1.3) * 0.5;
      b.rotation.x = -0.35 + Math.cos(t * 0.4 + i) * 0.15;
    });
  });
  return (
    <group ref={g}>
      {[-22, -8, 6, 20].map((x, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[x, 0.5, 52 + (i % 2) * 2]} />
      ))}
    </group>
  );
}
