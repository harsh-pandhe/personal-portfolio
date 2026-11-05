"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt, rng } from "./terrain";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { world } from "./store";

/** Same placement rule as the landmarks: +z of the group points at HQ. */
function At({ id, children }: { id: ZoneId; children: React.ReactNode }) {
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  return (
    <group position={[x, heightAt(x, zz), zz]} rotation-y={Math.atan2(-x, -zz)}>
      {children}
    </group>
  );
}

function glow(color: string) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
}

/* ---------- The Arena: a cheering crowd in the stands, floodlights and a scoreboard ---------- */
function ArenaLife() {
  const lamp = useMemo(() => glow("#fff7d6"), []);
  useFrame(() => (lamp.emissiveIntensity = 0.3 + world.night * 3));
  const board = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b0d12";
    g.fillRect(0, 0, 512, 192);
    g.fillStyle = "#f5b301";
    g.font = "700 30px monospace";
    g.fillText("SIH 2025 · FINAL", 24, 50);
    g.fillStyle = "#ffffff";
    g.font = "800 58px sans-serif";
    g.fillText("ALGO SAPIENS", 24, 118);
    g.fillStyle = "#12f0c0";
    g.font = "700 28px monospace";
    g.fillText("NATIONAL WINNER ★", 24, 166);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.8 });
  }, []);
  return (
    <At id="arena">
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * 12.6, 0, sz * 12.6 - 1]}>
            <mesh position={[0, 5.5, 0]}>
              <cylinderGeometry args={[0.14, 0.2, 11, 8]} />
              <meshStandardMaterial color="#d9dde3" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 11.2, 0]} rotation-y={Math.atan2(-sx, -sz)} material={lamp}>
              <boxGeometry args={[1.4, 0.8, 0.3]} />
            </mesh>
          </group>
        ))
      )}
      <group position={[0, 4.4, -15.6]}>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[0.2, 5, 0.2]} />
          <meshStandardMaterial color="#2a2f36" />
        </mesh>
        <mesh position={[0, 5.4, 0.12]} material={board}>
          <planeGeometry args={[4.2, 1.6]} />
        </mesh>
      </group>
    </At>
  );
}

/* ---------- Trading floor: a golden bull ---------- */
function Bull() {
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9a514", metalness: 1, roughness: 0.25 }), []);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.25 + 0.6;
  });
  const parts: [number, number, number, number, number, number][] = [
    [0, 1.2, 0, 2.2, 1.1, 1.0], // body
    [1.25, 1.55, 0, 0.8, 0.8, 0.75], // head
    [1.65, 1.3, 0, 0.4, 0.4, 0.55], // snout
    [-0.8, 0.45, 0.32, 0.25, 0.9, 0.25],
    [-0.8, 0.45, -0.32, 0.25, 0.9, 0.25],
    [0.75, 0.45, 0.32, 0.25, 0.9, 0.25],
    [0.75, 0.45, -0.32, 0.25, 0.9, 0.25],
  ];
  return (
    <At id="trading">
      {/* clear of the approach benches (±4.9, 3.9), the tower and the wall pylons */}
      <group position={[-10.5, 0, 0.5]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[3.4, 0.4, 2]} />
          <meshStandardMaterial color="#1d2128" roughness={0.6} />
        </mesh>
        <group ref={g} position={[0, 0.4, 0]}>
          {parts.map((p, i) => (
            <mesh key={i} position={[p[0], p[1], p[2]]} material={gold} castShadow>
              <boxGeometry args={[p[3], p[4], p[5]]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[1.35, 2.05, s * 0.38]} rotation={[s * 0.6, 0, -0.5]} material={gold}>
              <coneGeometry args={[0.1, 0.7, 8]} />
            </mesh>
          ))}
        </group>
      </group>
    </At>
  );
}

/* ---------- Workshop: a conveyor of crates and a working 3D printer ---------- */
function WorkshopLife() {
  const boxes = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const part = useRef<THREE.Mesh>(null);
  const cols = ["#7a4dff", "#2d5bff", "#12f0c0", "#f5b301", "#ff7ac6"];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    boxes.current?.children.forEach((b, i) => {
      const k = ((t * 0.12 + i / 6) % 1) * 7 - 3.5;
      b.position.set(k, 0.95, 0);
    });
    if (head.current) {
      head.current.position.x = Math.sin(t * 3.1) * 0.45;
      head.current.position.z = Math.cos(t * 2.3) * 0.35;
    }
    if (part.current) {
      const k = (t * 0.05) % 1;
      part.current.scale.y = Math.max(0.02, k);
      part.current.position.y = 0.55 + k * 0.3;
    }
  });
  return (
    <At id="workshop">
      {/* conveyor */}
      <group position={[-3.5, 0, -4.4]} rotation-y={0.2}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[7.4, 0.2, 1.1]} />
          <meshStandardMaterial color="#2a2f36" roughness={0.6} />
        </mesh>
        {[-3.4, 3.4].map((x) => (
          <mesh key={x} position={[x, 0.35, 0]}>
            <boxGeometry args={[0.2, 0.7, 1.1]} />
            <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        <group ref={boxes}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} castShadow>
              <boxGeometry args={[0.6, 0.5, 0.6]} />
              <meshStandardMaterial color={cols[i % cols.length]} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      {/* 3D printer */}
      <group position={[5.8, 0, 2.2]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.6, 0.5, 1.6]} />
          <meshStandardMaterial color="#f2f3f5" roughness={0.5} />
        </mesh>
        {[
          [-0.75, -0.75],
          [0.75, -0.75],
          [-0.75, 0.75],
          [0.75, 0.75],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 1.1, z]}>
            <boxGeometry args={[0.08, 1.7, 0.08]} />
            <meshStandardMaterial color="#2a2f36" />
          </mesh>
        ))}
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[1.6, 0.08, 1.6]} />
          <meshStandardMaterial color="#2a2f36" />
        </mesh>
        <mesh ref={head} position={[0, 1.35, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.28]} />
          <meshStandardMaterial color="#7a4dff" emissive="#7a4dff" emissiveIntensity={0.5} />
        </mesh>
        <mesh ref={part} position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
          <meshStandardMaterial color="#12f0c0" roughness={0.4} />
        </mesh>
      </group>
    </At>
  );
}

/* ---------- Library: pages drifting above the monoliths ---------- */
function Pages() {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 170;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 128, 170);
    x.fillStyle = "#1d2128";
    x.fillRect(12, 14, 80, 8);
    x.fillStyle = "#9aa3ad";
    for (let i = 0; i < 12; i++) x.fillRect(12, 34 + i * 10, 104 - (i % 4) * 14, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const pages = useMemo(() => {
    const r = rng(4);
    return Array.from({ length: 34 }, () => ({ x: (r() - 0.5) * 16, z: -6 + (r() - 0.5) * 20, y: 3 + r() * 9, ph: r() * 6, s: 0.35 + r() * 0.3 }));
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((p, i) => {
      const q = pages[i];
      p.position.set(q.x + Math.sin(t * 0.3 + q.ph) * 0.8, q.y + Math.sin(t * 0.8 + q.ph) * 0.5, q.z + Math.cos(t * 0.25 + q.ph) * 0.6);
      p.rotation.set(Math.sin(t * 0.5 + q.ph) * 0.4, t * 0.4 + q.ph, Math.cos(t * 0.6 + q.ph) * 0.3);
    });
  });
  return (
    <At id="library">
      <group ref={g}>
        {pages.map((q, i) => (
          <mesh key={i} scale={q.s}>
            <planeGeometry args={[1, 1.33]} />
            <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* reading benches */}
      {[-3, 3].map((x) => (
        <group key={x} position={[x, 0, 3.4]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[2.2, 0.12, 0.6]} />
            <meshStandardMaterial color="#b07a4c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[1.8, 0.4, 0.4]} />
            <meshStandardMaterial color="#eef1f4" />
          </mesh>
        </group>
      ))}
    </At>
  );
}

/* ---------- Home: a picket fence, a flower bed and a sleeping cat ---------- */
function HomeLife() {
  const cat = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cat.current) cat.current.scale.y = 1 + Math.sin(t * 1.6) * 0.04;
    if (tail.current) tail.current.rotation.y = Math.sin(t * 0.9) * 0.4;
  });
  const fur = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f0a35e", roughness: 0.9 }), []);
  const pickets = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 26; i++) {
      const x = -6.5 + i * 0.5;
      if (Math.abs(x) < 1.2) continue; // gate
      out.push([x, 1.4]);
    }
    return out;
  }, []);
  return (
    <At id="home">
      {pickets.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]} castShadow>
          <boxGeometry args={[0.12, 0.9, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
      ))}
      {[0.3, 0.7].map((y) => (
        <mesh key={y} position={[0, y, 1.4]}>
          <boxGeometry args={[13, 0.07, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* flower bed under the windows */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[-2.9 + (i % 8) * 0.25 + (i > 7 ? 3.9 : 0), 0.18, -0.1]}>
          <icosahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial color={["#ff8fb1", "#ffd23f", "#9b7bff"][i % 3]} />
        </mesh>
      ))}
      {/* the cat, asleep on the porch */}
      <group ref={cat} position={[1.4, 0.05, 0.2]} rotation-y={0.6}>
        <mesh position={[0, 0.18, 0]} scale={[0.42, 0.22, 0.28]} material={fur}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        <mesh position={[0.38, 0.24, 0.05]} scale={0.17} material={fur}>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.42, 0.4, 0.05 + s * 0.09]} material={fur}>
            <coneGeometry args={[0.05, 0.1, 4]} />
          </mesh>
        ))}
        <mesh ref={tail} position={[-0.38, 0.1, 0]} material={fur}>
          <torusGeometry args={[0.18, 0.04, 6, 12, Math.PI]} />
        </mesh>
      </group>
    </At>
  );
}

export default function Extras() {
  return (
    <>
      <ArenaLife />
      <Bull />
      <WorkshopLife />
      <Pages />
      <HomeLife />
    </>
  );
}
