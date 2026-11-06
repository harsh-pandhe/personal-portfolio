"use client";

// HARSH PANDHE in giant dot-matrix letters on the northern mountains, behind the island like the
// Hollywood sign. Each letter is planted on the mountainside (Env.tsx mountainHeight) on two posts;
// at night the dots glow like the drone show.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mountainHeight } from "./Env";
import { world } from "./store";

const GLYPHS: Record<string, string[]> = {
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};

const WORD = "HARSH PANDHE";
const PX = 2.1; // one dot, metres: letters are ~15 m tall
const HEAD = { rx: 92, ry: 11, rz: 34, y: -6 }; // the headland: half-length along the sign, height, half-depth, centre height

export default function HillSign() {
  const dots = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.Mesh>(null);
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8fbad0", roughness: 1, flatShading: true }), []);
  const headDay = useMemo(() => new THREE.Color("#8fbad0"), []);
  const headNight = useMemo(() => new THREE.Color("#1a2244"), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f6f3ec", roughness: 0.5, emissive: "#ffe6b0", emissiveIntensity: 0 }), []);
  const count = useMemo(() => [...WORD].reduce((n, ch) => n + (GLYPHS[ch]?.join("").split("1").length ?? 1) - 1, 0), []);
  const letters = WORD.replace(/ /g, "").length;

  // the spot: roughly north, where the mountains stand highest under the whole word
  const spot = useMemo(() => {
    const width = WORD.length * 6 * PX - PX;
    let best = { score: -Infinity, bearing: -Math.PI / 2, dist: 300 };
    for (let deg = -40; deg <= 40; deg += 2)
      for (let dist = 240; dist <= 400; dist += 4) {
        const bearing = -Math.PI / 2 + (deg * Math.PI) / 180;
        const o = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing));
        const a = new THREE.Vector3(-o.z, 0, o.x);
        let lo = Infinity;
        for (let k = 0; k <= 20; k++) {
          const p = o.clone().multiplyScalar(dist).addScaledVector(a, -width / 2 + (k / 20) * width);
          lo = Math.min(lo, mountainHeight(p.x, p.z));
        }
        // high ground, then near due north, then close in (so it reads large)
        const score = lo - Math.abs(deg) * 0.15 - (dist - 240) * 0.04;
        if (score > best.score) best = { score, bearing, dist };
      }
    return best;
  }, []);

  useEffect(() => {
    const out = new THREE.Vector3(Math.cos(spot.bearing), 0, Math.sin(spot.bearing));
    const along = new THREE.Vector3(-out.z, 0, out.x); // left to right as seen from the island
    const face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out.clone().negate());
    // a headland under the sign, so it never stands in the water where the range dips
    const centre = out.clone().multiplyScalar(spot.dist);
    const ground = (p: THREE.Vector3) => {
      const dx = p.clone().sub(centre);
      const e = 1 - (dx.dot(along) / HEAD.rx) ** 2 - (dx.dot(out) / HEAD.rz) ** 2;
      return Math.max(mountainHeight(p.x, p.z), e > 0 ? HEAD.y + HEAD.ry * Math.sqrt(e) : -Infinity);
    };
    head.current!.position.set(centre.x, HEAD.y, centre.z);
    head.current!.rotation.y = -spot.bearing - Math.PI / 2;
    const m = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    const width = WORD.length * 6 * PX - PX;
    // one straight baseline, clear of the highest ground under (and just behind) any letter; posts run down to the slope
    let top = -Infinity;
    for (let s = -width / 2; s <= width / 2; s += PX) for (const b of [0, 1.5]) top = Math.max(top, ground(centre.clone().addScaledVector(along, s).addScaledVector(out, b)));
    const base = top + 1.5;
    let di = 0,
      pi = 0;
    [...WORD].forEach((ch, li) => {
      const g = GLYPHS[ch];
      if (!g) return;
      const c = out.clone().multiplyScalar(spot.dist).addScaledVector(along, -width / 2 + li * 6 * PX + 2 * PX);
      const feet = [-1.6, 1.6].map((s) => c.clone().addScaledVector(along, s * PX));
      g.forEach((row, ri) =>
        [...row].forEach((on, ci) => {
          if (on !== "1") return;
          const p = c.clone().addScaledVector(along, (ci - 2) * PX);
          p.y = base + (6 - ri) * PX + PX / 2;
          dots.current!.setMatrixAt(di++, m.compose(p, face, one));
        })
      );
      for (const f of feet) {
        const lo = ground(f) - 2;
        const h = base + 2 * PX - lo;
        f.addScaledVector(out, 0.6).setY(lo + h / 2);
        posts.current!.setMatrixAt(pi++, m.compose(f, face, new THREE.Vector3(1, h, 1)));
      }
    });
    for (const im of [dots.current!, posts.current!]) {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  }, [spot]);

  useFrame(() => {
    headMat.color.copy(headDay).lerp(headNight, world.night);
    mat.emissiveIntensity = world.night * 2.4;
    // at this distance fog swallows the glow; after dark the sign shines through it like the drone show
    const fog = world.night < 0.5;
    if (mat.fog !== fog) {
      mat.fog = fog;
      mat.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={head} material={headMat} scale={[HEAD.rx, HEAD.ry, HEAD.rz]}>
        <icosahedronGeometry args={[1, 3]} />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, mat, count]}>
        <boxGeometry args={[PX * 0.88, PX * 0.88, 0.5]} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, letters * 2]}>
        <boxGeometry args={[0.45, 1, 0.45]} />
        <meshStandardMaterial color="#5d646e" roughness={0.7} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}
