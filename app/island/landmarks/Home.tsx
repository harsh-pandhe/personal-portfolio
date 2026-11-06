"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { world } from "../store";
import { M, useGlow, Billboard, ZoneGroup, boxMetres, facadeMaterial } from "./common";

/* Home: a modern two-storey Navi Mumbai house with a lit glazed ground floor, a cantilevered
   upper floor and balcony, solar panels and the black water tank on the roof, and coconut palms. */
function Palm({ x, z, h = 5.5, lean = 0.25 }: { x: number; z: number; h?: number; lean?: number }) {
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9a7652", roughness: 1 }), []);
  const frond = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3f9b46", roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), []);
  const segs = 6;
  return (
    <group position={[x, 0, z]} rotation-z={lean}>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / segs) * 1.2) * 0.25, (i + 0.5) * (h / segs), 0]} material={trunk} castShadow>
          <cylinderGeometry args={[0.16 - i * 0.012, 0.19 - i * 0.012, h / segs + 0.02, 7]} />
        </mesh>
      ))}
      <group position={[0.3, h, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} rotation={[0, (i / 8) * Math.PI * 2, 0.95]} position={[0, 0, 0]} material={frond} castShadow>
            <coneGeometry args={[0.35, 2.6, 4, 1, true]} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.22, -0.2, Math.sin(i * 2.1) * 0.22]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#6b5a2a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Home() {
  const win = useGlow("#ffd27a", 0.05, 2.4);
  // windowed plaster on every side, so the house reads from behind and across the plot too
  const walls = useMemo(() => ({ ground: boxMetres(7.4, 3.2, 5), upper: boxMetres(8.2, 2.9, 5), mat: facadeMaterial("plaster", 5), mat2: facadeMaterial("plaster", 9) }), []);
  useFrame(() => {
    walls.mat.emissiveIntensity = walls.mat2.emissiveIntensity = world.night * 1.4;
  });
  const plaster = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f6f1e8", roughness: 0.85 }), []);
  const upper = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8d2c8", roughness: 0.8 }), []);
  const cladding = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a86b3c", roughness: 0.75 }), []);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2f36", roughness: 0.5, metalness: 0.4 }), []);
  const solar = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b2c5a", roughness: 0.25, metalness: 0.6 }), []);
  const lawn = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5fb85a", roughness: 1 }), []);
  const pot = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c46a3e", roughness: 0.9 }), []);
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b9a4a", roughness: 0.8, flatShading: true }), []);
  return (
    <ZoneGroup id="home">
      {/* front lawn and a stone path to the door */}
      <mesh position={[0, 0.03, -0.2]} rotation-x={-Math.PI / 2} material={lawn} receiveShadow>
        <planeGeometry args={[12, 3]} />
      </mesh>
      {[0.6, -0.4, -1.4].map((z) => (
        <mesh key={z} position={[0.2, 0.05, z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.38, 8]} />
          <meshStandardMaterial color="#cfc8bb" roughness={1} />
        </mesh>
      ))}
      <group position={[0, 0, -4.2]}>
        {/* ground floor */}
        <mesh position={[0, 1.6, 0]} geometry={walls.ground} material={walls.mat} castShadow receiveShadow />
        {/* glazed front, lit from inside at night */}
        <mesh position={[0.9, 1.45, 2.49]} material={win}>
          <planeGeometry args={[4.6, 2.5]} />
        </mesh>
        <mesh position={[0.9, 1.45, 2.53]} material={M.glass}>
          <planeGeometry args={[4.6, 2.5]} />
        </mesh>
        {[-1.4, -0.25, 0.9, 2.05, 3.2].map((x) => (
          <mesh key={x} position={[x, 1.45, 2.56]} material={frame}>
            <boxGeometry args={[0.07, 2.55, 0.06]} />
          </mesh>
        ))}
        {/* wood-clad entrance with the front door */}
        <mesh position={[-2.6, 1.6, 2.52]} material={cladding}>
          <boxGeometry args={[2.2, 3.2, 0.06]} />
        </mesh>
        <mesh position={[-2.6, 1.1, 2.57]} material={frame}>
          <boxGeometry args={[1.0, 2.2, 0.05]} />
        </mesh>
        <mesh position={[-2.6, 3.05, 3.2]} material={upper} castShadow>
          <boxGeometry args={[2.4, 0.14, 1.4]} />
        </mesh>
        {[-3.5, -1.7].map((x) => (
          <mesh key={x} position={[x, 2.2, 2.62]} material={win}>
            <boxGeometry args={[0.16, 0.3, 0.1]} />
          </mesh>
        ))}
        {/* cantilevered upper floor */}
        <mesh position={[0.4, 4.65, 0.5]} geometry={walls.upper} material={walls.mat2} castShadow receiveShadow />
        <mesh position={[0.4, 4.75, 3.01]} material={win}>
          <planeGeometry args={[6.8, 1.5]} />
        </mesh>
        {[-2.6, -0.9, 0.8, 2.5].map((x) => (
          <mesh key={x} position={[x + 0.4, 4.75, 3.04]} material={frame}>
            <boxGeometry args={[0.06, 1.55, 0.05]} />
          </mesh>
        ))}
        {/* vertical louvres on the side */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[4.55, 4.65, -1.4 + i * 0.6]} material={cladding}>
            <boxGeometry args={[0.08, 2.7, 0.22]} />
          </mesh>
        ))}
        {/* balcony with a glass rail and planters */}
        <mesh position={[0.4, 3.15, 3.8]} material={upper} castShadow>
          <boxGeometry args={[8.2, 0.2, 1.6]} />
        </mesh>
        <mesh position={[0.4, 3.75, 4.58]} material={M.glass}>
          <boxGeometry args={[8.2, 1, 0.04]} />
        </mesh>
        <mesh position={[0.4, 4.27, 4.58]} material={frame}>
          <boxGeometry args={[8.2, 0.05, 0.07]} />
        </mesh>
        {[-3, 3.6].map((x) => (
          <group key={x} position={[x, 3.25, 4.1]}>
            <mesh position={[0, 0.25, 0]} material={pot}>
              <cylinderGeometry args={[0.28, 0.22, 0.5, 10]} />
            </mesh>
            <mesh position={[0, 0.8, 0]} material={leaf}>
              <icosahedronGeometry args={[0.45, 0]} />
            </mesh>
          </group>
        ))}
        {/* roof: parapet, solar panels and the water tank */}
        <mesh position={[0.4, 6.2, 0.5]} material={plaster}>
          <boxGeometry args={[8.4, 0.25, 5.2]} />
        </mesh>
        {[-2.2, -0.6, 1.0].map((x) =>
          [-0.6, 1.0].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 6.65, z]} rotation-x={-0.35} material={solar} castShadow>
              <boxGeometry args={[1.4, 0.06, 1.1]} />
            </mesh>
          ))
        )}
        <mesh position={[3.2, 7.0, -0.8]} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.3, 14]} />
          <meshStandardMaterial color="#1c1f24" roughness={0.6} />
        </mesh>
        <mesh position={[3.2, 6.45, -0.8]} material={frame}>
          <boxGeometry args={[1.4, 0.2, 1.4]} />
        </mesh>
      </group>
      <Palm x={-5.6} z={-1.6} h={6.2} lean={0.18} />
      <Palm x={5.4} z={-2.4} h={5.4} lean={-0.22} />
      {/* bench + mailbox */}
      <mesh position={[-3.8, 0.45, 0.6]} material={M.wood} castShadow>
        <boxGeometry args={[2, 0.15, 0.6]} />
      </mesh>
      <mesh position={[3.4, 0.8, 1.0]} material={M.red} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.7]} />
      </mesh>
      <mesh position={[3.4, 0.4, 1.0]} material={M.dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
      </mesh>
      <Billboard id="home" pos={[6.5, 0, 5.6]} rotY={-0.35} scale={0.85} />
    </ZoneGroup>
  );
}
