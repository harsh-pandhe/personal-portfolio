"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { heightAt, ridgeTop, ROPE_PEAKS } from "../terrain";
import { zoneById, zonePos } from "../zones";
import { Solid, Static } from "../Props";
import { M, Billboard, ZoneGroup } from "./common";

/* Ropeway Ridge: a multi-span gondola from the valley station over three coastal peaks. */
const RW_GLB = "/models/ropeway.glb";
const RS_GLB = "/models/ropeway-station.glb";
useGLTF.preload(RW_GLB, false, true);
useGLTF.preload(RS_GLB);
export function Ropeway() {
  const z = zoneById.ropeway;
  const [vx, vz] = zonePos(z);
  const [tx, tz] = ridgeTop();
  // stations: valley, ridge, then the two outer peaks
  const stops = useMemo(() => {
    const pts: [number, number][] = [[vx, vz], [tx, tz], ...ROPE_PEAKS.map(([x, zz]) => [x, zz] as [number, number])];
    // the rope runs over each station's bull wheel, ~3 m above its deck
    return pts.map(([x, zz]) => new THREE.Vector3(x, heightAt(x, zz) + 3.2, zz));
  }, [vx, vz, tx, tz]);
  // Supports: the four stations, plus a lattice tower wherever a sagging span would bring the
  // cabins (which hang ~4 m under the rope) too close to the hillside. Towers are added one at a
  // time at the lowest point of the worst span until every span clears the ground.
  const supports = useMemo(() => {
    const CLEAR = 8; // rope height above ground the cabins need
    const TOP = 11; // rope height on a tower
    const sagOf = (A: THREE.Vector3, B: THREE.Vector3) => A.distanceTo(B) * 0.045;
    const list: { p: THREE.Vector3; tower: boolean }[] = stops.map((p) => ({ p, tower: false }));
    for (let iter = 0; iter < 40; iter++) {
      let worst = 0,
        at: { span: number; t: number } | null = null;
      for (let s = 0; s < list.length - 1; s++) {
        const A = list[s].p,
          B = list[s + 1].p,
          sag = sagOf(A, B);
        for (let i = 1; i < 40; i++) {
          const t = i / 40;
          const x = A.x + (B.x - A.x) * t,
            z = A.z + (B.z - A.z) * t;
          const y = A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * sag;
          const lack = heightAt(x, z) + CLEAR - y;
          if (lack > worst) (worst = lack), (at = { span: s, t });
        }
      }
      if (!at) break;
      const A = list[at.span].p,
        B = list[at.span + 1].p;
      const x = A.x + (B.x - A.x) * at.t,
        z = A.z + (B.z - A.z) * at.t;
      list.splice(at.span + 1, 0, { p: new THREE.Vector3(x, heightAt(x, z) + TOP, z), tower: true });
    }
    return { list, sagOf };
  }, [stops]);
  // one continuous line with a catenary sag in every span, so cabins ride straight through supports
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const L = supports.list;
    for (let s = 0; s < L.length - 1; s++) {
      const A = L[s].p,
        B = L[s + 1].p;
      const sag = supports.sagOf(A, B);
      for (let i = s ? 1 : 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(A.clone().lerp(B, t).setY(A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * sag));
      }
    }
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [supports]);
  const side = useMemo(() => {
    const d = stops[stops.length - 1].clone().sub(stops[0]);
    return new THREE.Vector3(d.z, 0, -d.x).normalize().multiplyScalar(1.1);
  }, [stops]);
  const cables = useMemo(
    () =>
      [-1, 1].map((sgn) => {
        const off = side.clone().multiplyScalar(sgn);
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(320).map((p) => p.clone().add(off))), 640, 0.05, 5);
      }),
    [curve, side]
  );
  // towers stand at the supports that aren't stations, turned along the line
  const towers = useMemo(() => {
    const L = supports.list;
    return L.flatMap((q, i) => {
      if (!q.tower) return [];
      const prv = L[i - 1].p,
        nxt = L[i + 1].p;
      return [{ p: q.p.clone().setY(q.p.y + 0.4), g: heightAt(q.p.x, q.p.z), yaw: Math.atan2(nxt.x - prv.x, nxt.z - prv.z) }];
    });
  }, [supports]);
  const cabins = useRef<THREE.Group>(null);
  const tan = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cabins.current?.children.forEach((cab, i) => {
      const up = i % 2 === 0;
      const k = (((t * 0.012 + i * 0.1) % 1) + 1) % 1;
      const u = up ? k : 1 - k;
      const p = curve.getPointAt(u).add(side.clone().multiplyScalar(up ? -1 : 1));
      cab.position.set(p.x, p.y, p.z);
      curve.getTangentAt(u, tan);
      cab.rotation.y = Math.atan2(tan.x, tan.z);
      cab.rotation.z = Math.sin(t * 1.3 + i) * 0.03; // a little sway
    });
  });
  const { scene: rwScene } = useGLTF(RW_GLB, false, true);
  const { scene: rsScene } = useGLTF(RS_GLB);
  const rw = useMemo(() => {
    const get = (n: string) => {
      const o = rwScene.getObjectByName(n)!.clone(true);
      o.position.set(0, 0, 0);
      o.traverse((m) => ((m as THREE.Mesh).isMesh ? (m.castShadow = true) : null));
      return o;
    };
    const cabin = get("RwCabin");
    const station = rsScene.clone(true);
    station.traverse((m) => ((m as THREE.Mesh).isMesh ? (m.castShadow = m.receiveShadow = true) : null));
    return { tower: get("RwTower"), station, cabins: Array.from({ length: 10 }, () => cabin.clone(true)) };
  }, [rwScene, rsScene]);
  return (
    <group>
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={M.dark} />
      ))}
      {/* towers, stations and cabins modelled in Blender (public/models/ropeway.glb) */}
      <Static>
      {towers.map(({ p, g, yaw }, i) => (
        <group key={i} position={[p.x, g, p.z]} rotation-y={yaw}>
          <primitive object={rw.tower.clone(true)} scale={[1, (p.y - g) / 10.55, 1]} />
          <Solid r={0.9} />
        </group>
      ))}
      {stops.map((p, i) => {
        const nxt = stops[Math.min(i + 1, stops.length - 1)],
          prv = stops[Math.max(i - 1, 0)];
        const yaw = Math.atan2(nxt.x - prv.x, nxt.z - prv.z);
        // stations stand on level pads cut into the slopes (terrain.ts); the plinth runs into the ground
        return (
          <group key={`s${i}`} position={[p.x, heightAt(p.x, p.z), p.z]} rotation-y={yaw}>
            <primitive object={rw.station.clone(true)} scale={i === 0 ? 1 : 0.9} />
            <Solid w={8.6} d={10.6} />
          </group>
        );
      })}
      </Static>
      <group ref={cabins}>
        {Array.from({ length: 10 }, (_, i) => (
          <primitive key={i} object={rw.cabins[i]} scale={0.8} />
        ))}
      </group>
      <ZoneGroup id="ropeway">
        <Billboard id="ropeway" pos={[-8.5, 0, 7.5]} rotY={0.6} />
      </ZoneGroup>
    </group>
  );
}
