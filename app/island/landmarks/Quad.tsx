"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

const QMAT = {
  frame: new THREE.MeshStandardMaterial({ color: "#20242b", roughness: 0.55, metalness: 0.3 }),
  arm: new THREE.MeshStandardMaterial({ color: "#e8452c", roughness: 0.5, metalness: 0.1 }),
  motor: new THREE.MeshStandardMaterial({ color: "#9aa3ad", roughness: 0.3, metalness: 0.8 }),
  prop: new THREE.MeshStandardMaterial({ color: "#111418", roughness: 0.6 }),
  blur: new THREE.MeshBasicMaterial({ color: "#c9d2dc", transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  ledF: new THREE.MeshStandardMaterial({ color: "#1dff7a", emissive: "#1dff7a", emissiveIntensity: 2 }),
  ledB: new THREE.MeshStandardMaterial({ color: "#ff2d2d", emissive: "#ff2d2d", emissiveIntensity: 2 }),
  bat: new THREE.MeshStandardMaterial({ color: "#2d5bff", roughness: 0.6 }),
};

export function Quad({ scale = 5.5, spin = 1 }: { scale?: number; spin?: number }) {
  const props = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    // alternate spin directions, like a real X-quad
    props.current.forEach((p, i) => p && (p.rotation.y += dt * 38 * spin * (i % 3 === 0 ? 1 : -1)));
  });
  const k = scale / 5.5;
  const arm = 0.82;
  return (
    <group scale={k}>
      {/* body: bottom plate, top plate, battery, flight controller */}
      <mesh position={[0, 0.2, 0]} material={QMAT.frame} castShadow>
        <boxGeometry args={[0.55, 0.05, 0.55]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={QMAT.frame} castShadow>
        <boxGeometry args={[0.48, 0.04, 0.48]} />
      </mesh>
      <mesh position={[0, 0.43, 0]} material={QMAT.bat} castShadow>
        <boxGeometry args={[0.36, 0.14, 0.16]} />
      </mesh>
      <mesh position={[0, 0.27, 0]} material={QMAT.motor}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
      </mesh>
      {/* landing gear */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 0.26, 0.08, 0]} rotation-z={sx * 0.35} material={QMAT.frame}>
            <boxGeometry args={[0.03, 0.26, 0.03]} />
          </mesh>
          <mesh position={[sx * 0.31, -0.03, 0]} rotation-x={Math.PI / 2} material={QMAT.frame}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * arm,
          z = Math.sin(a) * arm;
        return (
          <group key={i}>
            <mesh position={[x / 2, 0.27, z / 2]} rotation-y={-a} material={QMAT.arm} castShadow>
              <boxGeometry args={[arm, 0.05, 0.08]} />
            </mesh>
            <mesh position={[x, 0.33, z]} material={QMAT.motor} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 14]} />
            </mesh>
            <mesh position={[x * 1.03, 0.22, z * 1.03]} material={i === 0 || i === 1 ? QMAT.ledF : QMAT.ledB}>
              <sphereGeometry args={[0.03, 8, 6]} />
            </mesh>
            <group position={[x, 0.41, z]} ref={(el) => void (props.current[i] = el!)}>
              <mesh material={QMAT.prop} castShadow>
                <boxGeometry args={[0.6, 0.012, 0.055]} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} material={QMAT.blur}>
                <circleGeometry args={[0.31, 24]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
