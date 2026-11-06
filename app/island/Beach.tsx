"use client";

// The waterline and Palm Beach. A band of surf follows the real coastline all the way round (the
// shore radius is sampled per degree into a texture the shader reads), and the flat west shore below
// the lighthouse becomes Palm Beach, after Palm Beach Road in Navi Mumbai: striped umbrellas,
// loungers, kayaks pulled up on the sand and a lifeguard tower.
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { fontFamily } from "./landmarks/common";
import { Solid, Static } from "./Props";
import { world } from "./store";
import { BEACH, heightAt, rng } from "./terrain";

const SEA_Y = -0.35;
const STEPS = 720; // shore samples round the island

/** Radius where the ground dips under the sea, every half degree. */
function shoreRadii() {
  const out = new Float32Array(STEPS);
  for (let i = 0; i < STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    let r = 84;
    while (r < 112 && heightAt(Math.cos(a) * r, Math.sin(a) * r) > SEA_Y) r += 0.25;
    out[i] = r;
  }
  return out;
}

export function Surf() {
  const mat = useMemo(() => {
    const tex = new THREE.DataTexture(shoreRadii(), STEPS, 1, THREE.RedFormat, THREE.FloatType);
    tex.wrapS = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uShore: { value: tex }, uTime: { value: 0 }, uNight: { value: 0 } },
      vertexShader: `varying vec2 vXZ; void main(){ vec4 w = modelMatrix * vec4(position,1.); vXZ = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D uShore; uniform float uTime; uniform float uNight; varying vec2 vXZ;
        void main(){
          float a = atan(vXZ.y, vXZ.x) / 6.2831853;
          float d = length(vXZ) - texture2D(uShore, vec2(fract(a), .5)).r; // metres out from the waterline
          if (d < -0.4) discard;
          // a bright lip at the sand, then two rollers that run in and fade
          float lip = smoothstep(-0.4, 0.1, d) * (1. - smoothstep(0.2, 1.1, d));
          float wob = sin(a * 6.2831853 * 90. + uTime * 0.7) * 0.25;
          float r1 = fract(uTime * 0.12 + wob * 0.1);
          float w1 = exp(-pow((d - (1. - r1) * 5.) * 1.6, 2.)) * r1;
          float r2 = fract(uTime * 0.12 + .5 + wob * 0.1);
          float w2 = exp(-pow((d - (1. - r2) * 5.) * 1.6, 2.)) * r2;
          float k = clamp(lip * .85 + (w1 + w2) * .55, 0., 1.) * (1. - smoothstep(4., 6., d));
          gl_FragColor = vec4(mix(vec3(1.), vec3(.55,.62,.85), uNight), k * (0.9 - uNight * 0.5));
        }`,
    });
  }, []);
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
    mat.uniforms.uNight.value = world.night;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={SEA_Y + 0.06} material={mat} renderOrder={1}>
      <ringGeometry args={[88, 114, 720, 1]} />
    </mesh>
  );
}

/* ---------------- Palm Beach ---------------- */
const { from: FROM, to: TO } = BEACH; // degrees round the island
const at = (deg: number, r: number): [number, number, number] => {
  const a = (deg * Math.PI) / 180;
  const x = Math.cos(a) * r,
    z = Math.sin(a) * r;
  return [x, Math.max(heightAt(x, z), SEA_Y + 0.1), z];
};
/** Facing out to sea at this bearing. */
const seaward = (deg: number) => Math.PI / 2 - (deg * Math.PI) / 180;

function stripes(a: string, b: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 8;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(i * 32, 0, 32, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Umbrella({ deg, r, a, b, tilt }: { deg: number; r: number; a: string; b: string; tilt: number }) {
  const map = useMemo(() => stripes(a, b), [a, b]);
  const p = at(deg, r);
  return (
    <group position={p} rotation={[tilt, seaward(deg) + tilt * 3, 0]}>
      <mesh position-y={1.2} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
      </mesh>
      <mesh position-y={2.35} castShadow>
        <coneGeometry args={[1.5, 0.55, 16, 1, true]} />
        <meshStandardMaterial map={map} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Lounger({ deg, r, color }: { deg: number; r: number; color: string }) {
  const p = at(deg, r);
  return (
    <group position={p} rotation-y={seaward(deg)}>
      {/* frame, seat and a raised back, foot end toward the water */}
      <mesh position={[0, 0.28, 0.2]} castShadow>
        <boxGeometry args={[0.62, 0.07, 1.25]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -0.55]} rotation-x={-0.9} castShadow>
        <boxGeometry args={[0.62, 0.07, 0.65]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[-0.26, 0.26].map((x) =>
        [-0.35, 0.7].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.13, z]}>
            <boxGeometry args={[0.05, 0.26, 0.05]} />
            <meshStandardMaterial color="#d9d4c7" roughness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Kayak({ deg, r, color }: { deg: number; r: number; color: string }) {
  const p = at(deg, r);
  return (
    <group position={[p[0], p[1] + 0.18, p[2]]} rotation-y={seaward(deg) + 0.5}>
      <mesh rotation-x={Math.PI / 2} scale={[1, 1, 0.55]} castShadow>
        <capsuleGeometry args={[0.32, 2.6, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.16, 0.2]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 12]} />
        <meshStandardMaterial color="#1d2430" roughness={0.6} />
      </mesh>
    </group>
  );
}

function LifeguardTower({ deg, r }: { deg: number; r: number }) {
  const p = at(deg, r);
  const red = "#d8312b",
    wood = "#e9dcc0";
  return (
    <group position={p} rotation-y={seaward(deg)}>
      {[-0.8, 0.8].map((x) =>
        [-0.8, 0.8].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.3, z]} castShadow>
            <boxGeometry args={[0.14, 2.6, 0.14]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
        ))
      )}
      <mesh position={[0, 2.65, 0]} castShadow>
        <boxGeometry args={[2.1, 0.12, 2.1]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.35, 0]} castShadow>
        <boxGeometry args={[1.7, 1.3, 1.5]} />
        <meshStandardMaterial color={red} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.45, 0.76]}>
        <boxGeometry args={[1.3, 0.55, 0.02]} />
        <meshStandardMaterial color="#9fd3ef" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 4.15, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[1.5, 0.6, 4]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
      </mesh>
      {/* ramp down to the sand on the land side */}
      <mesh position={[0, 1.3, -2.1]} rotation-x={-0.62} castShadow>
        <boxGeometry args={[0.8, 0.08, 3.2]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 5]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
      <mesh position={[0.35, 5.45, 0]}>
        <boxGeometry args={[0.7, 0.42, 0.02]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.6} />
      </mesh>
    </group>
  );
}

function BeachSign({ deg, r }: { deg: number; r: number }) {
  const p = at(deg, r);
  const face = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f4ead2";
    g.fillRect(0, 0, 512, 160);
    g.textAlign = "center";
    g.fillStyle = "#0f5f7a";
    g.font = `800 64px ${fontFamily()}`;
    g.fillText("PALM BEACH", 256, 86);
    g.fillStyle = "#6b5a3e";
    g.font = `600 22px ${fontFamily()}`;
    g.fillText("NAVI MUMBAI · HOME", 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <group position={p} rotation-y={seaward(deg)}>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 1.8, 6]} />
          <meshStandardMaterial color="#8a6a46" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.65, 0]} castShadow>
        <boxGeometry args={[2.9, 0.95, 0.12]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.65, 0.065]}>
        <planeGeometry args={[2.8, 0.88]} />
        <meshStandardMaterial map={face} roughness={0.8} />
      </mesh>
    </group>
  );
}

const UMB: [string, string][] = [
  ["#ff5a5f", "#ffffff"],
  ["#1f9fd6", "#ffffff"],
  ["#ffd23f", "#ff8a3d"],
  ["#2ec27e", "#ffffff"],
];
const KAYAK = ["#ff7a1a", "#ffd23f", "#e2463b"];

export default function PalmBeach() {
  const spots = useMemo(() => {
    const r = rng(311);
    const out: { deg: number; tilt: number; ui: number }[] = [];
    // umbrellas in a loose row with a lounger pair under each, kept off the sign and the tower
    for (let deg = FROM + 2; deg <= TO - 3; deg += 2.6 + r() * 1.2) {
      if (Math.abs(deg - 182) < 2.5 || Math.abs(deg - 175) < 1.5) continue;
      out.push({ deg, tilt: (r() - 0.5) * 0.18, ui: Math.floor(r() * UMB.length) });
    }
    return out;
  }, []);
  return (
    <group>
      <Static>
        {spots.map((s, i) => (
          <group key={i}>
            <Umbrella deg={s.deg} r={91.2} a={UMB[s.ui][0]} b={UMB[s.ui][1]} tilt={s.tilt} />
            <Lounger deg={s.deg - 0.55} r={91.9} color={i % 2 ? "#ffffff" : "#f6e6c4"} />
            <Lounger deg={s.deg + 0.55} r={91.9} color={i % 2 ? "#f6e6c4" : "#ffffff"} />
          </group>
        ))}
        {[171.5, 172.6, 190.8].map((deg, i) => (
          <Kayak key={deg} deg={deg} r={95.3} color={KAYAK[i]} />
        ))}
        <LifeguardTower deg={182} r={90.6} />
      </Static>
      <BeachSign deg={175} r={88.6} />
      <group position={at(182, 90.6)}>
        <Solid r={1.4} />
      </group>
    </group>
  );
}
