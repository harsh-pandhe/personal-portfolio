import * as THREE from "three";
import { ZONES, zonePos } from "./zones";

export const ISLAND_EDGE = 96; // where land meets the beach
export const ROAD_R = 37;
/** Ring road cross-section, from the centreline: 3.5 m lanes, a kerb, then a 2.3 m sidewalk. */
export const LANE_W = 3.5;
export const KERB_W = 0.3;
export const WALK_W = 2.3;
export const ROAD_HALF = LANE_W + KERB_W + WALK_W;
export const PLATEAU = 1.6;
/** Radius of the paved city-centre plaza around Mission Control. */
export const PLAZA_R = 20;

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const zoneXZ = ZONES.map((z) => ({ id: z.id, p: zonePos(z) }));
const MARS = zoneXZ.find((z) => z.id === "marsyard")!.p;
// the IRoC-U yard is centred 9 m outward from the zone point, toward the coast
const ML = Math.hypot(MARS[0], MARS[1]);
export const MARS_C: [number, number] = [MARS[0] + (MARS[0] / ML) * 9, MARS[1] + (MARS[1] / ML) * 9];
export const MARS_R = 19;

/** Flat radius of each zone's plot (inside it the ground is level; it blends out over 4.5 m). */
export function zoneFlatR(id: string) {
  return id === "arena" ? 19 : id === "hq" ? PLAZA_R + 1 : id === "morpheus" || id === "workshop" ? 16 : 13.5;
}
const ROPE = zoneXZ.find((z) => z.id === "ropeway")!.p;
// the ridge rises behind the ropeway valley station, toward the sea
const RIDGE: [number, number] = [ROPE[0] * 1.4, ROPE[1] * 1.4];
export const RIDGE_TOP = 13;
// [x, z, height, spread]: hills in the gaps between zones, out toward the coast
const HILLS: [number, number, number, number][] = ([
  [-70, 80, 9, 9],
  [-30, 80, 8, 8.5],
  [50, 82, 8, 8],
  [130, 80, 10, 9.5],
  [170, 79, 8, 8],
  [210, 78, 7, 8],
  [250, 80, 9, 9],
] as const).map(([deg, r, hh, s]) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r, hh, s]);

export function ridgeTop(): [number, number] {
  return RIDGE;
}

// two more coastal peaks beyond the ridge for the ropeway to cross: [x, z, height, spread]
const polar = (deg: number, r: number): [number, number] => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
export const ROPE_PEAKS: [number, number, number, number][] = [
  [...polar(10, 84), 17, 8],
  [...polar(-12, 82), 14.5, 7.5],
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
  // the ring road (carriageway, kerbs and sidewalks: ROAD_HALF either side) is wider than the boulevards
  const ring = Math.abs(r - ROAD_R) === d;
  return 1 - ss(ring ? ROAD_HALF + 0.4 : 3.6, ring ? ROAD_HALF + 2 : 5, d);
}

/** Level pads cut into slopes for things that need flat ground (ropeway stations, lighthouse). */
type Pad = { x: number; z: number; r: number; h: number };
const PADS: Pad[] = [];

function baseHeight(x: number, z: number) {
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
    const f = zoneFlatR(zz.id);
    const w = 1 - ss(f, f + 4.5, d);
    h = h + (PLATEAU - h) * w * (zz.id === "ropeway" ? 0.85 : 1);
  }
  // the Mars yard: one big flat test field, with a little dune roll
  const dmc = Math.hypot(x - MARS_C[0], z - MARS_C[1]);
  h = h + (PLATEAU + 0.12 * Math.sin(x * 0.7) * Math.sin(z * 0.6) - h) * (1 - ss(MARS_R - 1, MARS_R + 3, dmc));
  h = h + (PLATEAU - h) * roadMask(x, z) * 0.9;
  // shore falloff into the sea
  const edge = ss(ISLAND_EDGE - 6, ISLAND_EDGE + 6, r);
  h = h * (1 - edge) + -2.5 * edge;
  return h;
}

export function heightAt(x: number, z: number) {
  let h = baseHeight(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 3) h += (p.h - h) * (1 - ss(p.r, p.r + 3, d));
  }
  return h;
}

/** Cut a level pad of radius `r` at (x, z), at the ground height there (or `h`). */
function addPad(x: number, z: number, r: number, h?: number) {
  PADS.push({ x, z, r, h: h ?? baseHeight(x, z) });
}
// ropeway stations on the ridge and the two peaks
addPad(RIDGE[0], RIDGE[1], 6.5);
for (const [px, pz] of ROPE_PEAKS) addPad(px, pz, 6.5);
/** The lighthouse stands on a rocky headland on the north-west point. */
export const LIGHTHOUSE: [number, number] = polar(205, ISLAND_EDGE - 3);
addPad(LIGHTHOUSE[0], LIGHTHOUSE[1], 4.5, PLATEAU + 1.2);

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

export function buildTerrain(size = 260, seg = 330) {
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
        const k = 1 - ss(MARS_R - 2.5, MARS_R + 0.5, Math.hypot(x - MARS_C[0], z - MARS_C[1]));
        c.lerp(n > 0.5 ? C.mars : C.mars2, k);
      } else if (zz.id === "hq") {
        c.lerp(C.plaza, (1 - ss(PLAZA_R - 0.5, PLAZA_R + 0.5, d)) * 0.95);
      } else if (zz.id !== "ropeway" && zz.id !== "swarm") {
        const f = zoneFlatR(zz.id) - 3.5;
        c.lerp(C.plaza, (1 - ss(f, f + 1, d)) * 0.9);
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
  if (r > ISLAND_EDGE - 5 || r < PLAZA_R + 2.5) return false;
  if (roadMask(x, z) > 0.05) return false;
  for (const zz of zoneXZ) if (Math.hypot(x - zz.p[0], z - zz.p[1]) < zoneFlatR(zz.id) + 1.5) return false;
  if (Math.hypot(x - MARS_C[0], z - MARS_C[1]) < MARS_R + 3) return false;
  const [rx, rz] = RIDGE;
  if (distSeg(x, z, ROPE[0], ROPE[1], rx, rz) < 3) return false;
  for (const p of PADS) if (Math.hypot(x - p.x, z - p.z) < p.r + 2) return false;
  return true;
}
