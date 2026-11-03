"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildTerrain, heightAt, isFreeLand, rng } from "./terrain";
import { world } from "./store";

/* ---------------- Sky dome (day ↔ night) ---------------- */
export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uNight: { value: 0 } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vP; uniform float uNight;
          float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          void main(){
            float h = clamp(vP.y, -0.2, 1.0);
            vec3 dayTop = vec3(0.16,0.62,0.98), dayHor = vec3(0.80,0.95,1.0);
            vec3 nTop = vec3(0.01,0.02,0.07), nHor = vec3(0.07,0.10,0.25);
            vec3 day = mix(dayHor, dayTop, pow(max(h,0.0), 0.55));
            vec3 night = mix(nHor, nTop, pow(max(h,0.0), 0.5));
            vec3 col = mix(day, night, uNight);
            // stars
            float s = step(0.9975, hash(floor(vP*420.0))) * smoothstep(0.05, 0.4, h);
            col += vec3(s) * uNight;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  useFrame(() => {
    mat.uniforms.uNight.value = world.night;
  });
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  );
}

/* ---------------- Striped sea ---------------- */
export function Sea() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: false,
        fog: true,
        uniforms: {
          uTime: { value: 0 },
          uNight: { value: 0 },
          ...THREE.UniformsLib.fog,
        },
        vertexShader: `
          varying vec2 vXZ; varying float vD;
          #include <fog_pars_vertex>
          void main(){
            vec4 wp = modelMatrix * vec4(position,1.0);
            vXZ = wp.xz; vD = length(wp.xz);
            vec4 mvPosition = viewMatrix * wp;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform float uTime; uniform float uNight; varying vec2 vXZ; varying float vD;
          #include <fog_pars_fragment>
          void main(){
            vec3 shallow = vec3(0.35,0.85,0.92), deep = vec3(0.09,0.45,0.78);
            vec3 col = mix(shallow, deep, smoothstep(54.0, 110.0, vD));
            // concentric swell bands, like a toy ocean
            float band = sin(vD*1.25 - uTime*1.4 + sin(vXZ.x*0.05)*1.5);
            col += smoothstep(0.75, 1.0, band) * 0.10;
            // surf line
            col = mix(col, vec3(1.0), smoothstep(1.2, 0.0, abs(vD - 56.5 - sin(uTime*0.8 + vXZ.x*0.2)*0.6)) * 0.85);
            col = mix(col, col*vec3(0.12,0.16,0.35), uNight);
            gl_FragColor = vec4(col,1.0);
            #include <fog_fragment>
          }`,
      }),
    []
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uNight.value = world.night;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.35} material={mat}>
      <planeGeometry args={[800, 800, 1, 1]} />
    </mesh>
  );
}

export function Terrain() {
  const geo = useMemo(() => buildTerrain(), []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

/* ---------------- Trees: low-poly, instanced ---------------- */
export function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const pines = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(42);
    const out: { x: number; z: number; s: number; pine: boolean; hue: number }[] = [];
    let guard = 0;
    while (out.length < 340 && guard++ < 20000) {
      const a = r() * Math.PI * 2;
      const d = 9 + Math.sqrt(r()) * 44;
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d;
      if (!isFreeLand(x, z)) continue;
      out.push({ x, z, s: 0.7 + r() * 0.8, pine: r() < 0.38, hue: r() });
    }
    return out;
  }, []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    let ti = 0,
      ci = 0,
      pi = 0;
    data.forEach((t) => {
      const y = heightAt(t.x, t.z);
      m.compose(new THREE.Vector3(t.x, y + 0.7 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      trunks.current!.setMatrixAt(ti++, m);
      if (t.pine) {
        m.compose(new THREE.Vector3(t.x, y + 2.3 * t.s, t.z), q, new THREE.Vector3(t.s, t.s * 1.3, t.s));
        pines.current!.setMatrixAt(pi, m);
        pines.current!.setColorAt(pi++, c.setHSL(0.36 + t.hue * 0.05, 0.45, 0.28 + t.hue * 0.08));
      } else {
        m.compose(new THREE.Vector3(t.x, y + 2.1 * t.s, t.z), q, new THREE.Vector3(t.s * 1.1, t.s, t.s * 1.1));
        crowns.current!.setMatrixAt(ci, m);
        crowns.current!.setColorAt(ci++, c.setHSL(0.27 + t.hue * 0.08, 0.55, 0.38 + t.hue * 0.1));
      }
    });
    for (const im of [trunks.current!, crowns.current!, pines.current!]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    crowns.current!.count = ci;
    pines.current!.count = pi;
  }, [data]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, data.length]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.4, 6]} />
        <meshStandardMaterial color="#7a5638" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, data.length]} castShadow>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, undefined, data.length]} castShadow>
        <coneGeometry args={[0.9, 2.6, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

/* ---------------- Flower meadows (lavender + marigold) ---------------- */
export function Flowers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 2600;
  useEffect(() => {
    const r = rng(7);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const pal = ["#9b7bff", "#b69cff", "#ffd23f", "#ff8fb1", "#ffffff"];
    let i = 0,
      guard = 0;
    while (i < N && guard++ < 60000) {
      // clustered patches
      const pa = Math.floor(r() * 26);
      const pr = rng(pa * 97 + 3);
      const a = pr() * Math.PI * 2,
        d = 12 + pr() * 38;
      const x = Math.cos(a) * d + (r() - 0.5) * 7,
        z = Math.sin(a) * d + (r() - 0.5) * 7;
      if (!isFreeLand(x, z)) continue;
      const s = 0.12 + r() * 0.1;
      m.makeScale(s, s * 1.8, s).setPosition(x, heightAt(x, z) + s, z);
      ref.current!.setMatrixAt(i, m);
      ref.current!.setColorAt(i, c.set(pal[pa % 3 === 0 ? 2 + (pa % 3) : pa % 2]));
      i++;
    }
    ref.current!.count = i;
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

/* ---------------- Clouds ---------------- */
export function Clouds() {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.92 }), []);
  const puffs = useMemo(() => {
    const r = rng(19);
    return Array.from({ length: 14 }, () => {
      const a = r() * Math.PI * 2,
        d = 60 + r() * 120;
      return {
        p: [Math.cos(a) * d, 28 + r() * 20, Math.sin(a) * d] as [number, number, number],
        parts: Array.from({ length: 5 }, () => [(r() - 0.5) * 9, (r() - 0.5) * 2, (r() - 0.5) * 5, 2.5 + r() * 3] as number[]),
      };
    });
  }, []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.004;
    mat.opacity = 0.92 - world.night * 0.75;
  });
  return (
    <group ref={g}>
      {puffs.map((c, i) => (
        <group key={i} position={c.p}>
          {c.parts.map((q, j) => (
            <mesh key={j} position={[q[0], q[1], q[2]]} scale={[q[3] * 1.4, q[3] * 0.7, q[3]]} material={mat}>
              <sphereGeometry args={[1, 12, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ---------------- Lights, synced to day/night ---------------- */
export function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const moonCol = useMemo(() => new THREE.Color("#7f96ff"), []);
  const sunCol = useMemo(() => new THREE.Color("#fff3e0"), []);
  useFrame(({ scene }) => {
    const n = world.night;
    if (sun.current) {
      sun.current.intensity = 2.6 * (1 - n) + 0.35 * n;
      sun.current.color.copy(sunCol).lerp(moonCol, n);
    }
    if (hemi.current) hemi.current.intensity = 1.25 * (1 - n) + 0.25 * n;
    if (scene.fog) (scene.fog as THREE.Fog).color.setRGB(0.8 - 0.74 * n, 0.93 - 0.84 * n, 1 - 0.78 * n);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#dff4ff", "#6a8f4e", 1.25]} />
      <directionalLight
        ref={sun}
        position={[40, 60, 25]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[3072, 3072]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}

/* ---------------- distant mountains on the horizon ---------------- */
export function Mountains() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a9cbe0", roughness: 1, flatShading: true }), []);
  const day = useMemo(() => new THREE.Color("#a9cbe0"), []);
  const night = useMemo(() => new THREE.Color("#141a33"), []);
  useFrame(() => {
    mat.color.copy(day).lerp(night, world.night);
  });
  const peaks = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + r() * 0.15;
      const d = 210 + r() * 60;
      const h = 30 + r() * 45;
      return { p: [Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d] as [number, number, number], h, w: 28 + r() * 30 };
    });
  }, []);
  return (
    <group>
      {peaks.map((q, i) => (
        <mesh key={i} position={q.p} material={mat}>
          <coneGeometry args={[q.w, q.h, 5]} />
        </mesh>
      ))}
    </group>
  );
}
