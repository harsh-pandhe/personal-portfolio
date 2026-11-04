import * as THREE from "three";
import { ZONES, zonePos } from "./zones";

export const ISLAND_EDGE = 68; // where land meets the beach
export const ROAD_R = 27;
export const PLATEAU = 1.6;

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const zoneXZ = ZONES.map((z) => ({ id: z.id, p: zonePos(z) }));
const MARS = zoneXZ.find((z) => z.id === "marsyard")!.p;
const ROPE = zoneXZ.find((z) => z.id === "ropeway")!.p;
// the ridge rises behind the ropeway valley station, toward the sea
const RIDGE: [number, number] = [ROPE[0] * 1.42, ROPE[1] * 1.42];
export const RIDGE_TOP = 13;
// [x, z, height, spread]: hills in the gaps between zones, out toward the coast
const HILLS: [number, number, number, number][] = ([
  [-70, 56, 8, 7],
  [-30, 57, 7, 6.5],
  [130, 55, 9, 7.5],
  [170, 54, 7, 6],
] as const).map(([deg, r, hh, s]) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r, hh, s]);

export function ridgeTop(): [number, number] {
  return RIDGE;
}

// two more coastal peaks beyond the ridge for the ropeway to cross: [x, z, height, spread]
const polar = (deg: number, r: number): [number, number] => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
export const ROPE_PEAKS: [number, number, number, number][] = [
  [...polar(9, 60), 17, 7],
  [...polar(-13, 59), 14.5, 6.5],
];

function distSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax,
    vz = bz - az;
  const t = Math.min(Math.max(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz), 0), 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/** Road mask: the ring road plus spokes from HQ to every zone (0..1). */
export function roadMask(x: number, z: number) {
  const r = Math.hypot(x, z);
  let d = Math.abs(r - ROAD_R);
  for (const zz of zoneXZ) {
    if (zz.id === "hq") continue;
    d = Math.min(d, distSeg(x, z, 0, 0, zz.p[0] * 0.82, zz.p[1] * 0.82));
  }
  return 1 - ss(1.1, 1.9, d);
}

export function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h =
    PLATEAU +
    0.9 * Math.sin(x * 0.09) * Math.cos(z * 0.08) +
    0.7 * Math.sin((x + z) * 0.045 + 1.3) +
    0.35 * Math.sin(x * 0.23 + z * 0.17);
  // rolling hills between the zones and the coast, so the island isn't a flat disc
  for (const [hx, hz, hh, hs] of HILLS) {
    const d2 = (x - hx) ** 2 + (z - hz) ** 2;
    h += hh * Math.exp(-d2 / (2 * hs * hs));
  }
  h += 1.4 * Math.max(0, Math.sin(x * 0.06 + 0.8) * Math.sin(z * 0.07 - 0.4)) * ss(30, 48, r);
  for (const [px, pz, ph, ps] of ROPE_PEAKS) h += ph * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (2 * ps * ps));
  // the ridge
  const dr = Math.hypot(x - RIDGE[0], z - RIDGE[1]);
  h += RIDGE_TOP * Math.exp(-(dr * dr) / (2 * 7.5 * 7.5));
  // flat plateaus for zones and roads
  for (const zz of zoneXZ) {
    const d = Math.hypot(x - zz.p[0], z - zz.p[1]);
    const w = zz.id === "arena" ? 1 - ss(14, 17.5, d) : 1 - ss(9.5, 14, d);
    h = h + (PLATEAU - h) * w * (zz.id === "ropeway" ? 0.85 : 1);
  }
  h = h + (PLATEAU - h) * roadMask(x, z) * 0.9;
  // Mars yard crater
  const dm = Math.hypot(x - MARS[0] - 3, z - MARS[1] + 3);
  if (dm < 3.2) h -= Math.cos((dm / 3.2) * Math.PI * 0.5) * 0.8;
  // shore falloff into the sea
  const edge = ss(ISLAND_EDGE - 6, ISLAND_EDGE + 6, r);
  h = h * (1 - edge) + -2.5 * edge;
  return h;
}

const C = {
  grass: new THREE.Color("#7cc65a"),
  grass2: new THREE.Color("#5fae4b"),
  meadow: new THREE.Color("#a6d86b"),
  sand: new THREE.Color("#ecdcb0"),
  road: new THREE.Color("#d9dde2"),
  mars: new THREE.Color("#c4552d"),
  mars2: new THREE.Color("#9e3f22"),
  rock: new THREE.Color("#8e9a7d"),
  plaza: new THREE.Color("#eef1f4"),
};

export function buildTerrain(size = 190, seg = 260) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const r = Math.hypot(x, z);
    const n = 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.5) * 2) * Math.cos(z * 0.6);
    c.copy(C.grass).lerp(C.grass2, n * 0.6).lerp(C.meadow, Math.max(0, Math.sin(x * 0.05 - z * 0.04)) * 0.35);
    if (h > 5) c.lerp(C.rock, ss(5, 11, h) * 0.6);
    // plazas under zones
    for (const zz of zoneXZ) {
      const d = Math.hypot(x - zz.p[0], z - zz.p[1]);
      if (zz.id === "marsyard") {
        const k = 1 - ss(6.5, 9.5, d);
        c.lerp(n > 0.5 ? C.mars : C.mars2, k);
      } else if (zz.id !== "ropeway" && zz.id !== "swarm") {
        c.lerp(C.plaza, (1 - ss(zz.id === "arena" ? 12.5 : 5.8, zz.id === "arena" ? 13.5 : 6.8, d)) * 0.9);
      }
    }
    c.lerp(C.road, roadMask(x, z) * 0.95);
    c.lerp(C.sand, ss(ISLAND_EDGE - 4, ISLAND_EDGE + 1, r));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

/** Deterministic PRNG so the island is the same on every visit. */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** True where trees/props may grow (not on roads, plazas, beach or the ridge path). */
export function isFreeLand(x: number, z: number) {
  const r = Math.hypot(x, z);
  if (r > ISLAND_EDGE - 5 || r < 11) return false;
  if (roadMask(x, z) > 0.05) return false;
  for (const zz of zoneXZ) if (Math.hypot(x - zz.p[0], z - zz.p[1]) < (zz.id === "arena" ? 17 : 13)) return false;
  const [rx, rz] = RIDGE;
  if (distSeg(x, z, ROPE[0], ROPE[1], rx, rz) < 3) return false;
  return true;
}
