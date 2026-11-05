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
  // one continuous line with a catenary sag in every span, so cabins ride straight through the stations
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s < stops.length - 1; s++) {
      const A = stops[s],
        B = stops[s + 1];
      const sag = A.distanceTo(B) * 0.055;
      for (let i = s ? 1 : 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(A.clone().lerp(B, t).setY(A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * sag));
      }
    }
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [stops]);
  const side = useMemo(() => {
    const d = stops[stops.length - 1].clone().sub(stops[0]);
    return new THREE.Vector3(d.z, 0, -d.x).normalize().multiplyScalar(1.1);
  }, [stops]);
  const cables = useMemo(
    () =>
      [-1, 1].map((sgn) => {
        const off = side.clone().multiplyScalar(sgn);
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(220).map((p) => p.clone().add(off))), 440, 0.05, 5);
      }),
    [curve, side]
  );
  // a lattice tower at the middle of every long span
  const towers = useMemo(() => {
    const out: { p: THREE.Vector3; g: number; yaw: number }[] = [];
    for (let s = 0; s < stops.length - 1; s++) {
      const A = stops[s],
        B = stops[s + 1];
      const L = A.distanceTo(B);
      const n = L > 24 ? 1 : 0;
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const p = A.clone().lerp(B, t);
        p.y = A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * L * 0.055 + 0.4;
        out.push({ p, g: heightAt(p.x, p.z), yaw: Math.atan2(B.x - A.x, B.z - A.z) });
      }
    }
    return out;
  }, [stops]);
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
