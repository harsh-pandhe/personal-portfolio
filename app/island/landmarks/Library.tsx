"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import { rng } from "../terrain";
import { setUI, world } from "../store";
import { papers } from "@/lib/achievements";
import { bakeStatic } from "../Props";
import { M, Billboard, ZoneGroup } from "./common";

/* Research Library: a gothic hall modelled in Blender (public/models/library.glb). The six SSRN
   papers float in front of the doors like candles; hover one for its title, click to open. */
const LIB_GLB = "/models/library.glb";
useGLTF.preload(LIB_GLB, false, true);
function paperTexture(title: string, area: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 340;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbf6e9";
  g.fillRect(0, 0, 256, 340);
  g.fillStyle = area === "Quant" ? "#1d4ed8" : "#0f766e";
  g.fillRect(0, 0, 256, 10);
  g.fillStyle = "#1d2128";
  g.font = "700 20px serif";
  const words = title.split(":")[0].split(" ");
  let line = "",
    y = 52;
  for (const w of words) {
    if (g.measureText(line + w).width > 220) {
      g.fillText(line, 18, y);
      line = "";
      y += 26;
    }
    line += w + " ";
  }
  g.fillText(line, 18, y);
  g.fillStyle = "#9aa3ad";
  for (let i = 0; i < 9; i++) g.fillRect(18, y + 28 + i * 16, 220 - (i % 3) * 30, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/* Surface detail for the library GLB, which ships with flat colours: box-projected UVs and canvas
   textures for ashlar stone, slate, an oak plank door with iron straps and leaded stained glass. */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function noise(g: CanvasRenderingContext2D, w: number, h: number, cols: string[], n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
}
/** World-scale box projection: each triangle takes the plane its normal faces most. */
function boxUV(geo: THREE.BufferGeometry, metres: number) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const [u, w] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = u / metres;
      uv[(i + k) * 2 + 1] = w / metres;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
/** Fit 0..1 UVs over a mesh's front face (its two largest bounding-box axes). */
function fitUV(geo: THREE.BufferGeometry) {
  const g = geo.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const s = bb.getSize(new THREE.Vector3());
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const useZ = s.z > s.x; // window faces x or z
  for (let i = 0; i < p.count; i++) {
    const u = useZ ? (p.getZ(i) - bb.min.z) / (s.z || 1) : (p.getX(i) - bb.min.x) / (s.x || 1);
    uv[i * 2] = u;
    uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / (s.y || 1);
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
function libraryMaterials() {
  const stone = canvasTex(512, 512, (g) => {
    g.fillStyle = "#cfc7b6";
    g.fillRect(0, 0, 512, 512);
    noise(g, 512, 512, ["#c2b9a6", "#d9d2c3", "#b8ae9a"], 9000, 4);
    g.fillStyle = "#a39985";
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = (r * 512) / rows;
      g.fillRect(0, y, 512, 3);
      const off = r % 2 ? 0 : 64;
      for (let x = off; x < 512 + 128; x += 128) g.fillRect(x, y, 3, 512 / rows);
    }
  });
  const trim = canvasTex(256, 256, (g) => {
    g.fillStyle = "#e3dccb";
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, ["#d6cfbd", "#ece6d8"], 3000, 5);
  });
  const slate = canvasTex(256, 256, (g) => {
    g.fillStyle = "#3b4352";
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, ["#323946", "#465062", "#2c323d"], 3000, 6);
    g.fillStyle = "#232831";
    for (let r = 0; r < 8; r++) {
      g.fillRect(0, r * 32, 256, 2);
      for (let x = r % 2 ? 0 : 16; x < 256; x += 32) g.fillRect(x, r * 32, 2, 32);
    }
  });
  const door = canvasTex(
    256,
    512,
    (g) => {
      g.fillStyle = "#6b4022";
      g.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? "#74472a" : "#62391e";
        g.fillRect(i * 43, 0, 41, 512);
        g.fillStyle = "#3f2412";
        g.fillRect(i * 43 + 41, 0, 2, 512);
      }
      noise(g, 256, 512, ["#5a341b", "#7d5030"], 2500, 7);
      // iron straps with studs, and a ring handle
      g.fillStyle = "#24262a";
      for (const y of [90, 250, 410]) {
        g.fillRect(0, y, 256, 16);
        for (let x = 12; x < 256; x += 30) {
          g.beginPath();
          g.arc(x, y + 8, 4, 0, Math.PI * 2);
          g.fillStyle = "#4a4d52";
          g.fill();
          g.fillStyle = "#24262a";
        }
      }
      g.strokeStyle = "#2b2d31";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(200, 300, 18, 0, Math.PI * 2);
      g.stroke();
    },
    false
  );
  const glass = canvasTex(
    256,
    512,
    (g) => {
      const pal = ["#2c5fd6", "#c8312f", "#e7b43a", "#2f9a5c", "#7b3fb8", "#4fb3e0"];
      const r = rng(9);
      const cw = 32,
        ch = 40;
      for (let y = 0; y < 512; y += ch)
        for (let x = 0; x < 256; x += cw) {
          g.fillStyle = pal[Math.floor(r() * pal.length)];
          g.fillRect(x, y, cw, ch);
        }
      // a figure-ish medallion in the middle and lead came over everything
      g.fillStyle = "#f3d27a";
      g.beginPath();
      g.arc(128, 220, 60, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#c8312f";
      g.beginPath();
      g.arc(128, 220, 34, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#1b1d22";
      g.lineWidth = 5;
      for (let y = 0; y <= 512; y += ch) (g.beginPath(), g.moveTo(0, y), g.lineTo(256, y), g.stroke());
      for (let x = 0; x <= 256; x += cw) (g.beginPath(), g.moveTo(x, 0), g.lineTo(x, 512), g.stroke());
      g.lineWidth = 7;
      g.beginPath();
      g.arc(128, 220, 60, 0, Math.PI * 2);
      g.stroke();
      g.strokeRect(4, 4, 248, 504);
    },
    false
  );
  const rose = canvasTex(
    512,
    512,
    (g) => {
      const pal = ["#2c5fd6", "#c8312f", "#e7b43a", "#7b3fb8", "#2f9a5c"];
      g.fillStyle = "#1b1d22";
      g.fillRect(0, 0, 512, 512);
      for (let ring = 4; ring >= 1; ring--) {
        const R = ring * 60;
        for (let k = 0; k < 16; k++) {
          g.fillStyle = pal[(k + ring) % pal.length];
          g.beginPath();
          g.moveTo(256, 256);
          g.arc(256, 256, R, (k / 16) * Math.PI * 2 + 0.03, ((k + 1) / 16) * Math.PI * 2 - 0.03);
          g.fill();
        }
      }
      g.fillStyle = "#f3d27a";
      g.beginPath();
      g.arc(256, 256, 30, 0, Math.PI * 2);
      g.fill();
    },
    false
  );
  const mk = (map: THREE.Texture, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
  return {
    LibStone: { mat: mk(stone), uv: 3.2 },
    LibTrim: { mat: mk(trim), uv: 1.5 },
    LibSlate: { mat: mk(slate, { roughness: 0.6 }), uv: 1.6 },
    LibWood: { mat: mk(door, { roughness: 0.7 }), uv: 0 },
    LibGlass: { mat: mk(glass, { emissiveMap: glass, emissive: "#ffffff", emissiveIntensity: 0.4 }), uv: 0 },
    LibRose: { mat: mk(rose, { emissiveMap: rose, emissive: "#ffffff", emissiveIntensity: 0.4 }), uv: 0 },
  } as Record<string, { mat: THREE.MeshStandardMaterial; uv: number }>;
}

export function Library() {
  const [hover, setHover] = useState<number | null>(null);
  const { scene } = useGLTF(LIB_GLB, false, true);
  const hall = useMemo(() => {
    const c = scene.clone(true);
    const mats = libraryMaterials();
    const glow = [mats.LibGlass.mat, mats.LibRose.mat];
    c.updateMatrixWorld(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      const q = mats[(m.material as THREE.Material).name];
      if (!q) return;
      if (q.uv) {
        // project in the hall's frame so the stone courses line up across separate meshes
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        const inv = m.matrixWorld.clone().invert();
        m.geometry = boxUV(g, q.uv).applyMatrix4(inv);
      } else m.geometry = fitUV(m.geometry);
      m.material = q.mat;
    });
    bakeStatic(c);
    return { c, glow };
  }, [scene]);
  const sheets = useMemo(() => papers.map((p) => new THREE.MeshStandardMaterial({ map: paperTexture(p.title, p.area), emissive: "#ffcf7a", emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.9 })), []);
  const flames = useRef<THREE.Group>(null);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      n = world.night;
    hall.glow.forEach((m) => (m.emissiveIntensity = 0.4 + n * 2.2));
    sheets.forEach((m, i) => (m.emissiveIntensity = (hover === i ? 0.6 : 0.12) + n * 0.5));
    g.current?.children.forEach((s, i) => {
      s.position.y = 3.4 + (i % 3) * 0.7 + Math.sin(t * 0.9 + i) * 0.25;
      s.rotation.y = Math.sin(t * 0.4 + i) * 0.35;
      s.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.06;
    });
    flames.current?.children.forEach((f, i) => f.scale.setScalar(0.85 + Math.sin(t * 12 + i * 3) * 0.15));
  });
  return (
    <ZoneGroup id="library">
      <primitive object={hall.c} position={[0, 0, -6]} />
      <group ref={g}>
        {papers.map((p, i) => {
          const a = (i / (papers.length - 1) - 0.5) * 2.0;
          const x = Math.sin(a) * 5.2,
            z = 4.2 - Math.cos(a) * 1.4;
          return (
            <group key={p.id} position={[x, 4, z]}>
              <mesh
                material={sheets[i]}
                castShadow
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHover(i);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  setHover(null);
                  document.body.style.cursor = "";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUI({ open: "library" });
                }}
              >
                <planeGeometry args={[1.3, 1.72]} />
              </mesh>
              {hover === i && (
                <Html position={[0, 1.4, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                  <div className="w-64 rounded-xl border border-white/20 bg-neutral-900/90 p-3 text-white shadow-2xl backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-cyan-300">
                      {p.area} · {p.date}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold leading-snug">{p.title}</div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
      {/* candles on stands either side of the steps */}
      <group ref={flames}>
        {[-3.6, -2.2, 2.2, 3.6].map((x) => (
          <mesh key={x} position={[x, 1.55, 2.6]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshBasicMaterial color="#ffcf7a" />
          </mesh>
        ))}
      </group>
      {[-3.6, -2.2, 2.2, 3.6].map((x) => (
        <mesh key={x} position={[x, 0.7, 2.6]} material={M.dark}>
          <cylinderGeometry args={[0.05, 0.12, 1.4, 8]} />
        </mesh>
      ))}
      <Billboard id="library" pos={[7.5, 0, 7.5]} rotY={-0.45} scale={0.85} />
    </ZoneGroup>
  );
}
