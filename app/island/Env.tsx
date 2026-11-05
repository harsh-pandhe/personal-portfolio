"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildTerrain, heightAt, isFreeLand, LIGHTHOUSE, rng } from "./terrain";
import { getUI, world } from "./store";

/* ---------------- Sky dome (day ↔ night) ---------------- */
export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uNight: { value: 0 }, uGrey: { value: 0 }, uFlash: { value: 0 } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vP; uniform float uNight; uniform float uGrey; uniform float uFlash;
          float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          void main(){
            float h = clamp(vP.y, -0.2, 1.0);
            vec3 dayTop = vec3(0.16,0.62,0.98), dayHor = vec3(0.80,0.95,1.0);
            vec3 nTop = vec3(0.01,0.02,0.07), nHor = vec3(0.07,0.10,0.25);
            vec3 day = mix(dayHor, dayTop, pow(max(h,0.0), 0.55));
            // overcast / monsoon: wash the blue towards a heavy grey
            day = mix(day, mix(vec3(0.74,0.79,0.84), vec3(0.47,0.53,0.6), pow(max(h,0.0),0.6)), uGrey);
            vec3 night = mix(nHor, nTop, pow(max(h,0.0), 0.5));
            vec3 col = mix(day, night, uNight);
            // stars
            float s = step(0.9975, hash(floor(vP*420.0))) * smoothstep(0.05, 0.4, h);
            col += vec3(s) * uNight * (1.0 - uGrey);
            col += vec3(0.75,0.8,1.0) * uFlash;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  useFrame(({ scene }) => {
    mat.uniforms.uNight.value = world.night;
    mat.uniforms.uGrey.value = Math.min(1, world.rain * 0.85 + Math.max(0, world.cloud - 0.5) * 0.5);
    mat.uniforms.uFlash.value = (scene.userData.flash as number) || 0;
  });
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
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
            vec3 col = mix(shallow, deep, smoothstep(96.0, 175.0, vD));
            // concentric swell bands, like a toy ocean
            float band = sin(vD*1.25 - uTime*1.4 + sin(vXZ.x*0.05)*1.5);
            col += smoothstep(0.75, 1.0, band) * 0.10;
            // surf line
            col = mix(col, vec3(1.0), smoothstep(1.2, 0.0, abs(vD - 98.5 - sin(uTime*0.8 + vXZ.x*0.2)*0.6)) * 0.85);
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
      <planeGeometry args={[1000, 1000, 1, 1]} />
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
    while (out.length < 720 && guard++ < 40000) {
      const a = r() * Math.PI * 2;
      const d = 20 + Math.sqrt(r()) * 76;
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
      <instancedMesh ref={trunks} args={[undefined, undefined, data.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.18, 1.4, 6]} />
        <meshStandardMaterial color="#7a5638" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, data.length]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, undefined, data.length]} castShadow frustumCulled={false}>
        <coneGeometry args={[0.9, 2.6, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

/* ---------------- Flower meadows (lavender + marigold) ---------------- */
export function Flowers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 4200;
  useEffect(() => {
    const r = rng(7);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const pal = ["#9b7bff", "#b69cff", "#ffd23f", "#ff8fb1", "#ffffff"];
    let i = 0,
      guard = 0;
    while (i < N && guard++ < 60000) {
      // clustered patches
      const pa = Math.floor(r() * 44);
      const pr = rng(pa * 97 + 3);
      const a = pr() * Math.PI * 2,
        d = 22 + pr() * 68;
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
        d = 110 + r() * 150;
      const cx = Math.cos(a) * d,
        cy = 36 + r() * 26,
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
    mat.opacity = 0.92 - world.night * 0.9;
    mat.color.setScalar(1 - world.rain * 0.45);
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
    const dim = 1 - world.rain * 0.55 - Math.max(0, world.cloud - 0.5) * 0.3;
    const flash = (scene.userData.flash as number) || 0;
    if (sun.current) {
      sun.current.intensity = (2.6 * (1 - n) + 0.35 * n) * dim + flash * 2;
      sun.current.color.copy(sunCol).lerp(moonCol, n);
    }
    if (hemi.current) hemi.current.intensity = (1.25 * (1 - n) + 0.25 * n) * (0.75 + dim * 0.25) + flash * 1.5;
    if (scene.fog) {
      const f = scene.fog as THREE.Fog;
      const g = world.rain;
      f.color.setRGB(0.8 - 0.74 * n - 0.12 * g * (1 - n), 0.93 - 0.84 * n - 0.16 * g * (1 - n), 1 - 0.78 * n - 0.2 * g * (1 - n));
      f.near = 150 - g * 90;
      f.far = 430 - g * 220;
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#dff4ff", "#6a8f4e", 1.25]} />
      <directionalLight
        ref={sun}
        position={[55, 85, 35]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-112}
        shadow-camera-right={112}
        shadow-camera-top={112}
        shadow-camera-bottom={-112}
        shadow-camera-far={280}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}

/* ---------------- distant mountain ranges: noise ridgelines with depth, haze and snow ---------------- */
function rangeGeometry(d: number, depth: number, H: number, seed: number) {
  const r = rng(seed);
  // periodic ridged noise along the ring: integer harmonics so it closes seamlessly
  const waves = Array.from({ length: 9 }, (_, i) => ({ k: [3, 5, 7, 11, 17, 23, 31, 43, 61][i], a: 1 / (1 + i * 0.9), p: r() * Math.PI * 2 }));
  const ridge = (t: number, off: number) => {
    let v = 0,
      n = 0;
    for (const w of waves) {
      v += w.a * (1 - Math.abs(Math.sin(w.k * t + w.p + off * w.k * 0.02)));
      n += w.a;
    }
    return Math.pow(v / n, 2.2);
  };
  const C = 720,
    R = 7;
  const pos: number[] = [],
    col: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= C; i++) {
    const t = (i / C) * Math.PI * 2;
    for (let j = 0; j < R; j++) {
      const u = j / (R - 1);
      const rad = d - depth / 2 + u * depth;
      const prof = Math.pow(Math.sin(Math.PI * Math.min(Math.max(u * 1.1 - 0.05, 0), 1)), 1.3);
      const h = j === 0 || j === R - 1 ? -6 : H * ridge(t, j) * prof - 4;
      pos.push(Math.cos(t) * rad, h, Math.sin(t) * rad);
      const snow = h > H * 0.5 ? 1 : 0.5 + (h / H) * 0.35;
      col.push(snow, snow, snow);
    }
  }
  for (let i = 0; i < C; i++)
    for (let j = 0; j < R - 1; j++) {
      const a = i * R + j,
        b = (i + 1) * R + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Mountains() {
  const layers = useMemo(
    () => [
      { d: 255, depth: 44, H: 28, day: "#8fbad0", night: "#1a2244", seed: 77 },
      { d: 310, depth: 54, H: 44, day: "#a9cbe0", night: "#141b38", seed: 78 },
      { d: 370, depth: 64, H: 62, day: "#c4dcea", night: "#10162e", seed: 79 },
    ],
    []
  );
  const items = useMemo(
    () =>
      layers.map((l) => ({
        g: rangeGeometry(l.d, l.depth, l.H, l.seed),
        m: new THREE.MeshStandardMaterial({ color: l.day, vertexColors: true, roughness: 1, flatShading: true }),
        day: new THREE.Color(l.day),
        night: new THREE.Color(l.night),
      })),
    [layers]
  );
  useFrame(() => items.forEach((q) => q.m.color.copy(q.day).lerp(q.night, world.night)));
  return (
    <group>
      {items.map((q, i) => (
        <mesh key={i} geometry={q.g} material={q.m} rotation-y={i * 0.7} />
      ))}
    </group>
  );
}

/* ---------------- wind-blown grass (instanced blades, sway in the vertex shader) ---------------- */
export function Grass({ count = 56000 }: { count?: number }) {
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
        d = 20 + Math.sqrt(r()) * 76;
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
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff2c4", emissive: "#ffe08a", emissiveIntensity: 0.4 }), []);
  // open cone, 140 m long: alpha falls off along its length and toward its edges (cheap volumetric look)
  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.35, 9, 140, 32, 24, true), []);
  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#fff1c4") } },
        vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
          void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
          void main(){ float along = pow(vY, 1.6); float rim = pow(abs(dot(vN, vV)), 1.5);
            gl_FragColor = vec4(uColor, uOpacity * along * rim); }`,
      }),
    []
  );
  // lighthouse on the north-west point, pier on the south shore
  const LH = useMemo(() => [LIGHTHOUSE[0], heightAt(...LIGHTHOUSE), LIGHTHOUSE[1]] as const, []);
  const PIER = useMemo(() => {
    const a = (95 * Math.PI) / 180;
    return { a, x: Math.cos(a) * 91, z: Math.sin(a) * 91 };
  }, []);
  useFrame((_, dt) => {
    const n = world.night;
    lampMat.emissiveIntensity = 0.4 + n * 3;
    beamMat.uniforms.uOpacity.value = n * 0.5;
    if (beam.current) beam.current.rotation.y += dt * 0.8;
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
            // a long beam tilted a few degrees down so it grazes the sea far out, fading along its length
            <group key={r} rotation-y={r}>
              <mesh rotation={[0, 0, Math.PI / 2 - 0.07]} position={[70, -4.9, 0]} geometry={beamGeo} material={beamMat} />
            </group>
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
    </group>
  );
}

/* ---------------- shipping lanes: cargo ships, ferries and more sailboats, lit at night ---------------- */
const NAV_GEO = new THREE.SphereGeometry(0.2, 8, 6);
type Lane = { kind: "cargo" | "ferry" | "sail"; ang: number; off: number; len: number; speed: number; phase: number; tint: string };
const LANES: Lane[] = [
  { kind: "cargo", ang: 3.5, off: 163, len: 560, speed: 3.2, phase: 0, tint: "#c2382f" }, // west, clear of both far shores
  { kind: "cargo", ang: 3.5, off: 182, len: 560, speed: -2.6, phase: 0.55, tint: "#1f4fa8" },
  { kind: "cargo", ang: 2.1, off: 147, len: 600, speed: 2.4, phase: 0.2, tint: "#2c7a4b" }, // inside Singapore's bay, never through it
  { kind: "ferry", ang: 1.75, off: 136, len: 340, speed: 4.6, phase: 0.1, tint: "#ffffff" },
  { kind: "ferry", ang: 3.9, off: 150, len: 340, speed: -4.0, phase: 0.6, tint: "#ffffff" },
  { kind: "sail", ang: 0.9, off: 122, len: 210, speed: 1.6, phase: 0.3, tint: "#ff5a6e" },
  { kind: "sail", ang: 1.7, off: 131, len: 210, speed: -1.4, phase: 0.7, tint: "#ffd23f" },
  { kind: "sail", ang: 2.5, off: 117, len: 210, speed: 1.2, phase: 0.45, tint: "#12f0c0" },
  { kind: "sail", ang: 3.8, off: 125, len: 210, speed: -1.7, phase: 0.15, tint: "#2d5bff" },
  { kind: "sail", ang: 4.6, off: 136, len: 210, speed: 1.5, phase: 0.85, tint: "#ff8a3d" },
];

function Ship({ kind, tint, nav }: { kind: Lane["kind"]; tint: string; nav: { red: THREE.Material; green: THREE.Material; white: THREE.Material; win: THREE.Material } }) {
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 }), [tint]);
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e9ecef", roughness: 0.7 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#23282f", roughness: 0.7 }), []);
  const boxes = useMemo(() => ["#d9822b", "#2d6cdf", "#c93c3c", "#3aa66b", "#e4c440", "#7a52c7"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })), []);
  if (kind === "cargo")
    return (
      <group>
        <mesh position={[0, 0.6, 0]} material={dark} castShadow>
          <boxGeometry args={[5.2, 2.2, 26]} />
        </mesh>
        <mesh position={[0, 1.4, 12.6]} rotation-y={Math.PI / 4} material={dark}>
          <boxGeometry args={[3.6, 2.2, 3.6]} />
        </mesh>
        <mesh position={[0, 1.75, 0]} material={hull}>
          <boxGeometry args={[5.3, 0.25, 26.1]} />
        </mesh>
        {/* container stacks */}
        {Array.from({ length: 18 }, (_, i) => (
          <mesh key={i} position={[(i % 3) * 1.55 - 1.55, 2.6 + (i % 2) * 0.9, 6 - Math.floor(i / 3) * 2.3]} material={boxes[(i * 5) % boxes.length]} castShadow>
            <boxGeometry args={[1.45, 0.85, 2.15]} />
          </mesh>
        ))}
        {/* bridge at the stern */}
        <mesh position={[0, 4, -10.5]} material={deck} castShadow>
          <boxGeometry args={[4.6, 4.2, 3.2]} />
        </mesh>
        <mesh position={[0, 5.2, -9.0]} material={nav.win}>
          <boxGeometry args={[4.4, 0.6, 0.05]} />
        </mesh>
        <mesh position={[0, 7, -11]} material={hull}>
          <cylinderGeometry args={[0.45, 0.55, 2, 10]} />
        </mesh>
        <mesh position={[2.7, 2, 9]} material={nav.green} geometry={NAV_GEO} />
        <mesh position={[-2.7, 2, 9]} material={nav.red} geometry={NAV_GEO} />
        <mesh position={[0, 8.3, -11]} material={nav.white}>
          <sphereGeometry args={[0.22, 8, 6]} />
        </mesh>
      </group>
    );
  if (kind === "ferry")
    return (
      <group>
        <mesh position={[0, 0.5, 0]} material={deck} castShadow>
          <boxGeometry args={[4, 1.6, 15]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={hull}>
          <boxGeometry args={[4.05, 0.4, 15.05]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={dark}>
          <boxGeometry args={[4.06, 0.15, 15.06]} />
        </mesh>
        <mesh position={[0, 2.1, -0.8]} material={deck} castShadow>
          <boxGeometry args={[3.6, 1.6, 10]} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 1.82, 2.2, -0.8]} material={nav.win}>
            <boxGeometry args={[0.04, 0.55, 9.4]} />
          </mesh>
        ))}
        <mesh position={[0, 3.4, 1.5]} material={deck}>
          <boxGeometry args={[2.6, 1, 2.6]} />
        </mesh>
        <mesh position={[0, 4.2, -2.5]} material={dark}>
          <cylinderGeometry args={[0.35, 0.4, 1.4, 10]} />
        </mesh>
        <mesh position={[2, 1.4, 7]} material={nav.green} geometry={NAV_GEO} />
        <mesh position={[-2, 1.4, 7]} material={nav.red} geometry={NAV_GEO} />
      </group>
    );
  return (
    <group scale={1.3}>
      <mesh position={[0, 0.2, 0]} material={deck} castShadow>
        <boxGeometry args={[1.0, 0.45, 2.8]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={hull}>
        <boxGeometry args={[1.02, 0.08, 2.82]} />
      </mesh>
      <mesh position={[0, 2, 0]} material={dark}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 6]} />
      </mesh>
      <mesh position={[0, 2.0, 0.55]} rotation-y={Math.PI / 2} material={deck}>
        <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(0, -1.2), new THREE.Vector2(0, 1.4), new THREE.Vector2(1.3, -1.2)])]} />
      </mesh>
      <mesh position={[0, 3.65, 0]} material={nav.white}>
        <sphereGeometry args={[0.08, 6, 4]} />
      </mesh>
    </group>
  );
}

export function Ships() {
  const g = useRef<THREE.Group>(null);
  const nav = useMemo(() => {
    const lamp = (c: string) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 });
    return { red: lamp("#ff2d2d"), green: lamp("#2dff6a"), white: lamp("#fff6d8"), win: lamp("#ffd27a") };
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const n = world.night;
    nav.red.emissiveIntensity = nav.green.emissiveIntensity = 0.3 + n * 4;
    nav.white.emissiveIntensity = 0.3 + n * 3;
    (nav.win as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + n * 2.2;
    g.current?.children.forEach((s, i) => {
      const L = LANES[i];
      // each lane is a straight line tangent to the island at distance `off`; ships wrap when they leave it
      const u = ((((t * L.speed) / L.len + L.phase) % 1) + 1) % 1 - 0.5;
      const dx = -Math.sin(L.ang),
        dz = Math.cos(L.ang);
      const along = u * L.len;
      s.position.set(Math.cos(L.ang) * L.off + dx * along, -0.3 + Math.sin(t * 0.9 + i) * 0.08, Math.sin(L.ang) * L.off + dz * along);
      s.rotation.y = Math.atan2(dx * Math.sign(L.speed), dz * Math.sign(L.speed));
      s.rotation.z = Math.sin(t * 0.8 + i) * (L.kind === "sail" ? 0.06 : 0.015);
    });
  });
  return (
    <group ref={g}>
      {LANES.map((l, i) => (
        <group key={i}>
          <Ship kind={l.kind} tint={l.tint} nav={nav} />
        </group>
      ))}
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
      const R = 42 + q.f * 16;
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
