"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ZONES } from "../zones";
import { world } from "../store";
import { papers } from "@/lib/achievements";
import { M, useGlow, fontFamily, Billboard, ZoneGroup } from "./common";

/* ================= ZONES ================= */

/* Mission Control's live ring: four screens orbiting the tower. Countdown to the Singapore finale,
   mission log, headline numbers and an IST clock with uplink bars. */
const FINALE = Date.UTC(2026, 10, 15, 1, 0); // 15 Nov 2026, 09:00 SGT
function ControlRing() {
  const g = useRef<THREE.Group>(null);
  const ff = useMemo(() => fontFamily(), []);
  const panels = useMemo(
    () =>
      [0, 1, 2, 3].map(() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 320;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return { c, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.8, side: THREE.DoubleSide }) };
      }),
    []
  );
  const acc = useRef(1);
  useFrame(({ clock }, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.12;
    panels.forEach((p) => (p.mat.emissiveIntensity = 0.7 + world.night * 1.1));
    acc.current += dt;
    if (acc.current < 1) return;
    acc.current = 0;
    const now = Date.now();
    const draw = (i: number, title: string, col: string, body: (x: CanvasRenderingContext2D) => void) => {
      const x = panels[i].c.getContext("2d")!;
      x.fillStyle = "#060b16";
      x.fillRect(0, 0, 512, 320);
      x.fillStyle = col;
      x.fillRect(0, 0, 512, 8);
      x.font = `700 24px ${ff}`;
      x.fillText(title, 24, 48);
      body(x);
      panels[i].tex.needsUpdate = true;
    };
    const left = Math.max(0, FINALE - now);
    const d = Math.floor(left / 864e5),
      h = Math.floor((left / 36e5) % 24),
      m = Math.floor((left / 6e4) % 60),
      sec = Math.floor((left / 1e3) % 60);
    draw(0, "T-MINUS · SINGAPORE FINALE", "#00d2ff", (x) => {
      x.fillStyle = "#ffffff";
      x.font = `800 84px ${ff}`;
      x.fillText(left ? `${d}d ${String(h).padStart(2, "0")}h` : "LIVE", 24, 160);
      x.font = `700 44px ${ff}`;
      x.fillStyle = "#9fdcff";
      x.fillText(`${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`, 24, 222);
      x.font = `500 22px ${ff}`;
      x.fillStyle = "rgba(255,255,255,.6)";
      x.fillText("SMU Singapore · 15–17 Nov 2026", 24, 286);
    });
    draw(1, "MISSION LOG", "#12f0c0", (x) => {
      const rows: [string, string, string][] = [
        ["SIH 2025", "NATIONAL WINNER", "#ffd23f"],
        ["RoboRashtra", "1ST RUNNER-UP", "#12f0c0"],
        ["IRoC-U 2026", "FINALIST", "#ff7a45"],
        ["Doppelmayr", "COMPLETE", "#9fb3ad"],
        ["Singapore", "NEXT", "#00d2ff"],
      ];
      rows.forEach(([k, v, c], i) => {
        x.fillStyle = "#c9d6e2";
        x.font = `600 24px ${ff}`;
        x.fillText(k, 24, 98 + i * 44);
        x.fillStyle = c;
        x.font = `800 22px ${ff}`;
        x.fillText(v, 290, 98 + i * 44);
      });
    });
    draw(2, "BY THE NUMBERS", "#ffd23f", (x) => {
      const nums: [string, string][] = [
        ["6", "SSRN papers"],
        ["102", "public repos"],
        ["45", "builds on the board"],
        ["161", "LinkedIn posts"],
      ];
      nums.forEach(([n, l], i) => {
        const cx = 24 + (i % 2) * 244,
          cy = 130 + Math.floor(i / 2) * 120;
        x.fillStyle = "#ffffff";
        x.font = `800 64px ${ff}`;
        x.fillText(n, cx, cy);
        x.fillStyle = "rgba(255,255,255,.6)";
        x.font = `500 20px ${ff}`;
        x.fillText(l, cx, cy + 32);
      });
    });
    draw(3, "UPLINK · NAVI MUMBAI", "#ff7ac6", (x) => {
      const ist = new Date(now + 5.5 * 36e5);
      x.fillStyle = "#ffffff";
      x.font = `800 72px ${ff}`;
      x.fillText(`${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}:${String(ist.getUTCSeconds()).padStart(2, "0")}`, 24, 150);
      x.fillStyle = "rgba(255,255,255,.6)";
      x.font = `500 22px ${ff}`;
      x.fillText("IST · all systems nominal", 24, 188);
      const t = clock.elapsedTime;
      for (let i = 0; i < 14; i++) {
        const hh = 20 + Math.abs(Math.sin(t * 1.7 + i * 0.9)) * 70;
        x.fillStyle = i % 3 ? "#ff7ac6" : "#00d2ff";
        x.fillRect(24 + i * 32, 300 - hh, 20, hh);
      }
    });
  });
  return (
    <group ref={g} position={[0, 9.6, 0]}>
      {panels.map((p, i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 2.9, 0, Math.cos(a) * 2.9]} rotation-y={a}>
            <mesh material={p.mat}>
              <planeGeometry args={[3.2, 2]} />
            </mesh>
            <mesh position={[0, 0, -0.04]} material={M.dark}>
              <boxGeometry args={[3.35, 2.15, 0.06]} />
            </mesh>
            <mesh position={[0, 0, -1.4]} rotation-x={Math.PI / 2} material={M.metal}>
              <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function HQ() {
  const dish = useRef<THREE.Group>(null);
  const ring = useGlow("#2d5bff", 0.4, 2.5);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.6;
  });
  return (
    <ZoneGroup id="hq">
      {/* the tower rises from the stone island in the middle of the fountain (Plaza.tsx) */}
      <mesh position={[0, 7, 0]} material={M.metal} castShadow>
        <cylinderGeometry args={[0.9, 1.4, 14, 24]} />
      </mesh>
      {[4.5, 8, 11.2].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={i === 1 ? ring : M.metal} castShadow>
          <torusGeometry args={[1.9 - i * 0.25, 0.14, 8, 40]} />
        </mesh>
      ))}
      <mesh position={[0, 14.4, 0]} material={M.glass}>
        <sphereGeometry args={[1.3, 24, 16]} />
      </mesh>
      <group ref={dish} position={[0, 15.8, 0]}>
        <mesh material={M.metal}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        </mesh>
        <mesh position={[0.4, 0.6, 0]} rotation-z={-0.9} material={M.white}>
          <sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, 1.0]} />
        </mesh>
      </group>
      <ControlRing />
      <Billboard id="hq" pos={[3.5, 0, 15.6]} rotY={0.12} scale={0.9} />
    </ZoneGroup>
  );
}
