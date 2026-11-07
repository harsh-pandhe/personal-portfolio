"use client";

// Small street furniture shared by every zone: benches, flags, lamp posts, planters.
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addCollider } from "./colliders";
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
      <Solid w={length} d={0.65} />
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
  const at = useRef<THREE.Group>(null);
  const wp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock, camera }) => {
    // cloth is only worth simulating where you can see it ripple
    if (at.current && camera.position.distanceTo(at.current.getWorldPosition(wp)) > 70) return;
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
      <Solid r={0.4} />
      <mesh position={[0, 0.15, 0]} material={MAT.stone} receiveShadow castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.3, 12]} />
      </mesh>
      <mesh position={[0, height / 2, 0]} material={MAT.pole} castShadow>
        <cylinderGeometry args={[0.035, 0.065, height, 10]} />
      </mesh>
      <mesh position={[0, height + 0.08, 0]} material={MAT.pole}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      <group ref={at} userData={{ dynamic: true }}>
        <mesh geometry={geo} material={mat} position={[0.05, height - H / 2 - 0.12, 0]} castShadow />
      </group>
    </group>
  );
}

/** A heritage street lamp: fluted post, an arm-less lantern head that glows at night. */
export function LampPost({ glow, h = 3.6 }: { glow: THREE.Material; h?: number }) {
  return (
    <group>
      <Solid r={0.25} />
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
      <Solid w={size} d={size} />
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

const _p = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(),
  _e = new THREE.Euler();
/** An invisible marker that makes the ground footprint around it solid for the player: a box
 *  `w` x `d` (local x, z) or a circle of radius `r`, read from its own world transform on mount. */
export function Solid({ w, d, r, position }: { w?: number; d?: number; r?: number; position?: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    g.matrixWorld.decompose(_p, _q, _s);
    const yaw = _e.setFromQuaternion(_q, "YXZ").y;
    if (r) return addCollider({ kind: "circle", x: _p.x, z: _p.z, r: r * _s.x });
    return addCollider({ kind: "box", x: _p.x, z: _p.z, hw: ((w ?? 1) * _s.x) / 2, hd: ((d ?? 1) * _s.z) / 2, rot: yaw });
  }, [w, d, r]);
  return <group ref={ref} position={position} />;
}

/** Merge every static mesh under `root` into one mesh per material (and shadow flags), in root's
 *  own frame, and drop the originals. Turns a few hundred small boxes into a handful of draw calls.
 *  Skips instanced and skinned meshes, multi-material meshes, anything with pointer handlers and
 *  anything flagged `userData.dynamic`. */
/** Bucket key for a material. Materials written inline in JSX (<meshStandardMaterial color=… />) are a
 *  new object per mesh, so identical-looking ones are keyed by their look and merge together; materials
 *  passed in as objects (shared, possibly animated by code) keep their own identity. */
function materialKey(mat: THREE.Material) {
  if (!(mat as unknown as { __r3f?: unknown }).__r3f || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return mat.uuid;
  const s = mat as THREE.MeshStandardMaterial;
  return [
    s.type, s.color.getHexString(), s.emissive.getHexString(), s.emissiveIntensity, s.roughness, s.metalness,
    s.map?.uuid, s.emissiveMap?.uuid, s.transparent, s.opacity, s.side, s.flatShading, s.vertexColors, s.toneMapped,
    s.polygonOffset, s.depthWrite,
  ].join("/");
}

export function bakeStatic(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[] }>();
  const drop: THREE.Mesh[] = [];
  const m4 = new THREE.Matrix4();
  root.traverse((o) => {
    const m = o as THREE.Mesh & { __r3f?: { handlers?: Record<string, unknown> } };
    if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(m.material) || m.userData.dynamic || !m.visible) return;
    if (m.__r3f?.handlers && Object.keys(m.__r3f.handlers).length) return;
    for (let p = m.parent; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const keep = new THREE.BufferGeometry();
    for (const k of ["position", "normal", "uv"]) keep.setAttribute(k, g.attributes[k]);
    g = keep;
    const key = `${materialKey(m.material)}|${m.castShadow}|${m.receiveShadow}`;
    const b = buckets.get(key) ?? { mat: m.material, cast: m.castShadow, recv: m.receiveShadow, geos: [] };
    b.geos.push(g);
    buckets.set(key, b);
    drop.push(m);
  });
  if (drop.length < 4) return; // nothing worth merging
  for (const m of drop) m.parent?.remove(m);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    root.add(mesh);
  }
}

/** Children of this group are static: after they mount they are merged per material (bakeStatic). */
export function Static({ children, ...rest }: { children: React.ReactNode } & Omit<React.ComponentProps<"group">, "children">) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (ref.current) bakeStatic(ref.current);
  }, []);
  return (
    <group ref={ref} {...rest}>
      {children}
    </group>
  );
}
