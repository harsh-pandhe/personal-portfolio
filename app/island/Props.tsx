"use client";

// Small street furniture shared by every zone: benches, flags, lamp posts, planters.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world } from "./store";

const MAT = {
  slat: new THREE.MeshStandardMaterial({ color: "#a8703f", roughness: 0.8 }),
  iron: new THREE.MeshStandardMaterial({ color: "#2a2e35", roughness: 0.45, metalness: 0.6 }),
  pole: new THREE.MeshStandardMaterial({ color: "#e3e6ea", roughness: 0.3, metalness: 0.8 }),
  stone: new THREE.MeshStandardMaterial({ color: "#d9d4c7", roughness: 0.85 }),
  soil: new THREE.MeshStandardMaterial({ color: "#5b4632", roughness: 1 }),
};

/** Seat height of the bench, matched to the seated KayKit visitors at their scale in People.tsx. */
export const SEAT_Y = 0.5;

/** A park bench: five slats on two cast-iron frames with armrests. Origin on the ground, seat facing +z. */
export function Bench({ length = 1.9 }: { length?: number }) {
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={`s${i}`} position={[0, SEAT_Y - 0.03, 0.17 - i * 0.16]} material={MAT.slat} castShadow receiveShadow>
          <boxGeometry args={[length, 0.05, 0.13]} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={`b${i}`} position={[0, SEAT_Y + 0.22 + i * 0.17, -0.27]} rotation-x={-0.18} material={MAT.slat} castShadow>
          <boxGeometry args={[length, 0.12, 0.04]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (length / 2 - 0.12), 0, 0]}>
          {/* front leg, rear leg rising into the back support, seat rail and armrest */}
          <mesh position={[0, SEAT_Y / 2, 0.2]} material={MAT.iron} castShadow>
            <boxGeometry args={[0.06, SEAT_Y, 0.06]} />
          </mesh>
          <mesh position={[0, (SEAT_Y + 0.55) / 2, -0.26]} rotation-x={-0.08} material={MAT.iron} castShadow>
            <boxGeometry args={[0.06, SEAT_Y + 0.55, 0.06]} />
          </mesh>
          <mesh position={[0, SEAT_Y - 0.08, -0.03]} material={MAT.iron}>
            <boxGeometry args={[0.06, 0.06, 0.5]} />
          </mesh>
          <mesh position={[0, SEAT_Y + 0.22, 0.02]} material={MAT.iron} castShadow>
            <boxGeometry args={[0.07, 0.05, 0.46]} />
          </mesh>
          <mesh position={[0, SEAT_Y + 0.1, 0.22]} material={MAT.iron}>
            <boxGeometry args={[0.05, 0.22, 0.05]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Indian national flag drawn to the Flag Code: 3:2, equal bands, a 24-spoke navy Ashoka Chakra. */
function indiaTexture() {
  const W = 600,
    H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  ["#FF671F", "#FFFFFF", "#046A38"].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, (i * H) / 3, W, H / 3 + 1);
  });
  const cx = W / 2,
    cy = H / 2,
    R = (H / 3) * 0.46;
  g.strokeStyle = g.fillStyle = "#06038D";
  g.lineWidth = R * 0.09;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    // tapered spoke
    g.beginPath();
    g.moveTo(cx + Math.cos(a + 0.09) * R * 0.15, cy + Math.sin(a + 0.09) * R * 0.15);
    g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
    g.lineTo(cx + Math.cos(a - 0.09) * R * 0.15, cy + Math.sin(a - 0.09) * R * 0.15);
    g.fill();
    // the small rim dots between spokes
    const b = a + Math.PI / 24;
    g.beginPath();
    g.arc(cx + Math.cos(b) * R * 0.94, cy + Math.sin(b) * R * 0.94, R * 0.035, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let INDIA: THREE.Texture | null = null;

/** A cloth flag on a tapered pole with a finial and a stone footing. The cloth ripples in the wind,
 *  pinned at the hoist and freest at the fly. `kind` is "india" or a plain colour. */
export function Flag({ kind = "india", height = 6, width = 1.8, phase = 0 }: { kind?: "india" | string; height?: number; width?: number; phase?: number }) {
  const H = width / 1.5;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, H, 16, 8);
    g.translate(width / 2, 0, 0);
    return g;
  }, [width, H]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const mat = useMemo(() => {
    if (kind === "india") {
      INDIA ??= indiaTexture();
      return new THREE.MeshStandardMaterial({ map: INDIA, side: THREE.DoubleSide, roughness: 0.85 });
    }
    return new THREE.MeshStandardMaterial({ color: kind, side: THREE.DoubleSide, roughness: 0.85 });
  }, [kind]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (1 + world.rain * 0.8) + phase;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3],
        y = base[i * 3 + 1];
      const k = x / width; // 0 at the pole
      pos.setZ(i, (Math.sin(t * 3.2 - x * 2.6 + y * 0.8) * 0.16 + Math.sin(t * 5.1 - x * 4.2) * 0.05) * k * width * 0.5);
      pos.setY(i, y - k * k * 0.06 * width + Math.sin(t * 2.1 - x * 1.7) * 0.03 * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group>
      <mesh position={[0, 0.15, 0]} material={MAT.stone} receiveShadow castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.3, 12]} />
      </mesh>
      <mesh position={[0, height / 2, 0]} material={MAT.pole} castShadow>
        <cylinderGeometry args={[0.035, 0.065, height, 10]} />
      </mesh>
      <mesh position={[0, height + 0.08, 0]} material={MAT.pole}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      <mesh geometry={geo} material={mat} position={[0.05, height - H / 2 - 0.12, 0]} castShadow />
    </group>
  );
}

/** A heritage street lamp: fluted post, an arm-less lantern head that glows at night. */
export function LampPost({ glow, h = 3.6 }: { glow: THREE.Material; h?: number }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} material={MAT.iron} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.4, 8]} />
      </mesh>
      <mesh position={[0, h / 2, 0]} material={MAT.iron} castShadow>
        <cylinderGeometry args={[0.055, 0.08, h, 8]} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]} material={MAT.iron}>
        <cylinderGeometry args={[0.2, 0.12, 0.12, 8]} />
      </mesh>
      <mesh position={[0, h + 0.33, 0]} material={glow}>
        <cylinderGeometry args={[0.17, 0.12, 0.45, 8]} />
      </mesh>
      <mesh position={[0, h + 0.65, 0]} material={MAT.iron}>
        <coneGeometry args={[0.26, 0.24, 8]} />
      </mesh>
    </group>
  );
}

/** A square stone planter with clipped shrubs. */
export function Planter({ size = 1.4, leaf }: { size?: number; leaf: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={MAT.stone} castShadow receiveShadow>
        <boxGeometry args={[size, 0.6, size]} />
      </mesh>
      <mesh position={[0, 0.58, 0]} material={MAT.soil}>
        <boxGeometry args={[size - 0.16, 0.04, size - 0.16]} />
      </mesh>
      <mesh position={[0, 0.98, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[size * 0.42, 1]} />
      </mesh>
    </group>
  );
}

export const PROP_MAT = MAT;

/** Hook: an emissive material that follows night mode (lamps, lanterns). */
export function useNightGlow(color: string, day = 0.05, night = 3) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 }), [color, day]);
  const r = useRef(m);
  useFrame(() => {
    r.current.emissiveIntensity = day + (night - day) * world.night;
  });
  return m;
}
