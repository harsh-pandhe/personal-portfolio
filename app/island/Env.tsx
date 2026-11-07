"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildTerrain, freeFast, heightAt, heightFast, isFreeLand, ISLAND_EDGE, LIGHTHOUSE, onBeach, rng, roadMask } from "./terrain";
import { getUI, world } from "./store";
import { addCollider } from "./colliders";
import { DEVICE } from "./device";
import { GALA_CAM } from "./Show";
import { bakeStatic, Solid } from "./Props";

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
  const geo = useMemo(() => buildTerrain(DEVICE.low ? 230 : undefined), []);
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

/* ---------------- Trees: four species modelled in Blender (public/models/trees.glb), instanced ---------------- */
const TREES_GLB = "/models/trees.glb";
useGLTF.preload(TREES_GLB);
const SPECIES = ["Oak", "Pine", "Cypress", "Palm"] as const;
type TreeSpot = { x: number; z: number; s: number; sp: number; hue: number; yaw: number };
/** Where the trees stand (deterministic; colliders.ts-style solids are added from the same list). */
export function treeSpots(): TreeSpot[] {
  const r = rng(42);
  const out: TreeSpot[] = [];
  let guard = 0;
  while (out.length < 720 && guard++ < 40000) {
    const a = r() * Math.PI * 2;
    const d = 20 + Math.sqrt(r()) * 76;
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (!isFreeLand(x, z)) continue;
    // palms toward the coast, pines and cypresses on the hills, broadleaf everywhere else
    const k = r();
    const h = heightAt(x, z);
    const sp = d > 80 && k < 0.45 ? 3 : h > 5 && k < 0.55 ? 1 : k < 0.18 ? 2 : k < 0.42 ? 1 : 0;
    out.push({ x, z, s: 0.75 + r() * 0.7, sp, hue: r(), yaw: r() * Math.PI * 2 });
  }
  return out;
}
const CROWN_HSL: [number, number, number][] = [
  [0.27, 0.5, 0.4], // oak
  [0.38, 0.42, 0.3], // pine
  [0.33, 0.45, 0.33], // cypress
  [0.28, 0.55, 0.42], // palm
];

function TreeSpecies({ sp, list, gltf }: { sp: number; list: TreeSpot[]; gltf: { scene: THREE.Group } }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const get = (n: string) => {
      const m = gltf.scene.getObjectByName(n) as THREE.Mesh;
      return m.geometry.clone().applyMatrix4(m.matrixWorld);
    };
    return { trunk: get(`${SPECIES[sp]}_Trunk`), crown: get(`${SPECIES[sp]}_Crown`) };
  }, [gltf, sp]);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const [hh, ss, ll] = CROWN_HSL[sp];
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.yaw);
      m.compose(new THREE.Vector3(t.x, heightAt(t.x, t.z) - 0.05, t.z), q, new THREE.Vector3(t.s, t.s * (0.9 + t.hue * 0.25), t.s));
      trunk.current!.setMatrixAt(i, m);
      crown.current!.setMatrixAt(i, m);
      crown.current!.setColorAt(i, c.setHSL(hh + (t.hue - 0.5) * 0.06, ss, ll + (t.hue - 0.5) * 0.1));
    });
    for (const im of [trunk.current!, crown.current!]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }, [list, sp]);
  return (
    <group>
      <instancedMesh ref={trunk} args={[geos.trunk, undefined, list.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#7a5638" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={crown} args={[geos.crown, undefined, list.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} flatShading side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

export function Trees() {
  const gltf = useGLTF(TREES_GLB);
  const data = useMemo(treeSpots, []);
  // trunks are solid
  useEffect(() => {
    const off = data.map((t) => addCollider({ kind: "circle", x: t.x, z: t.z, r: 0.3 * t.s + 0.1 }));
    return () => off.forEach((f) => f());
  }, [data]);
  const bySp = useMemo(() => SPECIES.map((_, i) => data.filter((t) => t.sp === i)), [data]);
  return (
    <group>
      {bySp.map((list, i) => (list.length ? <TreeSpecies key={i} sp={i} list={list} gltf={gltf} /> : null))}
    </group>
  );
}

/* ---------------- Bushes, shrubs and rocks (public/models/nature.glb, from a CC-BY Sketchfab pack), instanced ---------------- */
const NATURE_GLB = "/models/nature.glb";
type Spot = { x: number; y: number; z: number; s: number; yaw: number; hue: number };
/** Hedges along the road verges, shrubs in the open, boulders on the hills and along the waterline. */
function natureSpots() {
  const r = rng(77);
  const bush: Spot[] = [],
    shrub: Spot[] = [],
    rock: Spot[] = [];
  const at = (x: number, z: number, s: number, lift = 0): Spot => ({ x, y: heightFast(x, z) - lift, z, s, yaw: r() * Math.PI * 2, hue: r() });
  let guard = 0;
  while ((bush.length < 300 || shrub.length < 140 || rock.length < 150) && guard++ < 60000) {
    const a = r() * Math.PI * 2,
      d = 20 + Math.sqrt(r()) * 74;
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (!freeFast(x, z)) continue;
    // a verge is free land with a road a few metres off
    const verge = [0, 1, 2, 3].some((k) => roadMask(x + Math.cos((k * Math.PI) / 2) * 3.5, z + Math.sin((k * Math.PI) / 2) * 3.5) > 0.3);
    const h = heightFast(x, z);
    if (verge && bush.length < 300) bush.push(at(x, z, 0.55 + r() * 0.45));
    else if (h > 4.5 && r() < 0.5 && rock.length < 150) rock.push(at(x, z, 0.35 + r() * 0.9, 0.15));
    else if (r() < 0.12 && shrub.length < 140) shrub.push(at(x, z, 0.8 + r() * 0.5));
  }
  // boulders where the land meets the beach, leaving the pier and the lighthouse point clear
  for (let i = 0; i < 110; i++) {
    const a = r() * Math.PI * 2;
    if (Math.abs(((a * 180) / Math.PI - 95 + 540) % 360 - 180) < 9) continue;
    const d = ISLAND_EDGE - 3 + r() * 6,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (Math.hypot(x - LIGHTHOUSE[0], z - LIGHTHOUSE[1]) < 9 || onBeach(x, z) > 0) continue;
    rock.push(at(x, z, 0.5 + r() * 1.1, 0.25));
  }
  return { bush, shrub, rock };
}

function Instanced({ geo, list, color, hsl, rough = 0.9 }: { geo: THREE.BufferGeometry; list: Spot[]; color?: string; hsl?: [number, number, number]; rough?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      c = new THREE.Color(),
      up = new THREE.Vector3(0, 1, 0);
    list.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q.setFromAxisAngle(up, t.yaw), new THREE.Vector3(t.s, t.s * (0.85 + t.hue * 0.3), t.s));
      ref.current!.setMatrixAt(i, m);
      if (hsl) ref.current!.setColorAt(i, c.setHSL(hsl[0] + (t.hue - 0.5) * 0.05, hsl[1], hsl[2] + (t.hue - 0.5) * 0.1));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [list, hsl]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, list.length]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={rough} flatShading />
    </instancedMesh>
  );
}

export function Nature() {
  const { scene } = useGLTF(NATURE_GLB);
  const spots = useMemo(natureSpots, []);
  const geo = useMemo(() => {
    scene.updateMatrixWorld(true);
    const get = (n: string) => {
      const m = scene.getObjectByName(n) as THREE.Mesh;
      return m.geometry.clone().applyMatrix4(m.matrixWorld);
    };
    return { bush: get("Bush_Clump"), trunk: get("Shrub_Trunk"), crown: get("Shrub_Crown"), rockA: get("Rock_A"), rockB: get("Rock_B") };
  }, [scene]);
  // big boulders are solid
  useEffect(() => {
    const off = spots.rock.filter((t) => t.s > 0.8).map((t) => addCollider({ kind: "circle", x: t.x, z: t.z, r: t.s * 1.1 }));
    return () => off.forEach((f) => f());
  }, [spots]);
  const half = (l: Spot[], k: number) => l.filter((_, i) => i % 2 === k);
  return (
    <group>
      <Instanced geo={geo.bush} list={spots.bush} hsl={[0.3, 0.5, 0.36]} />
      <Instanced geo={geo.trunk} list={spots.shrub} color="#7a5638" rough={1} />
      <Instanced geo={geo.crown} list={spots.shrub} hsl={[0.25, 0.5, 0.42]} />
      <Instanced geo={geo.rockA} list={half(spots.rock, 0)} hsl={[0.1, 0.06, 0.55]} />
      <Instanced geo={geo.rockB} list={half(spots.rock, 1)} hsl={[0.08, 0.05, 0.62]} />
    </group>
  );
}

/* ---------------- Flower meadows (lavender + marigold) ---------------- */
const FLOWERS = DEVICE.low ? 2000 : 4200; // phones: about half, they are specks from the overview
export function Flowers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const r = rng(7);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const pal = ["#9b7bff", "#b69cff", "#ffd23f", "#ff8fb1", "#ffffff"];
    let i = 0,
      guard = 0;
    while (i < FLOWERS && guard++ < 60000) {
      // clustered patches
      const pa = Math.floor(r() * 44);
      const pr = rng(pa * 97 + 3);
      const a = pr() * Math.PI * 2,
        d = 22 + pr() * 68;
      const x = Math.cos(a) * d + (r() - 0.5) * 7,
        z = Math.sin(a) * d + (r() - 0.5) * 7;
      if (!freeFast(x, z)) continue;
      const s = 0.12 + r() * 0.1;
      m.makeScale(s, s * 1.8, s).setPosition(x, heightFast(x, z) + s, z);
      ref.current!.setMatrixAt(i, m);
      ref.current!.setColorAt(i, c.set(pal[pa % 3 === 0 ? 2 + (pa % 3) : pa % 2]));
      i++;
    }
    ref.current!.count = i;
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, FLOWERS]}>
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
export function Lights({ shadowSize = 2048 }: { shadowSize?: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const s = sun.current?.shadow;
    if (!s || s.mapSize.x === shadowSize) return;
    s.mapSize.set(shadowSize, shadowSize);
    s.map?.dispose();
    s.map = null; // rebuilt at the new size on the next frame
  }, [shadowSize]);
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
        shadow-mapSize={[2048, 2048]}
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
type Range = { d: number; depth: number; H: number; seed: number };
/** Height of a mountain range at angle t around the ring and u (0 front .. 1 back) across it. */
function rangeProfile({ H, seed }: Range) {
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
  return (t: number, u: number) => H * ridge(t, u * 6) * Math.pow(Math.sin(Math.PI * Math.min(Math.max(u * 1.1 - 0.05, 0), 1)), 1.3) - 4;
}
export const RANGES: Range[] = [
  { d: 255, depth: 44, H: 28, seed: 77 },
  { d: 310, depth: 54, H: 44, seed: 78 },
  { d: 370, depth: 64, H: 62, seed: 79 },
];
const RANGE_YAW = (i: number) => i * 0.7;
/** Ground height of the background mountains at (x, z) (sea level where there are none). */
export function mountainHeight(x: number, z: number) {
  const rad = Math.hypot(x, z);
  let h = 0;
  RANGES.forEach((l, i) => {
    const u = (rad - (l.d - l.depth / 2)) / l.depth;
    if (u <= 0 || u >= 1) return;
    // the mesh is turned by RANGE_YAW about y, which moves a ring angle t to t - yaw
    h = Math.max(h, PROFILES[i](Math.atan2(z, x) + RANGE_YAW(i), u));
  });
  return h;
}
const PROFILES = RANGES.map(rangeProfile);

function rangeGeometry(l: Range, i: number) {
  const { d, depth } = l;
  const height = PROFILES[i];
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
      const h = j === 0 || j === R - 1 ? -6 : height(t, u);
      pos.push(Math.cos(t) * rad, h, Math.sin(t) * rad);
      const snow = h > l.H * 0.5 ? 1 : 0.5 + (h / l.H) * 0.35;
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
  const items = useMemo(
    () =>
      RANGES.map((l, i) => {
        const [day, night] = [
          ["#8fbad0", "#1a2244"],
          ["#a9cbe0", "#141b38"],
          ["#c4dcea", "#10162e"],
        ][i];
        return {
          g: rangeGeometry(l, i),
          m: new THREE.MeshStandardMaterial({ color: day, vertexColors: true, roughness: 1, flatShading: true }),
          day: new THREE.Color(day),
          night: new THREE.Color(night),
        };
      }),
    []
  );
  useFrame(() => items.forEach((q) => q.m.color.copy(q.day).lerp(q.night, world.night)));
  return (
    <group>
      {items.map((q, i) => (
        <mesh key={i} geometry={q.g} material={q.m} rotation-y={RANGE_YAW(i)} />
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
      if (!freeFast(x, z)) continue;
      q.setFromEuler(e.set(0, r() * Math.PI, 0));
      const k = 0.7 + r() * 0.9;
      s.set(k, k * (0.8 + r() * 0.6), k);
      m.compose(new THREE.Vector3(x, heightFast(x, z) - 0.02, z), q, s);
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
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8d918a", roughness: 1, flatShading: true }), []);
  const boulders = useMemo(() => {
    const r = rng(207);
    // outward (toward the sea) is the direction from the island centre to the lighthouse
    const out = new THREE.Vector2(LIGHTHOUSE[0], LIGHTHOUSE[1]).normalize();
    return Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      const seaward = Math.max(0, Math.cos(a) * out.x + Math.sin(a) * out.y);
      const d = 2.8 + r() * 1.6 + seaward * 2.5;
      return { p: [Math.cos(a) * d, -0.7 - seaward * 1.6 + r() * 0.4, Math.sin(a) * d] as [number, number, number], s: 0.9 + r() * 1.1 + seaward, r: r() * 3 };
    });
  }, []);
  return (
    <group>
      <group position={[LH[0], LH[1], LH[2]]}>
        <Solid r={2.6} />
        {/* the headland: a stone plinth with steps, on a skirt of boulders running down into the surf */}
        <mesh position={[0, -0.6, 0]} material={rock} castShadow receiveShadow>
          <cylinderGeometry args={[2.3, 2.9, 1.6, 10]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} material={white} receiveShadow>
          <cylinderGeometry args={[2.0, 2.2, 0.3, 24]} />
        </mesh>
        {boulders.map((b, i) => (
          <mesh key={i} position={b.p} rotation={[b.r, b.r * 2, 0]} scale={b.s} material={rock} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        ))}
        {/* keeper's hut beside the tower */}
        <group position={[-3.6, 0, 1.2]} rotation-y={0.5}>
          <Solid w={2.6} d={2.2} />
          <mesh position={[0, 1.0, 0]} material={white} castShadow receiveShadow>
            <boxGeometry args={[2.4, 2, 2]} />
          </mesh>
          <mesh position={[0, 2.35, 0]} rotation-y={Math.PI / 4} material={stripe} castShadow>
            <coneGeometry args={[1.9, 0.9, 4]} />
          </mesh>
          <mesh position={[0, 0.75, 1.01]} material={wood}>
            <planeGeometry args={[0.7, 1.4]} />
          </mesh>
        </group>
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

const SHIP_GLB = { cargo: "/models/ship-cargo.glb", ferry: "/models/ship-ferry.glb", sail: "/models/ship-sail.glb" } as const;
Object.values(SHIP_GLB).forEach((u) => useGLTF.preload(u));

type Nav = { red: THREE.MeshStandardMaterial; green: THREE.MeshStandardMaterial; white: THREE.MeshStandardMaterial; win: THREE.MeshStandardMaterial };
/** A ship modelled in Blender (assets-src/scripts/island_props.py); the lane's tint recolours the
 *  hull (cargo), stripe (ferry) or sheer line (sailboat), and the nav lights share materials. */
function Ship({ kind, tint, nav }: { kind: Lane["kind"]; tint: string; nav: Nav }) {
  const { scene } = useGLTF(SHIP_GLB[kind]);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const name = (m.material as THREE.Material).name;
      if (name === "NavRed") m.material = nav.red;
      else if (name === "NavGreen") m.material = nav.green;
      else if (name === "NavWhite") m.material = nav.white;
      else if (name === "ShipWindows") m.material = nav.win;
      else if ((kind === "cargo" && name === "ShipHull") || name === "FerryStripe" || name === "SailTrim") {
        m.material = (m.material as THREE.MeshStandardMaterial).clone();
        (m.material as THREE.MeshStandardMaterial).color.set(tint);
      }
    });
    bakeStatic(c); // ~50 container and deck meshes down to one per material
    return c;
  }, [scene, kind, tint, nav]);
  return <primitive object={model} />;
}

export function Ships() {
  const g = useRef<THREE.Group>(null);
  const nav = useMemo<Nav>(() => {
    const lamp = (c: string) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 });
    return { red: lamp("#ff2d2d"), green: lamp("#2dff6a"), white: lamp("#fff6d8"), win: lamp("#ffd27a") };
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const n = world.night;
    nav.red.emissiveIntensity = nav.green.emissiveIntensity = 0.3 + n * 4;
    nav.white.emissiveIntensity = 0.3 + n * 3;
    nav.win.emissiveIntensity = 0.1 + n * 2.2;
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
      // during the gala, ships that would sail right through the camera's view keep out of shot
      s.visible = world.gala < 0.5 || Math.hypot(s.position.x - GALA_CAM.pos[0], s.position.z - GALA_CAM.pos[2]) > 105;
    });
  });
  return (
    <group ref={g}>
      {LANES.map((l, i) => (
        <group key={i} scale={l.kind === "sail" ? 1.2 : 1}>
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
