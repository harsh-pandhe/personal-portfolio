"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildTerrain, heightAt, isFreeLand, rng } from "./terrain";
import { getUI, world } from "./store";

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
    <mesh
      geometry={geo}
      receiveShadow
      onClick={(e) => {
        // click the ground to walk there
        if (getUI().mode !== "explore" || getUI().open || world.dragging) return;
        e.stopPropagation();
        world.target = { x: e.point.x, z: e.point.z };
      }}
    >
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
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.92, flatShading: true }), []);
  const parts = useMemo(() => {
    const r = rng(19);
    const out: number[][] = [];
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2,
        d = 70 + r() * 120;
      const cx = Math.cos(a) * d,
        cy = 30 + r() * 22,
        cz = Math.sin(a) * d;
      for (let j = 0; j < 6; j++) out.push([cx + (r() - 0.5) * 11, cy + (r() - 0.5) * 2.2, cz + (r() - 0.5) * 6, 2.4 + r() * 3.4]);
    }
    return out;
  }, []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    parts.forEach((q, i) => {
      m.makeScale(q[3] * 1.45, q[3] * 0.72, q[3]).setPosition(q[0], q[1], q[2]);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [parts]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
    mat.opacity = 0.92 - world.night * 0.75;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, parts.length]} material={mat} frustumCulled={false}>
      <icosahedronGeometry args={[1, 2]} />
    </instancedMesh>
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
        shadow-mapSize={[2048, 2048]}
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

/* ---------------- distant mountain ranges: three layers, low enough to keep the sky clear ---------------- */
export function Mountains() {
  const layers = useMemo(
    () => [
      { d: 205, h: [10, 20], day: "#9cc7dc", night: "#1a2244", n: 30, seed: 77 },
      { d: 250, h: [16, 30], day: "#b4d4e6", night: "#141b38", n: 26, seed: 78 },
      { d: 300, h: [22, 40], day: "#c9e1ee", night: "#10162e", n: 22, seed: 79 },
    ],
    []
  );
  const mats = useMemo(
    () => layers.map((l) => ({ m: new THREE.MeshStandardMaterial({ color: l.day, roughness: 1, flatShading: true }), day: new THREE.Color(l.day), night: new THREE.Color(l.night) })),
    [layers]
  );
  const snow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }), []);
  const snowNight = useMemo(() => new THREE.Color("#3a4470"), []);
  const white = useMemo(() => new THREE.Color("#ffffff"), []);
  useFrame(() => {
    mats.forEach((q) => q.m.color.copy(q.day).lerp(q.night, world.night));
    snow.color.copy(white).lerp(snowNight, world.night);
  });
  const peaks = useMemo(
    () =>
      layers.flatMap((l, li) => {
        const r = rng(l.seed);
        return Array.from({ length: l.n }, (_, i) => {
          const a = (i / l.n) * Math.PI * 2 + r() * 0.12 + li * 0.07;
          const d = l.d + r() * 25;
          const h = l.h[0] + r() * (l.h[1] - l.h[0]);
          const w = h * (1.4 + r() * 0.8);
          return { li, x: Math.cos(a) * d, z: Math.sin(a) * d, h, w, rot: r() * Math.PI };
        });
      }),
    [layers]
  );
  return (
    <group>
      {peaks.map((q, i) => (
        <group key={i} position={[q.x, -3, q.z]} rotation-y={q.rot}>
          <mesh position={[0, q.h / 2, 0]} material={mats[q.li].m}>
            <coneGeometry args={[q.w, q.h, 6]} />
          </mesh>
          {q.h > 24 && (
            <mesh position={[0, q.h * 0.86, 0]} material={snow}>
              <coneGeometry args={[q.w * 0.295, q.h * 0.28, 6]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ---------------- wind-blown grass (instanced blades, sway in the vertex shader) ---------------- */
export function Grass({ count = 38000 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.09, 0.55, 1, 3);
    g.translate(0, 0.275, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const base = new THREE.Color("#3f8a35"),
      tip = new THREE.Color("#b5e27a");
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 0.55;
      pos.setX(i, pos.getX(i) * (1 - t * 0.85)); // taper to a point
      const c = base.clone().lerp(tip, t);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const uTime = { value: 0 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float h = position.y / 0.55;
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float w = sin(uTime * 1.8 + ip.x * 0.35 + ip.z * 0.22) + 0.5 * sin(uTime * 3.1 + ip.x * 0.9);
        transformed.x += w * 0.09 * h * h;
        transformed.z += w * 0.05 * h * h;`
      );
    };
    m.userData.uTime = uTime;
    return { geo: g, mat: m };
  }, []);
  useEffect(() => {
    const r = rng(101);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    let i = 0,
      guard = 0;
    while (i < count && guard++ < count * 6) {
      const a = r() * Math.PI * 2,
        d = 8 + Math.sqrt(r()) * 46;
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d;
      if (!isFreeLand(x, z)) continue;
      q.setFromEuler(e.set(0, r() * Math.PI, 0));
      const k = 0.7 + r() * 0.9;
      s.set(k, k * (0.8 + r() * 0.6), k);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.02, z), q, s);
      ref.current!.setMatrixAt(i++, m);
    }
    ref.current!.count = i;
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count]);
  useFrame(({ clock }) => {
    mat.userData.uTime.value = clock.elapsedTime;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

/* ---------------- lighthouse, pier and sailboats on the shore ---------------- */
export function Shore() {
  const beam = useRef<THREE.Group>(null);
  const boats = useRef<THREE.Group>(null);
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff2c4", emissive: "#ffe08a", emissiveIntensity: 0.4 }), []);
  const beamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#fff3c2", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    []
  );
  // lighthouse on the north-west point, pier on the south shore
  const LH = useMemo(() => {
    const a = (205 * Math.PI) / 180;
    const x = Math.cos(a) * 53,
      z = Math.sin(a) * 53;
    return [x, heightAt(x, z), z] as const;
  }, []);
  const PIER = useMemo(() => {
    const a = (95 * Math.PI) / 180;
    return { a, x: Math.cos(a) * 50, z: Math.sin(a) * 50 };
  }, []);
  useFrame(({ clock }, dt) => {
    const n = world.night;
    lampMat.emissiveIntensity = 0.4 + n * 3;
    beamMat.opacity = n * 0.22;
    if (beam.current) beam.current.rotation.y += dt * 0.8;
    const t = clock.elapsedTime;
    boats.current?.children.forEach((b, i) => {
      const a = t * (0.025 + i * 0.008) * (i % 2 ? -1 : 1) + i * 2.1;
      const r = 66 + i * 9;
      b.position.set(Math.cos(a) * r, -0.25 + Math.sin(t * 1.2 + i) * 0.12, Math.sin(a) * r);
      b.rotation.y = -a + (i % 2 ? 0 : Math.PI);
      b.rotation.z = Math.sin(t * 1.1 + i) * 0.06;
    });
  });
  const stripe = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e5322d", roughness: 0.5 }), []);
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f7f8fa", roughness: 0.5 }), []);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9c6b43", roughness: 0.9 }), []);
  const sail = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, side: THREE.DoubleSide }), []);
  return (
    <group>
      <group position={[LH[0], LH[1], LH[2]]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0.9 + i * 1.8, 0]} material={i % 2 ? stripe : white} castShadow>
            <cylinderGeometry args={[1.25 - (i + 1) * 0.09, 1.25 - i * 0.09, 1.8, 20]} />
          </mesh>
        ))}
        <mesh position={[0, 9.4, 0]} material={white}>
          <cylinderGeometry args={[1.05, 1.05, 0.25, 20]} />
        </mesh>
        <mesh position={[0, 10.1, 0]} material={lampMat}>
          <cylinderGeometry args={[0.55, 0.55, 1.1, 16]} />
        </mesh>
        <mesh position={[0, 11.0, 0]} material={stripe} castShadow>
          <coneGeometry args={[0.8, 0.9, 16]} />
        </mesh>
        <group ref={beam} position={[0, 10.1, 0]}>
          {[0, Math.PI].map((r) => (
            <mesh key={r} rotation={[0, r, Math.PI / 2]} position={[Math.cos(r) * 9, 0, -Math.sin(r) * 9]} material={beamMat}>
              <coneGeometry args={[2.2, 18, 20, 1, true]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* pier */}
      <group position={[PIER.x, 0, PIER.z]} rotation-y={-PIER.a + Math.PI / 2}>
        <mesh position={[0, 0.35, 5]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.18, 12]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[i % 2 ? 1.05 : -1.05, -0.3, 0.5 + Math.floor(i / 2) * 4.6]} material={wood}>
            <cylinderGeometry args={[0.12, 0.12, 1.6, 6]} />
          </mesh>
        ))}
      </group>
      {/* sailboats circling the island */}
      <group ref={boats}>
        {[0, 1, 2].map((i) => (
          <group key={i}>
            <mesh position={[0, 0.2, 0]} material={white} castShadow>
              <boxGeometry args={[1.0, 0.45, 2.8]} />
            </mesh>
            <mesh position={[0, 0.5, 0]} material={i === 1 ? stripe : wood}>
              <boxGeometry args={[1.02, 0.1, 2.82]} />
            </mesh>
            <mesh position={[0, 2, 0]} material={wood}>
              <cylinderGeometry args={[0.05, 0.05, 3.2, 6]} />
            </mesh>
            <mesh position={[0, 2.0, 0.55]} rotation-y={Math.PI / 2} material={sail}>
              <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(0, -1.2), new THREE.Vector2(0, 1.4), new THREE.Vector2(1.3, -1.2)])]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ---------------- birds: little flocks wheeling over the island ---------------- */
export function Birds() {
  const g = useRef<THREE.Group>(null);
  const wingMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2b2f36", side: THREE.DoubleSide }), []);
  const flock = useMemo(() => {
    const r = rng(55);
    return Array.from({ length: 14 }, (_, i) => ({ f: Math.floor(i / 5), dx: (r() - 0.5) * 5, dy: (r() - 0.5) * 1.5, dz: (r() - 0.5) * 5, ph: r() * 6 }));
  }, []);
  const wingGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0.18, 0, 0, -0.18, 0.75, 0, 0]), 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((b, i) => {
      const q = flock[i];
      const a = t * (0.07 + q.f * 0.02) + q.f * 2.2;
      const R = 30 + q.f * 12;
      b.position.set(Math.cos(a) * R + q.dx, 22 + q.f * 4 + q.dy + Math.sin(t + q.ph) * 0.6, Math.sin(a) * R + q.dz);
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + q.ph) * 0.7;
      (b.children[0] as THREE.Mesh).rotation.z = flap;
      (b.children[1] as THREE.Mesh).rotation.z = -flap;
    });
  });
  return (
    <group ref={g}>
      {flock.map((_, i) => (
        <group key={i} scale={0.9}>
          <mesh geometry={wingGeo} material={wingMat} />
          <mesh geometry={wingGeo} material={wingMat} scale={[-1, 1, 1]} />
        </group>
      ))}
    </group>
  );
}
