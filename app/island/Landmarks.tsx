"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MarsYard } from "./MarsYard";
import { heightAt, ROAD_HALF, ROAD_R } from "./terrain";
import { zonePos, ZONES } from "./zones";
import { M, useGlow, ZoneLabel } from "./landmarks/common";
import { Quad } from "./landmarks/Quad";
import { HQ } from "./landmarks/HQ";
import { Arena } from "./landmarks/Arena";
import { Swarm } from "./landmarks/Swarm";
import { Ropeway } from "./landmarks/Ropeway";
import { Trading } from "./landmarks/Trading";
import { Workshop } from "./landmarks/Workshop";
import { Library } from "./landmarks/Library";
import { Morpheus } from "./landmarks/Morpheus";
import { Home } from "./landmarks/Home";

// The zones live one per file in ./landmarks; this file adds the ring-road lamps and courier drones and composes them.
export { Billboard, fontFamily, M, useGlow, ZoneGroup } from "./landmarks/common";
export { Quad } from "./landmarks/Quad";

/* ---------------- street lamps on the ring road ---------------- */
function Lamps() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const glow = useGlow("#ffe3a1", 0.05, 3.2);
  const N = 40;
  useEffect(() => {
    const m = new THREE.Matrix4();
    const spokes = ZONES.filter((z) => z.radius).map((z) => Math.atan2(zonePos(z)[1], zonePos(z)[0]));
    let k = 0;
    for (let i = 0; i < N; i++) {
      // nudge lamps that would stand in a boulevard mouth along the kerb, clear of the crossing
      let a = (i / N) * Math.PI * 2;
      for (const sp of spokes) {
        const d = Math.atan2(Math.sin(a - sp), Math.cos(a - sp));
        if (Math.abs(d) * ROAD_R < 4.5) a = sp + Math.sign(d || 1) * (4.5 / ROAD_R);
      }
      // alternate sides, on the back edge of each sidewalk
      const rr = ROAD_R + (i % 2 ? -1 : 1) * (ROAD_HALF - 0.35);
      const x = Math.cos(a) * rr,
        z = Math.sin(a) * rr;
      const y = heightAt(x, z);
      m.makeTranslation(x, y + 1.3, z);
      poles.current!.setMatrixAt(k, m);
      m.makeTranslation(x, y + 2.7, z);
      bulbs.current!.setMatrixAt(k++, m);
    }
    poles.current!.instanceMatrix.needsUpdate = true;
    bulbs.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={poles} args={[undefined, undefined, N]} material={M.dark} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, N]} material={glow}>
        <sphereGeometry args={[0.18, 10, 8]} />
      </instancedMesh>
    </>
  );
}

/* ---------------- delivery drones between zones ---------------- */
function Couriers() {
  const g = useRef<THREE.Group>(null);
  const routes = useMemo(() => [0.9, 1.25, 1.6].map((s, i) => ({ r: 26 + i * 13, h: 15 + i * 2.5, s: 0.06 * s * (i % 2 ? -1 : 1), o: i * 2 })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((d, i) => {
      const q = routes[i];
      const a = t * q.s + q.o;
      d.position.set(Math.cos(a) * q.r, q.h + Math.sin(t * 1.3 + i) * 0.5, Math.sin(a) * q.r);
      d.rotation.y = -a + (q.s > 0 ? 0 : Math.PI);
    });
  });
  return (
    <group ref={g}>
      {routes.map((_, i) => (
        <group key={i} scale={0.55}>
          <group rotation-y={Math.PI / 4}>
            <Quad />
          </group>
        </group>
      ))}
    </group>
  );
}

export default function Landmarks() {
  return (
    <>
      <HQ />
      <Arena />
      <MarsYard />
      <Swarm />
      <Ropeway />
      <Trading />
      <Workshop />
      <Library />
      <Morpheus />
      <Home />
      <Lamps />
      <Couriers />
      {ZONES.map((z) => (
        <ZoneLabel key={z.id} id={z.id} y={z.id === "hq" ? 18 : z.id === "trading" ? 19 : 9} />
      ))}
    </>
  );
}
