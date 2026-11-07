"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { heightAt, KERB_W, LANE_W, PLAZA_R, ridgeTop, rng, ROAD_HALF, ROAD_R, zoneFlatR } from "./terrain";
import { zonePos, ZONES } from "./zones";
import { MEDALS } from "./Actors";

/** A flat ribbon that follows the terrain along a 2D polyline. */
function ribbon(pts: THREE.Vector2[], width: number, lift = 0.05, closed = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
    const b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    const nx = -t.y,
      nz = t.x;
    if (i > 0) run += p.distanceTo(pts[i - 1]);
    for (const s of [-1, 1]) {
      const x = p.x + nx * (width / 2) * s,
        z = p.y + nz * (width / 2) * s;
      pos.push(x, heightAt(x, z) + lift, z);
      uv.push(s < 0 ? 0 : 1, run / width);
    }
    if (i < n - 1 || closed) {
      const j = i * 2,
        k = ((i + 1) % n) * 2;
      idx.push(j, k, j + 1, j + 1, k, k + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function circle(r: number, n = 160) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  });
}

function line(ax: number, az: number, bx: number, bz: number, step = 1) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
  return Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n));
}

/** A gently curving footpath through a few waypoints. */
function curve(points: [number, number][], seg = 60) {
  const c = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return c.getPoints(seg).map((p) => new THREE.Vector2(p.x, p.z));
}

/** A raised slab along a polyline: top face from offset `a` to `b` (metres from the centreline,
 *  + is left), `h` above the ground, with vertical faces down into the ground on both edges.
 *  UVs are in metres so tiled textures keep their scale. */
function slab(pts: THREE.Vector2[], a: number, b: number, h: number, closed = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = pts.length;
  const rows: { x: number; z: number; y: number }[][] = [];
  // sample the ground every ~0.8 m across the slab too, so a crowned or sloping road never lets
  // the terrain poke through the middle of it
  const cols = Math.max(1, Math.ceil(Math.abs(b - a) / 0.8));
  const offs = Array.from({ length: cols + 1 }, (_, k) => a + ((b - a) * k) / cols);
  let run = 0;
  const runs: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const pa = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
    const pb = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    const t = new THREE.Vector2().subVectors(pb, pa).normalize();
    if (i > 0) run += p.distanceTo(pts[i - 1]);
    runs.push(run);
    rows.push(
      offs.map((o) => {
        const x = p.x - t.y * o,
          z = p.y + t.x * o;
        return { x, z, y: heightAt(x, z) };
      })
    );
  }
  // four strips per row: outer side (down), top, inner side (down)
  const push = (x: number, y: number, z: number, u: number, v: number) => {
    pos.push(x, y, z);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };
  const strip = (get: (i: number) => [number, number, number, number, number][]) => {
    let prev: number[] | null = null;
    for (let i = 0; i < n + (closed ? 1 : 0); i++) {
      const k = i % n;
      const cur = get(k).map(([x, y, z, u, v]) => push(x, y, z, u, i === n ? run + pts[n - 1].distanceTo(pts[0]) : v));
      if (prev) idx.push(prev[0], cur[0], prev[1], prev[1], cur[0], cur[1]);
      prev = cur;
    }
  };
  for (let k = 0; k < cols; k++)
    strip((i) => [
      [rows[i][k].x, rows[i][k].y + h, rows[i][k].z, Math.abs(offs[k] - a), runs[i]],
      [rows[i][k + 1].x, rows[i][k + 1].y + h, rows[i][k + 1].z, Math.abs(offs[k + 1] - a), runs[i]],
    ]);
  if (h > 0.02)
    for (const e of [0, 1]) {
      const sgn = e ? 1 : -1;
      strip((i) => {
        const q = rows[i][e ? cols : 0];
        const top: [number, number, number, number, number] = [q.x, q.y + h, q.z, 0, runs[i]];
        const bot: [number, number, number, number, number] = [q.x, q.y - 0.25, q.z, h + 0.25, runs[i]];
        return sgn > 0 === b > a ? [top, bot] : [bot, top];
      });
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tileable canvas textures (1 texture repeat = `metres` on the ground). */
function tex(draw: (g: CanvasRenderingContext2D, S: number) => void, metres: number) {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  draw(c.getContext("2d")!, S);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / metres, 1 / metres);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g: CanvasRenderingContext2D, S: number, base: string, dots: string[], n: number, seed: number) {
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) {
    g.fillStyle = dots[i % dots.length];
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
}
function useRoadMaterials() {
  return useMemo(() => {
    const asphaltTex = tex((g, S) => speckle(g, S, "#4a4f57", ["#3a3e45", "#5a6069", "#43474e", "#666b73"], 5200, 3), 4);
    // concrete slabs with expansion joints every 1.5 m and a brushed finish
    const concreteTex = tex((g, S) => {
      speckle(g, S, "#d3d1cb", ["#c7c5bf", "#dcdad4", "#bfbdb6"], 3800, 5);
      g.fillStyle = "rgba(0,0,0,.035)";
      for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
      g.fillStyle = "#a9a7a0";
      g.fillRect(0, 0, S, 3);
      g.fillRect(0, 0, 3, S);
    }, 1.5);
    // plaza and boulevard pavers: running bond of warm stone
    const paverTex = tex((g, S) => {
      speckle(g, S, "#e4dccb", ["#d9d0bd", "#ece5d6"], 2000, 7);
      g.fillStyle = "#c9bfaa";
      const h = S / 8;
      for (let row = 0; row < 8; row++) {
        g.fillRect(0, row * h, S, 2);
        for (let k = 0; k < 4; k++) g.fillRect(((k + (row % 2) * 0.5) * S) / 4, row * h, 2, h);
      }
    }, 2.4);
    const kerbTex = tex((g, S) => {
      speckle(g, S, "#e9e8e4", ["#d8d7d2", "#f3f2ee"], 1600, 9);
      g.fillStyle = "#b8b6b0";
      g.fillRect(0, 0, 3, S);
    }, 1);
    const std = (map: THREE.Texture, rough: number, off: number) =>
      new THREE.MeshStandardMaterial({ map, roughness: rough, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off });
    return {
      asphalt: std(asphaltTex, 0.95, -1),
      concrete: std(concreteTex, 0.9, -2),
      paver: std(paverTex, 0.92, -1),
      kerb: std(kerbTex, 0.75, -3),
      line: new THREE.MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
      yellow: new THREE.MeshStandardMaterial({ color: "#f2c230", roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    };
  }, []);
}

const dirt = new THREE.MeshStandardMaterial({ color: "#d8c49a", roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });

/** Split a closed ring into arcs that skip a gap of `half` metres around each boulevard. */
function ringArcs(R: number, half: number) {
  const angs = ZONES.filter((z) => z.radius).map((z) => Math.atan2(zonePos(z)[1], zonePos(z)[0]));
  const gap = half / R;
  const sorted = angs.map((a) => (a + Math.PI * 2) % (Math.PI * 2)).sort((p, q) => p - q);
  return sorted.map((a, i) => {
    const b = sorted[(i + 1) % sorted.length] + (i === sorted.length - 1 ? Math.PI * 2 : 0);
    const a0 = a + gap,
      a1 = b - gap;
    const n = Math.max(4, Math.ceil(((a1 - a0) * R) / 1.2));
    return Array.from({ length: n + 1 }, (_, k) => {
      const t = a0 + ((a1 - a0) * k) / n;
      return new THREE.Vector2(Math.cos(t) * R, Math.sin(t) * R);
    });
  });
}

function Roads() {
  const M = useRoadMaterials();
  const geos = useMemo(() => {
    const out: { g: THREE.BufferGeometry; m: THREE.Material }[] = [];
    const ring = circle(ROAD_R, 300);
    // carriageway: two 3.5 m lanes, solid white edge lines
    out.push({ g: slab(ring, -LANE_W, LANE_W, 0.05, true), m: M.asphalt });
    for (const s of [-1, 1]) out.push({ g: slab(ring, s * (LANE_W - 0.35), s * (LANE_W - 0.2), 0.05, true), m: M.line });
    // raised kerbs and concrete sidewalks, broken where each boulevard crosses at a zebra
    for (const s of [-1, 1]) {
      for (const arc of ringArcs(ROAD_R + s * (LANE_W + KERB_W / 2), 3.2)) {
        out.push({ g: slab(arc, -KERB_W / 2, KERB_W / 2, 0.18), m: M.kerb });
      }
    }
    for (const s of [-1, 1]) out.push({ g: slab(ring, -s * (LANE_W + KERB_W), -s * ROAD_HALF, 0.16, true), m: M.concrete });
    // the city-centre plaza edge: a kerb ring and a concrete promenade around the paved plaza
    const edge = circle(PLAZA_R, 200);
    out.push({ g: slab(edge, 0, -2.6, 0.12, true), m: M.concrete });
    out.push({ g: slab(edge, -2.6, -2.9, 0.2, true), m: M.kerb });
    // boulevards: paved promenade with kerbs, from the plaza to each zone's plot, broken at the ring road
    for (const z of ZONES) {
      if (!z.radius) continue;
      const [x, zz] = zonePos(z);
      const u = new THREE.Vector2(x, zz).normalize();
      const end = z.radius - zoneFlatR(z.id) + 3.5;
      for (const [r0, r1] of [
        [PLAZA_R + 2.9, ROAD_R - ROAD_HALF],
        [ROAD_R + ROAD_HALF, end],
      ]) {
        const pts = line(u.x * r0, u.y * r0, u.x * r1, u.y * r1, 1);
        out.push({ g: slab(pts, -2.4, 2.4, 0.12), m: M.paver });
        for (const s of [-1, 1]) out.push({ g: slab(pts, s * 2.4, s * 2.7, 0.2), m: M.kerb });
      }
      // across the carriageway: a raised crossing table between the sidewalks
      const xa = ROAD_R - ROAD_HALF,
        xb = ROAD_R + ROAD_HALF;
      out.push({ g: slab(line(u.x * xa, u.y * xa, u.x * xb, u.y * xb, 0.5), -2.6, 2.6, 0.1), m: M.concrete });
    }
    // one mesh per material: ~100 kerb, sidewalk and paving slabs become a handful of draw calls
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const q of out) byMat.set(q.m, [...(byMat.get(q.m) ?? []), q.g]);
    return [...byMat].flatMap(([m, gs]) => {
      const merged = mergeGeometries(gs, false);
      return merged ? [{ g: merged, m }] : gs.map((g) => ({ g, m }));
    });
  }, [M]);
  return (
    <>
      {geos.map((q, i) => (
        <mesh key={i} geometry={q.g} material={q.m} receiveShadow />
      ))}
    </>
  );
}

/** Zebra crossings where each boulevard meets the ring road. */
function Crossings() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (const z of ZONES) {
      if (!z.radius) continue;
      const [x, zz] = zonePos(z);
      const a = Math.atan2(zz, x);
      const t = new THREE.Vector2(-Math.sin(a), Math.cos(a));
      for (let k = -4; k <= 4; k++) {
        const cx = Math.cos(a) * ROAD_R + t.x * k * 0.55,
          cz = Math.sin(a) * ROAD_R + t.y * k * 0.55;
        out.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(cx, heightAt(cx, cz) + 0.12, cz),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a),
            new THREE.Vector3(LANE_W * 2 - 0.8, 0.02, 0.32)
          )
        );
      }
    }
    return out;
  }, []);
  useEffect(() => {
    list.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [list]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </instancedMesh>
  );
}

/** Sandy footpaths to the lighthouse, the pier, up the ridge and out to two hidden medals. */
function Footpaths() {
  const { geos, stones } = useMemo(() => {
    const at = (deg: number, r: number) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r] as [number, number];
    const [rx, rz] = ridgeTop();
    const ropeA = zonePos(ZONES.find((z) => z.id === "ropeway")!);
    const sih = MEDALS[0].at(),
      robo = MEDALS[2].at();
    const routes: [number, number][][] = [
      [at(200, ROAD_R + 4), at(203, 56), at(208, 74), at(205, 88)], // lighthouse
      [at(97, ROAD_R + 4), at(93, 60), at(96, 76), at(95, 90)], // pier
      [[ropeA[0] * 1.08, ropeA[1] * 1.08], [ropeA[0] * 1.2 + 2, ropeA[1] * 1.2 - 2], [rx - 2, rz + 1.5]], // up the ridge
      [at(-70, ROAD_R + 4), at(-72, 62), [sih[0] - 2, sih[1] + 3]], // between the arena and the Mars yard
      [at(-30, ROAD_R + 4), at(-28, 60), [robo[0] - 3, robo[1] + 2]], // past the swarm field
    ];
    const r = rng(12);
    const g: THREE.BufferGeometry[] = [];
    const st: THREE.Matrix4[] = [];
    for (const pts of routes) {
      const c = curve(pts, 70);
      g.push(ribbon(c, 1.3, 0.04));
      // stepping stones scattered along the path
      for (let i = 2; i < c.length - 1; i += 3) {
        const p = c[i];
        const off = (r() - 0.5) * 0.7;
        const t = new THREE.Vector2().subVectors(c[i + 1], c[i - 1]).normalize();
        const x = p.x - t.y * off,
          z = p.y + t.x * off;
        const s = 0.22 + r() * 0.16;
        st.push(new THREE.Matrix4().compose(new THREE.Vector3(x, heightAt(x, z) + 0.06, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 3), new THREE.Vector3(s * 1.4, 0.07, s)));
      }
    }
    return { geos: g, stones: st };
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    stones.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [stones]);
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={dirt} receiveShadow />
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, stones.length]} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 7]} />
        <meshStandardMaterial color="#c8bfae" roughness={1} />
      </instancedMesh>
    </>
  );
}

/** Signposts where each promenade leaves the ring road. */
function signTexture(name: string, accent: string, key: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  const ff = getComputedStyle(document.body).fontFamily || "sans-serif";
  g.fillStyle = "#14171c";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(450, 0);
  g.lineTo(512, 64);
  g.lineTo(450, 128);
  g.lineTo(0, 128);
  g.closePath();
  g.fill();
  g.fillStyle = accent;
  g.fillRect(0, 0, 14, 128);
  g.fillStyle = "#ffffff";
  g.font = `700 52px ${ff}`;
  g.fillText(name, 40, 82);
  g.fillStyle = "rgba(255,255,255,.4)";
  g.font = `500 28px ${ff}`;
  g.fillText(key, 420, 80);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Signposts() {
  const [tex, setTex] = useState<THREE.CanvasTexture[] | null>(null);
  const zones = useMemo(() => ZONES.filter((z) => z.radius), []);
  useEffect(() => {
    let list: THREE.CanvasTexture[] = [];
    const make = () => {
      list = zones.map((z) => signTexture(z.name, z.accent, z.key));
      setTex(list);
    };
    if (document.fonts?.ready) document.fonts.ready.then(make);
    else make();
    return () => list.forEach((t) => t.dispose());
  }, [zones]);
  if (!tex) return null;
  return (
    <>
      {zones.map((z, i) => {
        const [x, zz] = zonePos(z);
        const a = Math.atan2(zz, x);
        // stand on the inner verge, to the right of the promenade
        const t = new THREE.Vector2(-Math.sin(a), Math.cos(a));
        const px = Math.cos(a) * (ROAD_R - ROAD_HALF - 1.2) + t.x * 3.6,
          pz = Math.sin(a) * (ROAD_R - ROAD_HALF - 1.2) + t.y * 3.6;
        const y = heightAt(px, pz);
        return (
          <group key={z.id} position={[px, y, pz]} rotation-y={Math.PI / 2 - a}>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.06, 0.07, 2.4, 8]} />
              <meshStandardMaterial color="#d9dde3" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* back-to-back faces so the sign reads correctly from both sides */}
            <mesh position={[0.9, 2.05, 0.03]}>
              <planeGeometry args={[2, 0.5]} />
              <meshStandardMaterial map={tex[i]} roughness={0.6} />
            </mesh>
            <mesh position={[0.9, 2.05, -0.03]} rotation-y={Math.PI}>
              <planeGeometry args={[2, 0.5]} />
              <meshStandardMaterial map={tex[i]} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export default function Paths() {
  return (
    <>
      <Roads />
      <Crossings />
      <Footpaths />
      <Signposts />
    </>
  );
}
