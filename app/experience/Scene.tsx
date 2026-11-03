"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  chartShape,
  globeShape,
  helixShape,
  marsShape,
  ringsShape,
  ropewayShape,
  textShape,
} from "./shapes";

export const SECTION_COUNT = 7;

// one tint per section: hero, missions, research, systems, markets, mars, contact
const PALETTE = ["#7dd3fc", "#a5b4fc", "#c4b5fd", "#fcd34d", "#6ee7b7", "#fb923c", "#f0abfc"];

// how freely each shape may orbit (0 = face the camera, 1 = free spin)
const ORBIT = [0, 1, 1, 0, 0, 0.2, 1];
// where the swarm sits per section (content takes the other side / the bottom)
const OFFX = [0, -3.2, 3.2, 0, 0, 0, -3.2];
const OFFY = [0.9, 0, 0, 1.3, 1.3, 1.2, 0];

const smooth = (x: number) => x * x * (3 - 2 * x);

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function Swarm({ count, progress }: { count: number; progress: React.MutableRefObject<number> }) {
  const geo = useRef<THREE.BufferGeometry>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const [targets, setTargets] = useState<Float32Array[] | null>(null);
  const sprite = useMemo(() => (typeof document === "undefined" ? null : dotTexture()), []);
  const delays = useMemo(() => {
    const d = new Float32Array(count);
    for (let i = 0; i < count; i++) d[i] = Math.random() * 0.45;
    return d;
  }, [count]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const tint = useMemo(() => new THREE.Color(), []);
  const a = useMemo(() => new THREE.Color(), []);
  const b = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const build = () =>
      setTargets([
        textShape(count, "HARSH"),
        globeShape(count),
        helixShape(count),
        ropewayShape(count),
        chartShape(count),
        marsShape(count),
        ringsShape(count),
      ]);
    // wait for the Inter font so the text sample is crisp
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
  }, [count]);

  useFrame((state, dt) => {
    if (!targets || !geo.current || !mat.current || !group.current) return;
    const p = Math.min(Math.max(progress.current, 0), SECTION_COUNT - 1.0001);
    const i = Math.floor(p);
    const f = p - i;
    const A = targets[i];
    const B = targets[i + 1];
    const t = state.clock.elapsedTime;
    const arr = positions;
    const burst = Math.sin(f * Math.PI); // 0 at rest, 1 mid-transition
    for (let k = 0; k < count; k++) {
      const local = smooth(Math.min(Math.max((f - delays[k]) / 0.55, 0), 1));
      const ix = k * 3;
      const wob = 0.012 * Math.sin(t * 1.3 + k * 0.37);
      arr[ix] = A[ix] + (B[ix] - A[ix]) * local + wob + burst * Math.sin(k * 1.7 + t) * 0.35;
      arr[ix + 1] = A[ix + 1] + (B[ix + 1] - A[ix + 1]) * local + wob + burst * Math.cos(k * 2.3 + t) * 0.35;
      arr[ix + 2] = A[ix + 2] + (B[ix + 2] - A[ix + 2]) * local + wob + burst * Math.sin(k * 0.9 - t) * 0.35;
    }
    const attr = geo.current.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;

    a.set(PALETTE[i]);
    b.set(PALETTE[i + 1]);
    tint.copy(a).lerp(b, smooth(f));
    mat.current.color.copy(tint);

    // slow orbit + pointer parallax
    spin.current += dt * 0.35;
    // text / ropeway / chart read face-on; globe, helix, rings may orbit freely
    const w = ORBIT[i] + (ORBIT[i + 1] - ORBIT[i]) * smooth(f);
    group.current.rotation.y = Math.sin(spin.current * 0.5) * 0.18 * (1 - w) + spin.current * 0.25 * w;
    group.current.rotation.x = i === 5 || i === 4 ? -0.35 * smooth(i === 5 ? 1 : f) : 0;
    // slide the swarm aside so each section's copy has room
    const lp = (arr: number[]) => arr[i] + (arr[i + 1] - arr[i]) * smooth(f);
    const mobile = state.size.width < 768;
    group.current.position.x += ((mobile ? 0 : lp(OFFX)) - group.current.position.x) * 0.12;
    group.current.position.y += ((mobile ? lp(OFFY) + 1.2 : lp(OFFY)) - group.current.position.y) * 0.12;
    const tx = state.pointer.x * 0.5;
    const ty = state.pointer.y * 0.3;
    state.camera.position.x += (tx - state.camera.position.x) * 0.04;
    state.camera.position.y += (ty - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geo}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          map={sprite ?? undefined}
          size={0.07}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#7dd3fc"
        />
      </points>
    </group>
  );
}

export default function Scene({ progress }: { progress: React.MutableRefObject<number> }) {
  const [count, setCount] = useState(4200);
  useEffect(() => {
    if (window.innerWidth < 768) setCount(2200);
  }, []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 50 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 12, 30]} />
      <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      <Swarm count={count} progress={progress} />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.1} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
