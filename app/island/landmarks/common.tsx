"use client";

import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { zoneToWorld } from "../colliders";
import { heightAt } from "../terrain";
import { zoneById, zonePos, type ZoneId } from "../zones";
import { setUI, TOUR, useUI, world } from "../store";
import { Solid } from "../Props";

/* ---------------- shared materials ---------------- */
export const M = {
  metal: new THREE.MeshStandardMaterial({ color: "#eef2f7", metalness: 0.75, roughness: 0.18 }),
  white: new THREE.MeshStandardMaterial({ color: "#f7f8fa", roughness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: "#1d2128", roughness: 0.6, metalness: 0.3 }),
  // plain transparent glass: transmission would re-render the whole scene every frame
  glass: new THREE.MeshStandardMaterial({ color: "#cfefff", roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.45, depthWrite: false }),
  gold: new THREE.MeshStandardMaterial({ color: "#f5b301", metalness: 1, roughness: 0.22 }),
  red: new THREE.MeshStandardMaterial({ color: "#e5322d", roughness: 0.45, metalness: 0.2 }),
  wood: new THREE.MeshStandardMaterial({ color: "#a8754a", roughness: 0.9 }),
};

/** Emissive material whose glow follows night mode. */
export function useGlow(color: string, day = 0.25, night = 2.2) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 }), [color, day]);
  useFrame(() => {
    m.emissiveIntensity = day + (night - day) * world.night;
  });
  return m;
}

export function fontFamily() {
  if (typeof document === "undefined") return "sans-serif";
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

/* ---------------- billboards ---------------- */
function boardTexture(id: ZoneId) {
  const z = zoneById[id];
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 600;
  const g = c.getContext("2d")!;
  const ff = fontFamily();
  g.fillStyle = "#0b0d12";
  g.fillRect(0, 0, 1024, 600);
  const grd = g.createLinearGradient(0, 0, 1024, 0);
  grd.addColorStop(0, z.accent);
  grd.addColorStop(1, "#00d2ff");
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 10);
  g.fillStyle = z.accent;
  g.font = `500 26px ${ff}`;
  g.fillText(z.team.toUpperCase(), 56, 80);
  g.fillStyle = "#ffffff";
  g.font = `700 92px ${ff}`;
  g.fillText(z.name, 52, 190);
  // headline, wrapped
  g.font = `500 44px ${ff}`;
  g.fillStyle = "rgba(255,255,255,0.78)";
  const words = z.headline.split(" ");
  let line = "",
    y = 290;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > 900) {
      g.fillText(line, 56, y);
      line = w;
      y += 58;
    } else line = t;
  }
  g.fillText(line, 56, y);
  g.fillStyle = z.accent;
  g.font = `600 30px ${ff}`;
  g.fillText("Open  ↗", 56, 548);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.font = `500 26px ${ff}`;
  g.fillText(`press E  ·  ${z.key}`, 790, 548);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function hoverHandlers(id: ZoneId) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setUI({ open: id });
    },
  };
}

export function Billboard({ id, pos, rotY, scale = 1 }: { id: ZoneId; pos: [number, number, number]; rotY: number; scale?: number }) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  const accent = zoneById[id].accent;
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef2f7", metalness: 0.75, roughness: 0.18, emissive: accent, emissiveIntensity: 0 }), [accent]);
  useEffect(() => {
    let t: THREE.CanvasTexture | null = null;
    const make = () => {
      t = boardTexture(id);
      setTex(t);
    };
    if (document.fonts?.ready) document.fonts.ready.then(make);
    else make();
    return () => t?.dispose();
  }, [id]);
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.55, roughness: 0.35 }), []);
  const back = useMemo(() => {
    if (typeof document === "undefined") return null;
    const z = zoneById[id];
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 300;
    const g = c.getContext("2d")!;
    g.fillStyle = "#171b22";
    g.fillRect(0, 0, 512, 300);
    g.fillStyle = z.accent;
    g.fillRect(0, 0, 512, 8);
    g.fillRect(0, 292, 512, 8);
    g.fillStyle = "rgba(255,255,255,.45)";
    g.font = `600 22px ${fontFamily()}`;
    g.fillText("MISSION ISLAND", 32, 64);
    g.fillStyle = "#ffffff";
    g.font = `700 54px ${fontFamily()}`;
    g.fillText(z.name, 32, 150);
    g.fillStyle = z.accent;
    g.font = `600 22px ${fontFamily()}`;
    g.fillText("This way to the front  ↻", 32, 252);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  }, [id]);
  useEffect(() => {
    screen.map = tex;
    screen.emissiveMap = tex;
    screen.needsUpdate = true;
  }, [tex, screen]);
  useFrame((_, dt) => {
    screen.emissiveIntensity = 0.55 + 0.6 * world.night + (hover ? 0.25 : 0);
    frame.emissiveIntensity += ((hover ? 0.9 : 0) - frame.emissiveIntensity) * Math.min(dt * 8, 1);
    if (g.current) {
      const s = scale * (hover ? 1.04 : 1);
      g.current.scale.x += (s - g.current.scale.x) * Math.min(dt * 8, 1);
      g.current.scale.y = g.current.scale.z = g.current.scale.x;
    }
  });
  const h = hoverHandlers(id);
  // sit on the ground under the board itself, not the zone centre's height
  const y = useMemo(() => pos[1] + groundOffset(id, pos[0], pos[2]), [id, pos]);
  return (
    <group ref={g} position={[pos[0], y, pos[2]]} rotation-y={rotY} scale={scale} userData={{ dynamic: true }}>
      {[-2.2, 2.2].map((x) => (
        // posts run 1 m into the ground so they stay planted on a slope
        <mesh key={x} position={[x, 0.9, -0.32]} material={M.metal} castShadow>
          <boxGeometry args={[0.18, 3.8, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, -0.12]} material={frame} castShadow>
        <boxGeometry args={[5.4, 3.3, 0.16]} />
      </mesh>
      <mesh
        position={[0, 3.6, -0.03]}
        material={screen}
        onPointerOver={(e) => {
          h.onPointerOver(e);
          setHover(true);
        }}
        onPointerOut={() => {
          h.onPointerOut();
          setHover(false);
        }}
        onClick={h.onClick}
      >
        <planeGeometry args={[5.1, 3.0]} />
      </mesh>
      {/* the back of the sign carries the zone's name, so it isn't a blank panel from behind */}
      {back && (
        <mesh position={[0, 3.6, -0.205]} rotation-y={Math.PI} material={back}>
          <planeGeometry args={[5.1, 3.0]} />
        </mesh>
      )}
      <Solid w={5.4} d={0.7} position={[0, 0, -0.25]} />
      {/* little concrete footings */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.08, -0.32]} material={M.white} receiveShadow>
          <boxGeometry args={[0.5, 0.16, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

/** Small floating pill above each zone, visible from the overview. */
export function ZoneLabel({ id, y }: { id: ZoneId; y: number }) {
  const { mode, near, tour } = useUI();
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  const show = (mode === "tour" && TOUR[tour] === id) || (mode === "explore" && near === id);
  if (!show) return null; // drei Html costs a DOM update per frame, so only mount what's visible
  return (
    <Html position={[x, heightAt(x, zz) + y, zz]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        className={`whitespace-nowrap rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[12px] font-semibold tracking-tight text-neutral-900 shadow-lg backdrop-blur transition-all duration-500 ${
          show ? "opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: z.accent }} />
        {z.name}
      </div>
    </Html>
  );
}

/** Place a zone group on the terrain, facing the island centre. */
/** Ground height at a zone-local point, relative to the zone centre (ZoneGroup's origin). */
function groundOffset(id: ZoneId, lx: number, lz: number) {
  const [x, z] = zonePos(zoneById[id]);
  const [wx, wz] = id === "hq" ? [lx, lz] : zoneToWorld(id, lx, lz);
  return heightAt(wx, wz) - heightAt(x, z);
}

export function ZoneGroup({ id, children }: { id: ZoneId; children: React.ReactNode }) {
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  const face = Math.atan2(-x, -zz); // +z of the group points at HQ
  return (
    <group position={[x, heightAt(x, zz), zz]} rotation-y={id === "hq" ? 0 : face}>
      {children}
    </group>
  );
}

/** UVs in metres on a BoxGeometry (u along the face's width, v up its height), so tiled façade
 *  textures keep the same window size on faces of any size. Face order: +x, -x, +y, -y, +z, -z. */
export function boxMetres(w: number, h: number, d: number, metres = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / metres, (uv.getY(i) * dims[f][1]) / metres);
    }
  return g;
}

/** A tileable façade: one texture tile is one storey (3.2 m) by one bay (3.2 m). `kind` picks the
 *  look; windows on the emissive map light up at night (drive emissiveIntensity from world.night). */
export function facadeMaterial(kind: "glass" | "plaster" | "concrete", seed = 1) {
  const S = 128;
  const draw = (lit: boolean) => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    let s = seed * 9301 + (lit ? 7 : 3);
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    if (kind === "glass") {
      g.fillStyle = lit ? "#000" : "#7d9cb8";
      g.fillRect(0, 0, S, S);
      // glazing with a floor slab band and two mullions per bay
      if (!lit) {
        const grd = g.createLinearGradient(0, 0, 0, S);
        grd.addColorStop(0, "#9cc0db");
        grd.addColorStop(1, "#5d7f9c");
        g.fillStyle = grd;
        g.fillRect(0, 0, S, S - 18);
      } else if (r() < 0.6) {
        g.fillStyle = "#ffe0a0";
        g.fillRect(4, 8, S - 8, S - 32);
      }
      g.fillStyle = lit ? "#000" : "#e8edf2";
      g.fillRect(0, S - 18, S, 18);
      [0, S / 2].forEach((x) => g.fillRect(x, 0, 5, S));
    } else if (kind === "plaster") {
      g.fillStyle = lit ? "#000" : "#f1ece2";
      g.fillRect(0, 0, S, S);
      {
        // a window with a sill in every bay (one tile repeats across the wall)
        g.fillStyle = lit ? (r() < 0.7 ? "#ffd27a" : "#000") : "#4e6478";
        g.fillRect(36, 30, 56, 62);
        if (!lit) {
          g.fillStyle = "#d8d1c3";
          g.fillRect(30, 92, 68, 7);
          g.fillStyle = "#6f8aa0";
          g.fillRect(63, 30, 3, 62);
        }
      }
    } else {
      g.fillStyle = lit ? "#000" : "#c9ccd0";
      g.fillRect(0, 0, S, S);
      if (!lit) {
        g.fillStyle = "#b3b7bc";
        for (let x = 0; x < S; x += 32) g.fillRect(x, 0, 6, S); // fins
        g.fillStyle = "#a9adb2";
        g.fillRect(0, S - 6, S, 6);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 3.2, 1 / 3.2);
    t.anisotropy = 4;
    return t;
  };
  return new THREE.MeshStandardMaterial({ map: draw(false), emissiveMap: draw(true), emissive: "#ffffff", emissiveIntensity: 0, roughness: kind === "glass" ? 0.25 : 0.85, metalness: kind === "glass" ? 0.4 : 0 });
}
