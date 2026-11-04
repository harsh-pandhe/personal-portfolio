"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heightAt, ridgeTop, rng, ROAD_R } from "./terrain";
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

const asphalt = new THREE.MeshStandardMaterial({ color: "#3b4048", roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2 });
const curb = new THREE.MeshStandardMaterial({ color: "#f2f3f5", roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 });
const paving = new THREE.MeshStandardMaterial({ color: "#e9e2d0", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
const dirt = new THREE.MeshStandardMaterial({ color: "#d8c49a", roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });

function Roads() {
  const geos = useMemo(() => {
    const out: { g: THREE.BufferGeometry; m: THREE.Material }[] = [];
    // ring road with white curbs either side
    out.push({ g: ribbon(circle(ROAD_R), 3.0, 0.05, true), m: asphalt });
    out.push({ g: ribbon(circle(ROAD_R - 1.6), 0.22, 0.09, true), m: curb });
    out.push({ g: ribbon(circle(ROAD_R + 1.6), 0.22, 0.09, true), m: curb });
    // roundabout around HQ
    out.push({ g: ribbon(circle(8.2, 90), 2.2, 0.05, true), m: asphalt });
    out.push({ g: ribbon(circle(9.4, 90), 0.2, 0.09, true), m: curb });
    // spokes: paved promenades from the roundabout to each zone
    for (const z of ZONES) {
      if (!z.radius) continue;
      const [x, zz] = zonePos(z);
      const u = new THREE.Vector2(x, zz).normalize();
      out.push({ g: ribbon(line(u.x * 9.3, u.y * 9.3, x * 0.8, zz * 0.8), 2.3, 0.06), m: paving });
    }
    return out;
  }, []);
  return (
    <>
      {geos.map((q, i) => (
        <mesh key={i} geometry={q.g} material={q.m} receiveShadow />
      ))}
    </>
  );
}

/** Zebra crossings where each promenade meets the ring road. */
function Crossings() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (const z of ZONES) {
      if (!z.radius) continue;
      const [x, zz] = zonePos(z);
      const a = Math.atan2(zz, x);
      for (let k = -2; k <= 2; k++) {
        const t = new THREE.Vector2(-Math.sin(a), Math.cos(a));
        const cx = Math.cos(a) * ROAD_R + t.x * k * 0.45,
          cz = Math.sin(a) * ROAD_R + t.y * k * 0.45;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(cx, heightAt(cx, cz) + 0.1, cz),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a),
          new THREE.Vector3(2.6, 0.02, 0.24)
        );
        out.push(m);
      }
    }
    return out;
  }, []);
  useEffect(() => {
    list.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [list]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]}>
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
      [at(200, ROAD_R + 1.5), at(203, 40), at(208, 53), at(205, 64)], // lighthouse
      [at(97, ROAD_R + 1.5), at(93, 43), at(96, 54), at(95, 63)], // pier
      [[ropeA[0] * 1.08, ropeA[1] * 1.08], [ropeA[0] * 1.2 + 2, ropeA[1] * 1.2 - 2], [rx - 2, rz + 1.5]], // up the ridge
      [at(-80, ROAD_R + 1.5), at(-78, 48), [sih[0] - 2, sih[1] + 3]], // behind the arena
      [at(-25, ROAD_R + 1.5), at(-22, 46), [robo[0] - 3, robo[1] + 2]], // past the swarm field
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
        const px = Math.cos(a) * (ROAD_R - 2.6) + t.x * 1.9,
          pz = Math.sin(a) * (ROAD_R - 2.6) + t.y * 1.9;
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
