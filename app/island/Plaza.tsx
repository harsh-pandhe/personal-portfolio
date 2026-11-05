"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heightAt, PLAZA_R, rng } from "./terrain";
import { zonePos, ZONES } from "./zones";
import { Bench, Flag, LampPost, Solid, useNightGlow } from "./Props";
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

// between the boulevards (zones sit every 40° from −90°); 90° is the arrival side, kept for the HQ sign
const SLOTS = [-70, -30, 10, 50, 130, 170, 210, 250];
const slotAngle = (i: number) => (SLOTS[i] * Math.PI) / 180;
const BED_R0 = 12.2,
  BED_R1 = 17.6;
const STELE_R = 12.9;

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

/* The fountain: a wide outer basin you can sit on, a raised middle pool that spills over in a
   curtain, 24 jets arcing from the rim into it, bubblers in the middle pool, and Mission Control's
   tower rising from a stone island at the centre. */
const streamMat = (down = false) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float uNight; varying vec2 vUv;
      void main(){
        float along = ${down ? "1.0 - vUv.y" : "vUv.x"};
        float flow = 0.55 + 0.45*sin(along*40.0 - uT*14.0 + ${down ? "vUv.x*60.0" : "0.0"});
        float edge = ${down ? "1.0" : "1.0 - abs(vUv.y - 0.5)*2.0"};
        float fade = smoothstep(0.0, 0.08, along) * (1.0 - smoothstep(0.85, 1.0, along)*0.6);
        vec3 c = mix(vec3(0.86,0.96,1.0), vec3(0.55,0.85,1.0), uNight) * (0.85 + 0.15*flow);
        gl_FragColor = vec4(c, (0.4 + 0.4*flow) * (0.35 + 0.65*edge) * fade * ${down ? "0.7" : "1.0"});
      }`,
  });

const OUTER = 9.2,
  MID = 5;
function Fountain() {
  const JETS = 24;
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
            vec3 day = mix(vec3(0.12,0.55,0.76), vec3(0.55,0.9,1.0), rip*0.35 + c*0.45);
            vec3 night = mix(vec3(0.03,0.14,0.4), vec3(0.25,0.65,1.0), rip*0.4 + c*0.5);
            gl_FragColor = vec4(mix(day, night, uNight), 0.92); }`,
      }),
    []
  );
  const stream = useMemo(() => streamMat(), []);
  const curtain = useMemo(() => streamMat(true), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e6dfd0", roughness: 0.8 }), []);
  const stoneDark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b9b09c", roughness: 0.85 }), []);
  const lights = useMemo(() => new THREE.MeshStandardMaterial({ color: "#bfefff", emissive: "#59d6ff", emissiveIntensity: 0 }), []);
  const jets = useMemo(
    () =>
      Array.from({ length: JETS }, (_, j) => {
        const a = (j / JETS) * Math.PI * 2;
        const pts = Array.from({ length: 16 }, (_, k) => {
          const u = k / 15;
          const r = OUTER - 0.7 - u * (OUTER - MID - 0.2);
          const y = 0.55 + u * 0.7 + Math.sin(u * Math.PI) * 2.6;
          return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        });
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 8, false);
      }),
    []
  );
  const bubbler = useMemo(() => new THREE.CylinderGeometry(0.06, 0.2, 2.4, 10, 6, true), []);
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    water.uniforms.uT.value = stream.uniforms.uT.value = curtain.uniforms.uT.value = t;
    water.uniforms.uNight.value = stream.uniforms.uNight.value = curtain.uniforms.uNight.value = world.night;
    lights.emissiveIntensity = world.night * 3;
    rings.current?.children.forEach((r, i) => {
      const k = (t * 1.2 + i * 0.37) % 1;
      r.scale.setScalar(0.3 + k * 1.1);
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.6;
    });
  });
  return (
    <group>
      <Solid r={OUTER + 0.7} />
      {/* outer basin: water, a seat-height rim and a dark stone apron ring */}
      <mesh position={[0, 0.38, 0]} rotation-x={-Math.PI / 2} material={water}>
        <ringGeometry args={[MID + 0.3, OUTER, 96, 3]} />
      </mesh>
      <mesh position={[0, 0.28, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[OUTER + 0.55, OUTER + 0.7, 0.56, 96, 1, true]} />
      </mesh>
      <mesh position={[0, 0.27, 0]} material={stone} receiveShadow>
        <cylinderGeometry args={[OUTER, OUTER, 0.54, 96, 1, true]} />
      </mesh>
      <mesh position={[0, 0.56, 0]} rotation-x={-Math.PI / 2} material={stone} receiveShadow>
        <ringGeometry args={[OUTER, OUTER + 0.55, 96]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} material={stoneDark} receiveShadow>
        <ringGeometry args={[OUTER + 0.7, OUTER + 1.8, 96]} />
      </mesh>
      {/* underwater lights round the outer basin */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2 + 0.13;
        return (
          <mesh key={i} position={[Math.cos(a) * (OUTER - 0.3), 0.33, Math.sin(a) * (OUTER - 0.3)]} material={lights}>
            <sphereGeometry args={[0.12, 8, 6]} />
          </mesh>
        );
      })}
      {/* the raised middle pool on its drum, spilling over in a curtain */}
      <mesh position={[0, 0.7, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[MID + 0.3, MID + 0.45, 1.4, 72]} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation-x={-Math.PI / 2} material={water}>
        <ringGeometry args={[1.9, MID, 72, 2]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={curtain}>
        <cylinderGeometry args={[MID + 0.5, MID + 0.6, 1.0, 72, 1, true]} />
      </mesh>
      {/* the stone island the tower stands on */}
      <mesh position={[0, 1.0, 0]} material={stoneDark} castShadow>
        <cylinderGeometry args={[1.9, 2.1, 2, 36]} />
      </mesh>
      {jets.map((g, i) => (
        <mesh key={i} geometry={g} material={stream} />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 3.4, 2.6, Math.sin(a) * 3.4]} geometry={bubbler} material={stream} />;
      })}
      <group ref={rings}>
        {Array.from({ length: JETS }, (_, j) => {
          const a = (j / JETS) * Math.PI * 2;
          return (
            <mesh key={j} position={[Math.cos(a) * (MID - 0.5), 1.44, Math.sin(a) * (MID - 0.5)]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.22, 0.3, 20]} />
              <meshBasicMaterial color="#e6f8ff" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** A sector-shaped raised lawn bed between two boulevards. */
function bedGeometry(a: number) {
  const half = 0.2; // radians each side of the slot centre; leaves ~3.5 m walks along the spokes at r 12
  const shape = new THREE.Shape();
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = a - half + (2 * half * i) / N;
    const v = new THREE.Vector2(Math.cos(t) * BED_R1, Math.sin(t) * BED_R1);
    if (i === 0) shape.moveTo(v.x, v.y);
    else shape.lineTo(v.x, v.y);
  }
  for (let i = N; i >= 0; i--) {
    const t = a - half * 0.82 + (2 * half * 0.82 * i) / N;
    shape.lineTo(Math.cos(t) * BED_R0, Math.sin(t) * BED_R0);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.32, 0);
  return g;
}

function Gardens() {
  const lawn = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6fbf57", roughness: 1 }), []);
  const kerb = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e6dfd0", roughness: 0.8 }), []);
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3f9b4a", roughness: 0.85, flatShading: true }), []);
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5638", roughness: 1 }), []);
  const blooms = useMemo(() => ["#ff8fb1", "#ffd23f", "#9b7bff", "#ff6b5b", "#ffffff"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })), []);
  const glow = useNightGlow("#ffe3a1");
  const beds = useMemo(() => SLOTS.map((_, i) => bedGeometry(slotAngle(i))), []);
  const flowers = useMemo(() => {
    const r = rng(23);
    const out: { x: number; z: number; c: number; s: number }[] = [];
    SLOTS.forEach((_, i) => {
      const a = slotAngle(i);
      for (let k = 0; k < 40; k++) {
        const t = a + (r() - 0.5) * 0.3,
          d = BED_R0 + 0.8 + r() * (BED_R1 - BED_R0 - 1.4);
        if (Math.abs(d - (BED_R0 + BED_R1) / 2) < 1.6 && Math.abs(t - a) < 0.08) continue; // the tree
        out.push({ x: Math.cos(t) * d, z: Math.sin(t) * d, c: Math.floor(r() * blooms.length), s: 0.12 + r() * 0.1 });
      }
    });
    return out;
  }, [blooms.length]);
  return (
    <group>
      {beds.map((g, i) => (
        <group key={i}>
          <mesh geometry={g} material={kerb} castShadow receiveShadow />
          <mesh geometry={g} material={lawn} position={[0, 0.02, 0]} scale={[0.985, 1, 0.985]} receiveShadow />
        </group>
      ))}
      {/* a shade tree in every bed */}
      {SLOTS.map((_, i) => {
        const a = slotAngle(i),
          d = (BED_R0 + BED_R1) / 2 + 1;
        return (
          <group key={`t${i}`} position={[Math.cos(a) * d, 0.38, Math.sin(a) * d]}>
            <Solid r={0.6} />
            <mesh position={[0, 1.3, 0]} material={trunk} castShadow>
              <cylinderGeometry args={[0.16, 0.24, 2.6, 7]} />
            </mesh>
            <mesh position={[0, 3.4, 0]} material={leaf} castShadow>
              <icosahedronGeometry args={[1.7, 1]} />
            </mesh>
            <mesh position={[0.9, 2.9, 0.4]} material={leaf} castShadow>
              <icosahedronGeometry args={[1.1, 1]} />
            </mesh>
            <mesh position={[-0.8, 3.0, -0.5]} material={leaf} castShadow>
              <icosahedronGeometry args={[1.15, 1]} />
            </mesh>
          </group>
        );
      })}
      {flowers.map((f, i) => (
        <mesh key={`f${i}`} position={[f.x, 0.42 + f.s, f.z]} scale={[f.s, f.s * 1.5, f.s]} material={blooms[f.c]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {/* benches on the paved ring facing the fountain, a lamp at each end */}
      {SLOTS.map((_, i) => {
        const a = slotAngle(i);
        const d = BED_R0 - 1.1;
        return (
          <group key={`b${i}`} position={[Math.cos(a) * d, 0, Math.sin(a) * d]} rotation-y={Math.atan2(-Math.cos(a), -Math.sin(a))}>
            {[-1.2, 1.2].map((x) => (
              <group key={x} position={[x, 0, -0.1]}>
                <Bench length={1.8} />
              </group>
            ))}
            {[-2.6, 2.6].map((x) => (
              <group key={`l${x}`} position={[x, 0, -0.4]}>
                <LampPost glow={glow} />
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Seat positions on the plaza benches (world XZ and yaw), for the seated visitors in People.tsx. */
export function plazaSeat(slot: number, side: -1 | 1) {
  const a = slotAngle(slot);
  const d = BED_R0 - 1.1;
  const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
  // local (x, z) = (side * 1.2, -0.1) rotated by yaw
  const lx = side * 1.2,
    lz = -0.1;
  return { x: Math.cos(a) * d + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: Math.sin(a) * d - lx * Math.sin(yaw) + lz * Math.cos(yaw), yaw };
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
  const granite = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b3140", roughness: 0.5, metalness: 0.2 }), []);
  const plinth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9d4c7", roughness: 0.85 }), []);
  const traveller = useRef<THREE.Mesh>(null);
  const trail = useMemo(() => {
    const pts = MILESTONES.map((_, i) => new THREE.Vector3(Math.cos(slotAngle(i)) * (STELE_R - 1.4), 0.1, Math.sin(slotAngle(i)) * (STELE_R - 1.4)));
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const trailGeo = useMemo(() => new THREE.TubeGeometry(trail, 240, 0.06, 6, false), [trail]);
  const trailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#00d2ff", emissive: "#00d2ff", emissiveIntensity: 0.5 }), []);
  useFrame(({ clock }) => {
    const n = world.night;
    mats.forEach((q) => (q.emissiveIntensity = 0.15 + n * 0.9));
    glow.forEach((q) => (q.emissiveIntensity = 0.4 + n * 2.5));
    trailMat.emissiveIntensity = 0.4 + n * 2;
    // a light walks the path from school to Singapore, then starts again
    const u = (clock.elapsedTime * 0.03) % 1;
    traveller.current?.position.copy(trail.getPointAt(u)).setY(0.5 + Math.sin(clock.elapsedTime * 4) * 0.08);
  });
  return (
    <group>
      <mesh geometry={trailGeo} material={trailMat} />
      <mesh ref={traveller} material={trailMat}>
        <sphereGeometry args={[0.26, 16, 12]} />
      </mesh>
      {MILESTONES.map((m, i) => {
        const a = slotAngle(i);
        const x = Math.cos(a) * STELE_R,
          z = Math.sin(a) * STELE_R;
        return (
          // a granite stele standing in the front of each garden bed, readable from both sides
          <group key={m.title} position={[x, 0.36, z]} rotation-y={Math.atan2(-x, -z)}>
            <Solid w={2.9} d={0.7} />
            <mesh position={[0, 0.2, 0]} material={plinth} castShadow receiveShadow>
              <boxGeometry args={[2.9, 0.4, 0.7]} />
            </mesh>
            <mesh position={[0, 1.35, 0]} material={granite} castShadow>
              <boxGeometry args={[2.7, 1.9, 0.26]} />
            </mesh>
            {[0, 1].map((k) => (
              <mesh key={k} position={[0, 1.35, k ? -0.135 : 0.135]} rotation-y={k ? Math.PI : 0} material={mats[i]}>
                <planeGeometry args={[2.5, 1.56]} />
              </mesh>
            ))}
            <mesh position={[0, 2.34, 0]} material={glow[i]}>
              <boxGeometry args={[2.7, 0.08, 0.28]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Pairs of flags in each zone's colour at the head of every boulevard, and the tricolour by the HQ sign. */
function PlazaFlags() {
  return (
    <group>
      {ZONES.filter((z) => z.radius).map((z, i) => {
        const [x, zz] = zonePos(z);
        const a = Math.atan2(zz, x);
        const t = new THREE.Vector2(-Math.sin(a), Math.cos(a));
        return [-1, 1].map((s) => {
          const px = Math.cos(a) * (PLAZA_R - 0.8) + t.x * s * 3.6,
            pz = Math.sin(a) * (PLAZA_R - 0.8) + t.y * s * 3.6;
          return (
            <group key={`${z.id}${s}`} position={[px, 0, pz]} rotation-y={-a + Math.PI / 2}>
              <Flag kind={z.accent} height={5.2} width={1.5} phase={i * 0.7 + s} />
            </group>
          );
        });
      })}
      <group position={[-6.5, 0, PLAZA_R - 2.5]} rotation-y={0.4}>
        <Flag kind="india" height={10} width={3} />
      </group>
    </group>
  );
}

function Paving() {
  const map = useMemo(() => {
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    const r = rng(77);
    g.fillStyle = "#e7e0cf";
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = ["#ddd5c2", "#efe9db", "#d6cdb8"][i % 3];
      g.fillRect(r() * S, r() * S, 2, 2);
    }
    // herringbone-ish blocks
    g.strokeStyle = "#cbbfa6";
    g.lineWidth = 2;
    const b = S / 16;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        g.strokeRect(x * b + ((y % 2) * b) / 2, y * b, b, b / 2);
      }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(9, 9);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[PLAZA_R, 96]} />
      <meshStandardMaterial map={map} roughness={0.92} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

export function JourneyPlaza() {
  return (
    <group position={[0, heightAt(0, 0), 0]}>
      <Paving />
      <Fountain />
      <Gardens />
      <Milestones />
      <PlazaFlags />
    </group>
  );
}

/* ---------- Singapore across the water: the ArtScience lotus, the Merlion and Supertrees ---------- */
export function Singapore() {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f1ea", emissive: "#fff4d6", emissiveIntensity: 0.05, roughness: 0.7 }), []);
  // Gardens by the Bay Supertrees: a steel trunk flaring into a canopy ring, lit at night
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5d7a52", roughness: 0.8, flatShading: true }), []);
  const canopy = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5aa8", emissive: "#c06bff", emissiveIntensity: 0.05, roughness: 0.6, side: THREE.DoubleSide, flatShading: true }), []);
  const supertrees = useMemo(() => {
    const prof = [[1.1, 0], [0.9, 4], [0.7, 12], [0.9, 18], [2.6, 21.5], [4.6, 23], [4.8, 23.6]].map(([x, y]) => new THREE.Vector2(x, y));
    return { g: new THREE.LatheGeometry(prof, 10), list: [[-10, 0, 1], [-2, -6, 1.25], [7, 1, 0.9], [15, -7, 1.1], [-17, -9, 0.8], [3, -14, 0.85]] };
  }, []);
  const spout = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const n = world.night,
      t = clock.elapsedTime;
    stone.emissiveIntensity = 0.05 + n * 0.7;
    canopy.emissiveIntensity = 0.05 + n * 1.6;
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
    d = 200;
  return (
    <group position={[Math.cos(a) * d, 0, Math.sin(a) * d]} rotation-y={-a - Math.PI / 2}>
      {/* the bay front: grassy land raised above the water, with a sand edge facing the island */}
      <mesh position={[0, -0.4, -8]} receiveShadow>
        <boxGeometry args={[150, 2, 40]} />
        <meshStandardMaterial color="#8fa98a" roughness={1} />
      </mesh>
      <mesh position={[0, -0.65, 13.5]}>
        <boxGeometry args={[150, 2, 3]} />
        <meshStandardMaterial color="#e8d9ae" roughness={1} />
      </mesh>
      {/* Supertree grove */}
      <group position={[-4, 0, -8]}>
        {supertrees.list.map(([x, z, k], i) => (
          <group key={i} position={[x, 0.5, z]} scale={k}>
            <mesh geometry={supertrees.g} material={trunk} castShadow />
            <mesh position={[0, 23.3, 0]} rotation-x={-Math.PI / 2} material={canopy}>
              <ringGeometry args={[2.2, 4.8, 10]} />
            </mesh>
          </group>
        ))}
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

/* ---------- Singapore on the island: the Merlion on a quay at the end of the pier ---------- */
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

export function SingaporeCorner() {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f1ea", emissive: "#fff4d6", emissiveIntensity: 0.05, roughness: 0.7 }), []);
  useFrame(() => {
    stone.emissiveIntensity = 0.05 + world.night * 0.7;
  });
  const PIER = 95;
  const [qx, qz] = polarXZ(PIER, 105);
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
    </group>
  );
}
