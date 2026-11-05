// Solid things the player can't walk through. Kept as simple 2D shapes on the ground plane.
import { zoneById, zonePos, type ZoneId } from "./zones";

type Circle = { kind: "circle"; x: number; z: number; r: number };
// an annulus (stadium stands) with an opening facing `gap` (radians, world space)
type Ring = { kind: "ring"; x: number; z: number; r0: number; r1: number; gap: number; gapHalf: number };
type Box = { kind: "box"; x: number; z: number; hw: number; hd: number; rot: number };
export type Collider = Circle | Ring | Box;

/** Zone-local (+z points at HQ, as in ZoneGroup) to world XZ. */
export function zoneToWorld(id: ZoneId, lx: number, lz: number): [number, number] {
  const [x, z] = zonePos(zoneById[id]);
  const th = Math.atan2(-x, -z);
  return [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
}
function zoneYaw(id: ZoneId) {
  const [x, z] = zonePos(zoneById[id]);
  return Math.atan2(-x, -z);
}

export const ARENA = { r0: 9.2, r1: 15.2, gapHalf: (34 * Math.PI) / 180 };

function build(): Collider[] {
  const out: Collider[] = [];
  const [ax, az] = zonePos(zoneById.arena);
  out.push({ kind: "ring", x: ax, z: az, r0: ARENA.r0, r1: ARENA.r1, gap: Math.atan2(-ax, -az), gapHalf: ARENA.gapHalf });
  out.push({ kind: "circle", x: ax, z: az, r: 1.5 }); // trophy plinth
  const box = (id: ZoneId, lx: number, lz: number, w: number, d: number) => {
    const [x, z] = zoneToWorld(id, lx, lz);
    out.push({ kind: "box", x, z, hw: w / 2, hd: d / 2, rot: zoneYaw(id) });
  };
  box("trading", 0, -6.2, 17.6, 7.6); // tower and the market wall
  box("workshop", 4.5, -6.5, 14.1, 9.6); // makerspace (scaled 1.5)
  box("home", 0.2, -4.2, 7.6, 5.2); // house
  box("library", -0.4, -6, 11, 16.8); // gothic hall and its tower
  const [bx, bz] = zoneToWorld("trading", -10.5, 0.5);
  out.push({ kind: "circle", x: bx, z: bz, r: 1.9 }); // bull plinth
  return out;
}

export const COLLIDERS = build();

/** Add a collider at runtime (see <Solid> in Props.tsx); returns a remover. */
export function addCollider(c: Collider) {
  COLLIDERS.push(c);
  return () => {
    const i = COLLIDERS.indexOf(c);
    if (i >= 0) COLLIDERS.splice(i, 1);
  };
}

/** Push a point (player radius `pr`) out of every collider. */
export function resolve(x: number, z: number, pr = 0.45): [number, number] {
  for (const c of COLLIDERS) {
    if (c.kind === "circle") {
      const dx = x - c.x,
        dz = z - c.z,
        d = Math.hypot(dx, dz),
        m = c.r + pr;
      if (d < m && d > 1e-4) (x = c.x + (dx / d) * m), (z = c.z + (dz / d) * m);
    } else if (c.kind === "ring") {
      const dx = x - c.x,
        dz = z - c.z,
        d = Math.hypot(dx, dz);
      if (d <= c.r0 - pr || d >= c.r1 + pr || d < 1e-4) continue;
      let da = Math.atan2(dx, dz) - c.gap;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < c.gapHalf) continue; // walking through the entrance
      // out to whichever face of the stands is nearer
      const m = d - (c.r0 - pr) < c.r1 + pr - d ? c.r0 - pr : c.r1 + pr;
      x = c.x + (dx / d) * m;
      z = c.z + (dz / d) * m;
    } else {
      const cs = Math.cos(c.rot),
        sn = Math.sin(c.rot);
      // into the box's frame (inverse of three.js Y rotation)
      const lx = (x - c.x) * cs - (z - c.z) * sn,
        lz = (x - c.x) * sn + (z - c.z) * cs;
      const ox = c.hw + pr - Math.abs(lx),
        oz = c.hd + pr - Math.abs(lz);
      if (ox <= 0 || oz <= 0) continue;
      let nx = lx,
        nz = lz;
      if (ox < oz) nx = Math.sign(lx || 1) * (c.hw + pr);
      else nz = Math.sign(lz || 1) * (c.hd + pr);
      x = c.x + nx * cs + nz * sn;
      z = c.z - nx * sn + nz * cs;
    }
  }
  return [x, z];
}
