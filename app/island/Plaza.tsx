"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt } from "./terrain";
import { world } from "./store";

// The city centre: a fountain around Mission Control and a ring of milestones, Nerul to Singapore.
export const MILESTONES: { year: string; title: string; sub: string; c: string }[] = [
  { year: "2008–21", title: "Presentation Convent, Nerul", sub: "ICSE · 89% · cricket, football, chess", c: "#9ad1ff" },
  { year: "2021–24", title: "SPM Polytechnic, Solapur", sub: "Diploma CE · Distinction · Head Boy", c: "#ffd23f" },
  { year: "2024", title: "SIT Lonavala", sub: "B.Tech CS · six SSRN papers since", c: "#2d5bff" },
  { year: "Dec 2025", title: "Smart India Hackathon", sub: "National winner · Algo Sapiens", c: "#ffb300" },
  { year: "Feb 2026", title: "RoboRashtra · Morpheus", sub: "Runner-up · ran a 24-hour hackathon", c: "#22ff4c" },
  { year: "Apr 2026", title: "ISRO IRoC-U", sub: "Finalist · GPS-denied drone", c: "#ff5a36" },
  { year: "Apr–Oct 2026", title: "Doppelmayr India", sub: "Software development intern", c: "#ff5a6e" },
  { year: "15–17 Nov 2026", title: "Singapore", sub: "Singapore–India Hackathon finale · SMU", c: "#00d2ff" },
];

// between the road spokes (zones sit every 40° from −90°), skipping 90° where you arrive at HQ
const PLAQUE_R = 12;
const SLOTS = [-70, -30, 10, 50, 130, 170, 210, 250];
const plaqueAngle = (i: number) => (SLOTS[i] * Math.PI) / 180;

function plaqueTexture(m: (typeof MILESTONES)[number], i: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, 512, 320);
  g.fillStyle = m.c;
  g.fillRect(0, 0, 512, 10);
  g.font = "700 30px ui-monospace, monospace";
  g.fillText(`${String(i + 1).padStart(2, "0")} · ${m.year}`, 30, 70);
  g.fillStyle = "#ffffff";
  g.font = "800 44px system-ui, sans-serif";
  const words = m.title.split(" ");
  let line = "",
    y = 140;
  for (const w of words) {
    if (g.measureText(line + w).width > 450) {
      g.fillText(line, 30, y);
      line = "";
      y += 50;
    }
    line += w + " ";
  }
  g.fillText(line, 30, y);
  g.fillStyle = "rgba(255,255,255,.7)";
  g.font = "500 26px system-ui, sans-serif";
  g.fillText(m.sub, 30, 285);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* The fountain: flowing translucent jets arcing in toward the tower, a tall centre jet,
   splash rings where the water lands and a rippling pool with caustics. */
const streamMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uT: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float uNight; varying vec2 vUv;
      void main(){
        float flow = 0.55 + 0.45*sin(vUv.x*40.0 - uT*14.0);
        float edge = 1.0 - abs(vUv.y - 0.5)*2.0;
        float fade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x)*0.6);
        vec3 c = mix(vec3(0.86,0.96,1.0), vec3(0.55,0.85,1.0), uNight) * (0.85 + 0.15*flow);
        gl_FragColor = vec4(c, (0.45 + 0.4*flow) * (0.35 + 0.65*edge) * fade);
      }`,
  });

function Fountain() {
  const JETS = 16;
  const water = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uT: { value: 0 }, uNight: { value: 0 } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float uT; uniform float uNight; varying vec2 vP;
          float caustic(vec2 p){ return abs(sin(p.x*3.1+uT*1.3)+sin(p.y*2.7-uT*1.1)+sin((p.x+p.y)*2.2+uT*0.9)); }
          void main(){ float r = length(vP);
            float rip = sin(r*6.0 - uT*3.0)*0.5+0.5;
            float c = smoothstep(1.6, 2.6, caustic(vP*1.4));
            vec3 day = mix(vec3(0.16,0.58,0.78), vec3(0.55,0.9,1.0), rip*0.35 + c*0.45);
            vec3 night = mix(vec3(0.03,0.14,0.4), vec3(0.25,0.65,1.0), rip*0.4 + c*0.5);
            gl_FragColor = vec4(mix(day, night, uNight), 0.9); }`,
      }),
    []
  );
  const stream = useMemo(streamMat, []);
  const jets = useMemo(
    () =>
      Array.from({ length: JETS }, (_, j) => {
        const a = (j / JETS) * Math.PI * 2;
        const pts = Array.from({ length: 16 }, (_, k) => {
          const u = k / 15;
          const r = 5.6 - u * 3.5;
          return new THREE.Vector3(Math.cos(a) * r, 0.5 + Math.sin(u * Math.PI) * 2.8, Math.sin(a) * r);
        });
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.13, 8, false);
      }),
    []
  );
  const centre = useMemo(() => new THREE.CylinderGeometry(0.12, 0.35, 6, 12, 8, true), []);
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    water.uniforms.uT.value = stream.uniforms.uT.value = t;
    water.uniforms.uNight.value = stream.uniforms.uNight.value = world.night;
    // splash rings expand and fade where each jet lands
    rings.current?.children.forEach((r, i) => {
      const k = (t * 1.2 + i * 0.37) % 1;
      r.scale.setScalar(0.3 + k * 1.1);
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.6;
    });
  });
  return (
    <group>
      <mesh position={[0, 0.5, 0]} rotation-x={-Math.PI / 2} material={water}>
        <ringGeometry args={[1.5, 5.9, 64, 4]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.9, 6.6, 64]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[6.6, 6.8, 0.6, 64, 1, true]} />
        <meshStandardMaterial color="#d6d0c2" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {jets.map((g, i) => (
        <mesh key={i} geometry={g} material={stream} />
      ))}
      {/* the tall jet climbing the tower */}
      <mesh position={[0, 3.5, 0]} geometry={centre} material={stream} />
      <group ref={rings}>
        {Array.from({ length: JETS }, (_, j) => {
          const a = (j / JETS) * Math.PI * 2;
          return (
            <mesh key={j} position={[Math.cos(a) * 2.1, 0.52, Math.sin(a) * 2.1]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.25, 0.32, 20]} />
              <meshBasicMaterial color="#e6f8ff" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Milestones() {
  const mats = useMemo(
    () =>
      MILESTONES.map((m, i) => {
        const map = plaqueTexture(m, i);
        return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: 0.15, roughness: 0.6 });
      }),
    []
  );
  useEffect(() => () => mats.forEach((q) => (q.map?.dispose(), q.dispose())), [mats]);
  const glow = useMemo(() => MILESTONES.map((m) => new THREE.MeshStandardMaterial({ color: m.c, emissive: m.c, emissiveIntensity: 0.4 })), []);
  const traveller = useRef<THREE.Mesh>(null);
  const trail = useMemo(() => {
    const pts = MILESTONES.map((_, i) => new THREE.Vector3(Math.cos(plaqueAngle(i)) * (PLAQUE_R - 1.2), 0.12, Math.sin(plaqueAngle(i)) * (PLAQUE_R - 1.2)));
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const trailGeo = useMemo(() => new THREE.TubeGeometry(trail, 200, 0.07, 6, false), [trail]);
  const trailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#00d2ff", emissive: "#00d2ff", emissiveIntensity: 0.5 }), []);
  useFrame(({ clock }) => {
    const n = world.night;
    mats.forEach((q) => (q.emissiveIntensity = 0.15 + n * 0.9));
    glow.forEach((q) => (q.emissiveIntensity = 0.4 + n * 2.5));
    trailMat.emissiveIntensity = 0.4 + n * 2;
    // a light walks the path from school to Singapore, then starts again
    const u = (clock.elapsedTime * 0.04) % 1;
    traveller.current?.position.copy(trail.getPointAt(u)).setY(0.55 + Math.sin(clock.elapsedTime * 4) * 0.08);
  });
  return (
    <group>
      <mesh geometry={trailGeo} material={trailMat} />
      <mesh ref={traveller} material={trailMat}>
        <sphereGeometry args={[0.28, 16, 12]} />
      </mesh>
      {MILESTONES.map((m, i) => {
        const a = plaqueAngle(i);
        const x = Math.cos(a) * PLAQUE_R,
          z = Math.sin(a) * PLAQUE_R;
        return (
          <group key={m.title} position={[x, heightAt(x, z) - 0.05, z]} rotation-y={Math.atan2(-x, -z) + Math.PI}>
            <mesh position={[0, 0.9, 0]}>
              <boxGeometry args={[0.18, 1.8, 0.18]} />
              <meshStandardMaterial color="#2a2f36" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, 2.25, 0]} rotation-x={-0.12} material={mats[i]}>
              <planeGeometry args={[2.4, 1.5]} />
            </mesh>
            <mesh position={[0, 2.25, -0.03]} rotation-x={-0.12}>
              <boxGeometry args={[2.5, 1.6, 0.05]} />
              <meshStandardMaterial color="#141a26" />
            </mesh>
            <mesh position={[0, 0.06, 0]} material={glow[i]}>
              <cylinderGeometry args={[0.55, 0.6, 0.12, 24]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function JourneyPlaza() {
  return (
    <group position={[0, heightAt(0, 0), 0]}>
      <Fountain />
      <Milestones />
    </group>
  );
}

/* ---------- Singapore across the water: Marina Bay Sands, the ArtScience lotus and the Merlion ---------- */
export function Singapore() {
  const win = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8eef5", emissive: "#ffd89a", emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.3 }), []);
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f2f4f7", emissive: "#bfe6ff", emissiveIntensity: 0.05, roughness: 0.5 }), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f1ea", emissive: "#fff4d6", emissiveIntensity: 0.05, roughness: 0.7 }), []);
  const laser = useMemo(() => new THREE.MeshBasicMaterial({ color: "#7fe3ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const lasers = useRef<THREE.Group>(null);
  const spout = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const n = world.night,
      t = clock.elapsedTime;
    win.emissiveIntensity = 0.1 + n * 1.4;
    deck.emissiveIntensity = 0.05 + n * 1.0;
    stone.emissiveIntensity = 0.05 + n * 0.7;
    laser.opacity = n * 0.35;
    lasers.current?.children.forEach((l, i) => (l.rotation.z = Math.sin(t * 0.4 + i * 1.7) * 0.6));
    // the Merlion's water jet
    for (let k = 0; k < 40; k++) {
      const u = (t * 0.7 + k / 40) % 1;
      m.makeScale(0.35, 0.35, 0.35).setPosition(u * 9, 9 - u * u * 11, 0);
      spout.current!.setMatrixAt(k, m);
    }
    spout.current!.instanceMatrix.needsUpdate = true;
  });
  // south-east across the water, facing the island
  const a = (128 * Math.PI) / 180,
    d = 150;
  return (
    <group position={[Math.cos(a) * d, 0, Math.sin(a) * d]} rotation-y={-a - Math.PI / 2}>
      {/* the bay front */}
      <mesh position={[0, -0.9, -8]}>
        <boxGeometry args={[150, 2, 40]} />
        <meshStandardMaterial color="#b9c4b4" roughness={1} />
      </mesh>
      {/* Marina Bay Sands: three slightly leaning towers and the SkyPark ship across the top */}
      <group position={[0, 0, -10]} scale={1.4}>
        {[-14, 0, 14].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[-1.6, 20, 0]} rotation-z={0.05} material={win} castShadow>
              <boxGeometry args={[3.2, 40, 6]} />
            </mesh>
            <mesh position={[1.7, 20, 0]} rotation-z={-0.07} material={win} castShadow>
              <boxGeometry args={[3.2, 40, 6]} />
            </mesh>
          </group>
        ))}
        <mesh position={[2, 41.5, 0]} material={deck} castShadow>
          <boxGeometry args={[52, 1.8, 7]} />
        </mesh>
        <mesh position={[28.5, 41.5, 0]} rotation-y={Math.PI / 4} material={deck}>
          <boxGeometry args={[4.5, 1.6, 4.5]} />
        </mesh>
        <group ref={lasers} position={[2, 42.5, 0]}>
          {[-14, 0, 14].map((x) => (
            <mesh key={x} position={[x, 0, 0]} material={laser}>
              <cylinderGeometry args={[0.1, 0.1, 160, 6, 1, true]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* ArtScience Museum lotus */}
      <group position={[-42, 0, 4]}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[0, 4, 0]} rotation={[0.55, (i / 10) * Math.PI * 2, 0]} material={stone} castShadow>
            <coneGeometry args={[1.6, 9, 6, 1, true]} />
          </mesh>
        ))}
      </group>
      {/* the Merlion on its quay, spouting into the bay */}
      <group position={[34, 0, 9]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1, 0]} material={stone}>
          <cylinderGeometry args={[3, 3.4, 2, 16]} />
        </mesh>
        <mesh position={[0, 4.5, 0]} material={stone} castShadow>
          <cylinderGeometry args={[1.3, 1.9, 5, 12]} />
        </mesh>
        <mesh position={[0, 7.8, 0]} material={stone}>
          <sphereGeometry args={[1.8, 16, 12]} />
        </mesh>
        {/* mane and tail */}
        <mesh position={[-0.5, 7.4, 0]} scale={[1.2, 1.1, 1.5]} material={stone}>
          <icosahedronGeometry args={[1.6, 0]} />
        </mesh>
        <mesh position={[-1.5, 2.6, 0]} rotation-z={0.8} material={stone}>
          <torusGeometry args={[1.2, 0.35, 8, 16, Math.PI]} />
        </mesh>
        <instancedMesh ref={spout} args={[undefined, undefined, 40]} frustumCulled={false} position={[1.6, -0.6, 0]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshStandardMaterial color="#d8f4ff" emissive="#7fd8ff" emissiveIntensity={0.6} transparent opacity={0.8} />
        </instancedMesh>
      </group>
    </group>
  );
}

/* ---------- Singapore on the island: the Merlion on a quay at the end of the pier, a small
   Marina Bay Sands on the beach beside it ---------- */
const polarXZ = (deg: number, r: number): [number, number] => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];

function Merlion({ stone }: { stone: THREE.Material }) {
  const spout = useRef<THREE.InstancedMesh>(null);
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8f4ff", emissive: "#7fd8ff", emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    water.emissiveIntensity = 0.4 + world.night * 1.6;
    for (let k = 0; k < 48; k++) {
      const u = (t * 0.8 + k / 48) % 1;
      const s = 0.12 + u * 0.12;
      m.makeScale(s, s, s).setPosition(1.1 + u * 5.5, 3.7 - u * u * 5.2, 0);
      spout.current!.setMatrixAt(k, m);
    }
    spout.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {/* the fish body coils up from the plinth */}
      <mesh position={[0, 1.1, 0]} material={stone} castShadow>
        <cylinderGeometry args={[0.7, 1.05, 2.2, 16]} />
      </mesh>
      <mesh position={[-0.55, 0.8, 0]} rotation-z={0.9} material={stone} castShadow>
        <torusGeometry args={[0.7, 0.24, 8, 18, Math.PI * 1.2]} />
      </mesh>
      {/* scales: a few ridges */}
      {[0.5, 1.0, 1.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={stone}>
          <torusGeometry args={[0.92 - y * 0.12, 0.05, 6, 20]} />
        </mesh>
      ))}
      {/* the lion's head with its mane and an open mouth facing the sea */}
      <group position={[0.15, 2.85, 0]}>
        <mesh scale={[1.1, 1, 1]} material={stone} castShadow>
          <sphereGeometry args={[0.72, 18, 14]} />
        </mesh>
        <mesh position={[-0.25, 0.05, 0]} scale={[0.9, 1.15, 1.25]} material={stone} castShadow>
          <icosahedronGeometry args={[0.8, 1]} />
        </mesh>
        <mesh position={[0.72, -0.12, 0]} rotation-z={-Math.PI / 2} material={stone}>
          <cylinderGeometry args={[0.32, 0.42, 0.4, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.55, 0.28, s * 0.28]} material={stone}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={spout} args={[undefined, undefined, 48]} material={water} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
      </instancedMesh>
    </group>
  );
}

function MiniMBS({ win, deck }: { win: THREE.Material; deck: THREE.Material }) {
  return (
    <group>
      {[-4.2, 0, 4.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[-0.5, 6, 0]} rotation-z={0.05} material={win} castShadow>
            <boxGeometry args={[1, 12, 1.8]} />
          </mesh>
          <mesh position={[0.5, 6, 0]} rotation-z={-0.07} material={win} castShadow>
            <boxGeometry args={[1, 12, 1.8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.6, 12.4, 0]} material={deck} castShadow>
        <boxGeometry args={[15.6, 0.55, 2.1]} />
      </mesh>
      <mesh position={[8.5, 12.4, 0]} rotation-y={Math.PI / 4} material={deck}>
        <boxGeometry args={[1.4, 0.5, 1.4]} />
      </mesh>
    </group>
  );
}

export function SingaporeCorner() {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f1ea", emissive: "#fff4d6", emissiveIntensity: 0.05, roughness: 0.7 }), []);
  const win = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8eef5", emissive: "#ffd89a", emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.3 }), []);
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f2f4f7", emissive: "#bfe6ff", emissiveIntensity: 0.05, roughness: 0.5 }), []);
  useFrame(() => {
    const n = world.night;
    stone.emissiveIntensity = 0.05 + n * 0.7;
    win.emissiveIntensity = 0.1 + n * 1.3;
    deck.emissiveIntensity = 0.05 + n * 0.9;
  });
  const PIER = 95;
  const [qx, qz] = polarXZ(PIER, 78);
  const [mx, mz] = polarXZ(PIER + 10, 64);
  const out = -(PIER * Math.PI) / 180; // local +x points out to sea
  return (
    <group>
      {/* round quay at the end of the pier, linked by a short walkway */}
      <group position={[qx, 0, qz]} rotation-y={out}>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <cylinderGeometry args={[2.8, 3, 0.7, 28]} />
          <meshStandardMaterial color="#d9d3c4" roughness={0.9} />
        </mesh>
        <mesh position={[-2.6, 0.35, 0]}>
          <boxGeometry args={[2.4, 0.2, 2]} />
          <meshStandardMaterial color="#9c6b43" roughness={0.9} />
        </mesh>
        <group position={[0, 0.6, 0]} scale={1.15}>
          <Merlion stone={stone} />
        </group>
      </group>
      <group position={[mx, heightAt(mx, mz) - 0.1, mz]} rotation-y={out + Math.PI / 2} scale={0.75}>
        <MiniMBS win={win} deck={deck} />
      </group>
    </group>
  );
}
