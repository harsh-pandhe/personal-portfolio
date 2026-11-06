"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { bakeStatic, Solid, Static } from "../Props";
import { M, useGlow, Billboard, ZoneGroup, facadeMaterial } from "./common";
import { world } from "../store";
import { Quad } from "./Quad";

/* A six-axis industrial arm (KUKA-style orange) running a pick-and-place loop with a crate. */
const ARM_KEYS: { t: number; j: [number, number, number, number, number]; grip: number; carry: boolean }[] = [
  // a1 yaw, a2 shoulder, a3 elbow, a5 wrist, a6 roll; grip 0 open .. 1 closed
  { t: 0, j: [0.9, -0.2, 1.0, 0.8, 0], grip: 0, carry: false },
  { t: 1.6, j: [0.9, 0.55, 0.65, 0.4, 0], grip: 0, carry: false }, // reach down to the crate
  { t: 2.2, j: [0.9, 0.55, 0.65, 0.4, 0], grip: 1, carry: true }, // grip
  { t: 3.6, j: [0.2, -0.35, 1.2, 0.7, 1.2], grip: 1, carry: true }, // lift and swing
  { t: 5.2, j: [-1.0, 0.45, 0.75, 0.45, 1.6], grip: 1, carry: true }, // over the pallet
  { t: 5.8, j: [-1.0, 0.45, 0.75, 0.45, 1.6], grip: 0, carry: false }, // release
  { t: 7.4, j: [-0.1, -0.2, 1.0, 0.8, 0.4], grip: 0, carry: false },
  { t: 8.6, j: [0.9, -0.2, 1.0, 0.8, 0], grip: 0, carry: false },
];
const ARM_GLB = "/models/robot-arm.glb";
useGLTF.preload(ARM_GLB, false, true);
/** The arm modelled in Blender (public/models/robot-arm.glb), joints J1-J6 driven here.
 *  Blender is Z-up: after glTF's Y-up conversion, its Y-axis joints turn about three's -Z. */
function IndustrialArm() {
  const { scene } = useGLTF(ARM_GLB, false, true);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
    return c;
  }, [scene]);
  const J = useMemo(() => Object.fromEntries(["J1", "J2", "J3", "J5", "J6", "FingerL", "FingerR"].map((n) => [n, model.getObjectByName(n)!])), [model]);
  const crate = useMemo(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshStandardMaterial({ color: "#12f0c0", roughness: 0.6 }));
    m.position.set(0.5, 0, 0);
    m.castShadow = true;
    J.J6?.add(m);
    return m;
  }, [J]);
  useFrame(({ clock }) => {
    const T = ARM_KEYS[ARM_KEYS.length - 1].t;
    const t = clock.elapsedTime % T;
    let k = 0;
    while (k < ARM_KEYS.length - 2 && t > ARM_KEYS[k + 1].t) k++;
    const A = ARM_KEYS[k],
      B = ARM_KEYS[k + 1];
    const u0 = (t - A.t) / (B.t - A.t || 1),
      u = u0 * u0 * (3 - 2 * u0);
    const j = A.j.map((v, i) => v + (B.j[i] - v) * u);
    const g = A.grip + (B.grip - A.grip) * u;
    J.J1.rotation.y = j[0];
    J.J2.rotation.z = -j[1];
    J.J3.rotation.z = -j[2];
    J.J5.rotation.z = -j[3];
    J.J6.rotation.x = j[4];
    J.FingerL.position.z = -(0.18 - g * 0.06);
    J.FingerR.position.z = 0.18 - g * 0.06;
    crate.visible = A.carry;
  });
  const led = useGlow("#12f0c0", 0.6, 3);
  return (
    <group>
      <primitive object={model} scale={0.72} />
      {/* safety fence and floor marking around the cell */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.6, 0.5, Math.sin(a) * 2.6]} material={M.metal}>
            <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} material={led}>
        <ringGeometry args={[2.5, 2.58, 4, 1, Math.PI / 4]} />
      </mesh>
    </group>
  );
}

const WS_GLB = "/models/workshop.glb";
useGLTF.preload(WS_GLB, false, true);
/* The Workshop yard: the sawtooth makerspace, the arm's work cell, workbenches with a drone
   on the bench, a parts rack and pallets of crates by the roller door. */
const CRATE = new THREE.MeshStandardMaterial({ color: "#b98a54", roughness: 0.9 });
const CRATE_DARK = new THREE.MeshStandardMaterial({ color: "#8c6338", roughness: 0.9 });
function Crate({ s = 0.9 }: { s?: number }) {
  return (
    <group scale={s}>
      <mesh position={[0, 0.5, 0]} material={CRATE} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {/* slats */}
      {[-0.51, 0.51].map((z) =>
        [0.15, 0.5, 0.85].map((y) => (
          <mesh key={`${z}${y}`} position={[0, y, z]} material={CRATE_DARK}>
            <boxGeometry args={[1.02, 0.1, 0.02]} />
          </mesh>
        ))
      )}
      {[-0.51, 0.51].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} rotation-z={0.78} material={CRATE_DARK}>
          <boxGeometry args={[0.02, 1.3, 0.12]} />
        </mesh>
      ))}
    </group>
  );
}
function Pallet({ crates }: { crates: [number, number, number][] }) {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} material={CRATE_DARK} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.14, 2.2]} />
      </mesh>
      {crates.map(([x, y, z], i) => (
        <group key={i} position={[x, 0.14 + y, z]}>
          <Crate />
        </group>
      ))}
    </group>
  );
}
function Workbench() {
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7a06b", roughness: 0.8 }), []);
  return (
    <group>
      <mesh position={[0, 0.95, 0]} material={top} castShadow receiveShadow>
        <boxGeometry args={[3, 0.08, 1.1]} />
      </mesh>
      {[-1.4, 1.4].map((x) =>
        [-0.45, 0.45].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.47, z]} material={M.dark}>
            <boxGeometry args={[0.07, 0.94, 0.07]} />
          </mesh>
        ))
      )}
      <mesh position={[0, 0.3, 0]} material={M.dark}>
        <boxGeometry args={[2.8, 0.05, 1.0]} />
      </mesh>
      {/* a pegboard of tools behind */}
      <mesh position={[0, 1.7, -0.52]} material={M.white} castShadow>
        <boxGeometry args={[3, 1.4, 0.05]} />
      </mesh>
      {[-1.1, -0.6, -0.1, 0.5, 1.0].map((x, i) => (
        <mesh key={x} position={[x, 1.75 - (i % 2) * 0.25, -0.48]} material={i % 2 ? M.red : M.dark}>
          <boxGeometry args={[0.08, 0.5 - (i % 3) * 0.1, 0.03]} />
        </mesh>
      ))}
    </group>
  );
}

export function Workshop() {
  const { scene: wsScene } = useGLTF(WS_GLB, false, true);
  const shed = useMemo(() => {
    const c = wsScene.clone(true);
    c.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = o.receiveShadow = true) : null));
    bakeStatic(c);
    return c;
  }, [wsScene]);
  const walls = useMemo(() => {
    const bb = new THREE.Box3().setFromObject(shed);
    const sz = bb.getSize(new THREE.Vector3()).multiplyScalar(1.5);
    const c = bb.getCenter(new THREE.Vector3()).multiplyScalar(1.5);
    const h = sz.y * 0.55;
    const mat = facadeMaterial("plaster", 13);
    // UVs in metres, so the façade tile keeps its storey-and-bay size
    const plane = (w: number) => {
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
      return g;
    };
    return {
      h,
      mat,
      faces: [
        { p: [c.x, h / 2, c.z - sz.z / 2 - 0.03] as [number, number, number], ry: Math.PI, g: plane(sz.x * 0.96) },
        { p: [c.x + sz.x / 2 + 0.03, h / 2, c.z - sz.z * 0.1] as [number, number, number], ry: Math.PI / 2, g: plane(sz.z * 0.75) },
        { p: [c.x - sz.x / 2 - 0.03, h / 2, c.z - sz.z * 0.1] as [number, number, number], ry: -Math.PI / 2, g: plane(sz.z * 0.75) },
      ],
    };
  }, [shed]);
  useFrame(() => {
    walls.mat.emissiveIntensity = world.night * 1.3;
  });
  const yard = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9c6bf", roughness: 0.95 }), []);
  const hazard = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffd23f", roughness: 0.6 }), []);
  return (
    <ZoneGroup id="workshop">
      {/* a concrete yard in front of the building, with a painted walkway */}
      <mesh position={[0, 0.03, -1]} rotation-x={-Math.PI / 2} material={yard} receiveShadow>
        <planeGeometry args={[26, 17]} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.04, 2.5]} rotation-x={-Math.PI / 2} material={hazard}>
          <planeGeometry args={[0.12, 11]} />
        </mesh>
      ))}
      {/* the makerspace, modelled in Blender (public/models/workshop.glb), at one and a half size */}
      <primitive object={shed} position={[4.5, 0, -6.5]} scale={1.5} />
      {/* windows on the back and side walls (the model's own walls are plain), up to the eaves */}
      <group position={[4.5, 0, -6.5]}>
        {walls.faces.map((f, i) => (
          <mesh key={i} position={f.p} rotation-y={f.ry} geometry={f.g} material={walls.mat} />
        ))}
      </group>
      <group position={[-7.5, 0, -1]} scale={1.25}>
        <IndustrialArm />
      </group>
      <Static>
      {[-1, 1].map((k) => (
        <group key={k} position={[-9.5, 0, -7.5 + k * 1.8]}>
          <Solid w={3} d={1.1} />
          <Workbench />
        </group>
      ))}
      {/* the bench drone, waiting for its props */}
      <group position={[-9.6, 1.0, -5.9]} rotation-y={0.4}>
        <Quad scale={2.6} spin={0} />
      </group>
      <group position={[9.5, 0, 3]} rotation-y={-0.3}>
        <Solid w={2.3} d={2.3} />
        <Pallet crates={[[-0.5, 0, -0.5], [0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 0.9, 0]]} />
      </group>
      <group position={[11.5, 0, -0.5]} rotation-y={0.2}>
        <Solid w={2.3} d={2.3} />
        <Pallet crates={[[-0.5, 0, 0], [0.5, 0, 0]]} />
      </group>
      </Static>
      <Billboard id="workshop" pos={[-11, 0, 7]} rotY={0.55} scale={0.9} />
    </ZoneGroup>
  );
}
