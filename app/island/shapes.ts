// Target point clouds for the swarm. Every shape returns exactly `n` points (x,y,z) in a Float32Array.

const rand = (seed: number) => {
  // mulberry32 — deterministic so SSR/CSR and reloads agree
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export function textShape(n: number, text: string, width = 9): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(7);
  const c = document.createElement("canvas");
  const W = 900;
  const H = 260;
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = `800 190px ${getComputedStyle(document.body).fontFamily || "Arial Black, sans-serif"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
    }
  }
  const count = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * count) * 2;
    out[i * 3] = ((pts[k] / W) - 0.5) * width;
    out[i * 3 + 1] = -((pts[k + 1] / H) - 0.5) * width * (H / W) + 0.2;
    out[i * 3 + 2] = (r() - 0.5) * 0.35;
  }
  return out;
}

export function globeShape(n: number, radius = 2.6): Float32Array {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i;
    out[i * 3] = Math.cos(th) * rr * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(th) * rr * radius;
  }
  return out;
}

// Ropeway: two cable lines with catenary sag between towers, plus cabins as denser clusters.
export function ropewayShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(21);
  const towers = [-5, -1.7, 1.7, 5];
  for (let i = 0; i < n; i++) {
    const roll = r();
    if (roll < 0.14) {
      // tower: vertical strut with a cross-arm
      const t = towers[Math.floor(r() * towers.length)];
      const h = r();
      const baseY = -1.9 + terrain(t);
      out[i * 3] = t + (r() - 0.5) * 0.12;
      out[i * 3 + 1] = baseY + h * (1.6 + (t > 0 ? 0.6 : 0));
      out[i * 3 + 2] = (r() - 0.5) * 0.25;
    } else if (roll < 0.86) {
      // cable: catenary between consecutive towers
      const x = -5 + r() * 10;
      const seg = x < -1.7 ? 0 : x < 1.7 ? 1 : 2;
      const a = towers[seg];
      const b = towers[seg + 1];
      const u = (x - a) / (b - a);
      const sag = 0.55 * (4 * u * (1 - u));
      const lerpY = (ty: number, tt: number) => ty + (tt - ty) * u;
      const ya = -1.9 + terrain(a) + 1.45;
      const yb = -1.9 + terrain(b) + 1.45 + (b > 0 ? 0.6 : 0);
      const y = lerpY(ya, yb) - sag;
      const lane = r() < 0.5 ? -0.08 : 0.08;
      out[i * 3] = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = lane + (r() - 0.5) * 0.03;
    } else {
      // cabins
      const x = -4.6 + r() * 9.2;
      out[i * 3] = x + (r() - 0.5) * 0.18;
      out[i * 3 + 1] = -0.2 + Math.sin(x * 0.55) * 0.35 - 0.38 + (r() - 0.5) * 0.18;
      out[i * 3 + 2] = (r() - 0.5) * 0.2;
    }
  }
  return out;
}

function terrain(x: number) {
  return Math.sin(x * 0.5) * 0.35 + Math.cos(x * 0.23) * 0.25;
}

// Equity curve + candles: a rising noisy line with a ghosted rejected-path line below.
export function chartShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(5);
  for (let i = 0; i < n; i++) {
    const roll = r();
    const x = -5 + r() * 10;
    if (roll < 0.5) {
      const t = (x + 5) / 10;
      const y = -2 + 4 * Math.pow(t, 1.6) + Math.sin(t * 22) * 0.12 * (0.4 + t);
      out[i * 3] = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = (r() - 0.5) * 0.08;
    } else if (roll < 0.72) {
      const t = (x + 5) / 10;
      const y = -2 + 1.5 * t + Math.sin(t * 15 + 1) * 0.25;
      out[i * 3] = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = -0.6 + (r() - 0.5) * 0.08;
    } else {
      // volume bars
      const bar = Math.floor(r() * 24);
      const bx = -5 + (bar / 24) * 10;
      const bh = 0.2 + (Math.sin(bar * 1.7) * 0.5 + 0.5) * 0.9;
      out[i * 3] = bx + (r() - 0.5) * 0.28;
      out[i * 3 + 1] = -2.35 + r() * bh;
      out[i * 3 + 2] = 0.4 + (r() - 0.5) * 0.15;
    }
  }
  return out;
}

// Martian terrain: a heightfield with craters, lit from above.
export function marsShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(99);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * 12;
    const z = (r() - 0.5) * 7;
    let y = Math.sin(x * 0.6) * 0.45 + Math.cos(z * 0.9 + x * 0.2) * 0.35;
    const d = Math.hypot(x - 1.5, z + 0.5);
    if (d < 1.6) y -= Math.cos((d / 1.6) * Math.PI * 0.5) * 0.9; // crater
    out[i * 3] = x;
    out[i * 3 + 1] = y - 1.2;
    out[i * 3 + 2] = z;
  }
  return out;
}

// Constellation / orbit rings for the finale (a drone-show "Taramandal").
export function ringsShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(3);
  for (let i = 0; i < n; i++) {
    const ring = i % 3;
    const a = r() * Math.PI * 2;
    const rad = 1.6 + ring * 1.2;
    const tilt = ring * 0.5;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad * Math.cos(tilt);
    const z = Math.sin(a) * rad * Math.sin(tilt);
    out[i * 3] = x + (r() - 0.5) * 0.05;
    out[i * 3 + 1] = y + (r() - 0.5) * 0.05;
    out[i * 3 + 2] = z + (r() - 0.5) * 0.05;
  }
  return out;
}

// DNA-like double helix for the research section.
export function helixShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(11);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 9 - Math.PI * 4.5;
    const strand = i % 2 === 0 ? 0 : Math.PI;
    const rung = r() < 0.18;
    const rad = 1.3;
    if (rung) {
      const k = r();
      const tt = Math.floor(r() * 40) / 40 * Math.PI * 9 - Math.PI * 4.5;
      out[i * 3] = Math.cos(tt) * rad * (2 * k - 1);
      out[i * 3 + 1] = tt * 0.55;
      out[i * 3 + 2] = Math.sin(tt) * rad * (2 * k - 1);
    } else {
      out[i * 3] = Math.cos(t + strand) * rad;
      out[i * 3 + 1] = t * 0.55;
      out[i * 3 + 2] = Math.sin(t + strand) * rad;
    }
  }
  return out;
}

// Quadcopter (X-frame, 4 rotor discs, body, LiDAR puck) — IRoC-U / Sovereign-X.
export function droneShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(21);
  const arm = 2.1;
  const motors = [
    [arm, arm],
    [-arm, arm],
    [arm, -arm],
    [-arm, -arm],
  ];
  for (let i = 0; i < n; i++) {
    const k = r();
    let x = 0,
      y = 0,
      z = 0;
    if (k < 0.42) {
      // rotor discs (rings)
      const [mx, mz] = motors[i % 4];
      const a = r() * Math.PI * 2;
      const rad = 0.95 + (r() - 0.5) * 0.08;
      x = mx + Math.cos(a) * rad;
      z = mz + Math.sin(a) * rad;
      y = 0.35 + (r() - 0.5) * 0.03;
    } else if (k < 0.66) {
      // arms
      const [mx, mz] = motors[i % 4];
      const t = r();
      x = mx * t + (r() - 0.5) * 0.12;
      z = mz * t + (r() - 0.5) * 0.12;
      y = (r() - 0.5) * 0.1;
    } else if (k < 0.74) {
      // motor bells
      const [mx, mz] = motors[i % 4];
      const a = r() * Math.PI * 2;
      x = mx + Math.cos(a) * 0.22;
      z = mz + Math.sin(a) * 0.22;
      y = r() * 0.35;
    } else if (k < 0.92) {
      // body box
      x = (r() - 0.5) * 1.3;
      y = (r() - 0.5) * 0.45;
      z = (r() - 0.5) * 1.8;
    } else {
      // LiDAR puck on top
      const a = r() * Math.PI * 2;
      const rad = 0.38 * Math.sqrt(r());
      x = Math.cos(a) * rad;
      z = Math.sin(a) * rad;
      y = 0.3 + r() * 0.35;
    }
    out[i * 3] = x * 0.95;
    out[i * 3 + 1] = y + 0.2;
    out[i * 3 + 2] = z * 0.95;
  }
  return out;
}

// Lattice cube of nodes and edges — the archive of everything built.
export function latticeShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(5);
  const N = 4; // nodes per axis
  const s = 3.6; // edge length
  const step = s / (N - 1);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(r() * N) * step - s / 2;
    const b = Math.floor(r() * N) * step - s / 2;
    const t = r() * s - s / 2;
    const axis = i % 3;
    const j = (r() - 0.5) * 0.04;
    if (r() < 0.25) {
      // node clusters
      const c = [Math.floor(r() * N) * step - s / 2, Math.floor(r() * N) * step - s / 2, Math.floor(r() * N) * step - s / 2];
      out[i * 3] = c[0] + (r() - 0.5) * 0.14;
      out[i * 3 + 1] = c[1] + (r() - 0.5) * 0.14;
      out[i * 3 + 2] = c[2] + (r() - 0.5) * 0.14;
    } else if (axis === 0) {
      out[i * 3] = t;
      out[i * 3 + 1] = a + j;
      out[i * 3 + 2] = b + j;
    } else if (axis === 1) {
      out[i * 3] = a + j;
      out[i * 3 + 1] = t;
      out[i * 3 + 2] = b + j;
    } else {
      out[i * 3] = a + j;
      out[i * 3 + 1] = b + j;
      out[i * 3 + 2] = t;
    }
  }
  return out;
}

// A trophy cup: lathe profile sampled as a point cloud, plus two handles.
export function trophyShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(31);
  const prof: [number, number][] = [
    [1.1, -2.4], [1.1, -2.1], [0.35, -1.9], [0.25, -0.7], [0.6, -0.4], [1.4, 0.2], [1.7, 1.9],
  ];
  const radAt = (y: number) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i],
        [r1, y1] = prof[i + 1];
      if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
    return 0;
  };
  for (let i = 0; i < n; i++) {
    if (i % 6 === 0) {
      // handles
      const s = i % 12 === 0 ? 1 : -1;
      const a = r() * Math.PI;
      out[i * 3] = s * (1.75 + Math.sin(a) * 0.7);
      out[i * 3 + 1] = 1.2 - Math.cos(a) * 0.65;
      out[i * 3 + 2] = (r() - 0.5) * 0.1;
      continue;
    }
    const y = -2.4 + r() * 4.3;
    const rad = radAt(y);
    const a = r() * Math.PI * 2;
    out[i * 3] = Math.cos(a) * rad;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(a) * rad * 0.35;
  }
  return out;
}

// A rocket on its exhaust plume: body, nose cone, fins.
export function rocketShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(41);
  for (let i = 0; i < n; i++) {
    const k = r();
    let x = 0,
      y = 0;
    if (k < 0.5) {
      y = -1.2 + r() * 3.2;
      x = (r() < 0.5 ? -1 : 1) * 0.55;
    } else if (k < 0.66) {
      const t = r();
      y = 2 + t * 1.3;
      x = (r() < 0.5 ? -1 : 1) * 0.55 * (1 - t);
    } else if (k < 0.8) {
      const t = r();
      const s = r() < 0.5 ? -1 : 1;
      y = -1.2 + t * 0.9;
      x = s * (0.55 + (1 - t) * 0.6);
    } else {
      // plume
      const t = r();
      y = -1.4 - t * 1.6;
      x = (r() - 0.5) * (0.4 + t * 1.1);
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (r() - 0.5) * 0.25;
  }
  return out;
}

/** Text for a drone show: drones sit on an even grid inside the letter strokes (not random
 *  samples), so the words read cleanly. `lines` are stacked and centred. */
export function gridTextShape(n: number, lines: string[], width = 10): Float32Array {
  const out = new Float32Array(n * 3);
  const W = 1200,
    LH = 220,
    H = LH * lines.length;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 180px ${getComputedStyle(document.body).fontFamily || "Arial Black, sans-serif"}`;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, LH * (i + 0.5), W * 0.96));
  const data = ctx.getImageData(0, 0, W, H).data;
  const inside = (x: number, y: number) => data[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 128;
  // pick the grid step that fills the strokes with about n drones
  let step = 4,
    pts: [number, number][] = [];
  for (let st = 3; st < 40; st += 0.5) {
    const p: [number, number][] = [];
    for (let y = st / 2; y < H; y += st) for (let x = st / 2; x < W; x += st) if (inside(x, y)) p.push([x, y]);
    if (p.length <= n) {
      pts = p;
      step = st;
      break;
    }
  }
  const r = rand(3);
  for (let i = 0; i < n; i++) {
    // any spare drones double up on a stroke point, nudged a hair so they don't z-fight
    const [x, y] = pts[i < pts.length ? i : Math.floor(r() * pts.length)];
    const j = i < pts.length ? 0 : step * 0.25;
    out[i * 3] = ((x + (r() - 0.5) * j) / W - 0.5) * width;
    out[i * 3 + 1] = -((y + (r() - 0.5) * j) / H - 0.5) * width * (H / W);
    out[i * 3 + 2] = 0;
  }
  return out;
}

/** A 3:2 flag of points in three equal bands with a 24-spoke wheel at the centre. The LightShow
 *  colours it by band (saffron, white, green, navy wheel) and ripples it like cloth. */
export function flagShape(n: number, width = 9): Float32Array {
  const out = new Float32Array(n * 3);
  const H = (width * 2) / 3;
  const R = (H / 3) * 0.42;
  const wheel = Math.floor(n * 0.14);
  const cols = Math.round(Math.sqrt(((n - wheel) * 3) / 2)),
    rows = Math.ceil((n - wheel) / cols);
  let i = 0;
  for (let r = 0; r < rows && i < n - wheel; r++)
    for (let c = 0; c < cols && i < n - wheel; c++, i++) {
      out[i * 3] = (c / (cols - 1) - 0.5) * width;
      out[i * 3 + 1] = (0.5 - r / (rows - 1)) * H;
      out[i * 3 + 2] = 0;
    }
  // the wheel: a rim and 24 spokes, a hair in front of the cloth
  for (let k = 0; i < n; i++, k++) {
    const onRim = k % 3 === 0;
    const a = onRim ? (k / wheel) * Math.PI * 2 : (Math.floor(k / 3) % 24) * ((Math.PI * 2) / 24);
    const d = onRim ? R : R * (0.15 + ((k * 0.37) % 0.85));
    out[i * 3] = Math.cos(a) * d;
    out[i * 3 + 1] = Math.sin(a) * d;
    out[i * 3 + 2] = 0.05;
  }
  return out;
}
/** Index from which flagShape's points belong to the wheel. */
export const flagWheelFrom = (n: number) => n - Math.floor(n * 0.14);

/** Taramandal ("constellation"): a five-pointed star outline inside an orbit ring, with a field of
 *  smaller stars around it. */
export function starShape(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rand(21);
  const outline = Math.floor(n * 0.45),
    ring = Math.floor(n * 0.3);
  const P: [number, number][] = Array.from({ length: 10 }, (_, k) => {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const d = k % 2 ? 1.25 : 3.1;
    return [Math.cos(a) * d, Math.sin(a) * d];
  });
  for (let i = 0; i < n; i++) {
    let x: number, y: number;
    if (i < outline) {
      const u = (i / outline) * 10,
        k = Math.floor(u),
        f = u - k;
      const A = P[k],
        B = P[(k + 1) % 10];
      x = A[0] + (B[0] - A[0]) * f;
      y = A[1] + (B[1] - A[1]) * f;
    } else if (i < outline + ring) {
      const a = ((i - outline) / ring) * Math.PI * 2;
      x = Math.cos(a) * 4.2;
      y = Math.sin(a) * 4.2 * 0.92;
    } else {
      const a = r() * Math.PI * 2,
        d = 4.8 + r() * 1.6;
      x = Math.cos(a) * d * 1.25;
      y = Math.sin(a) * d * 0.75;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (r() - 0.5) * 0.25;
  }
  return out;
}

/** A small Earth with a 1U CubeSat (a cube with two solar wings) on an orbit around it. The first
 *  `cubesatFrom(n)` points are the planet; the rest are the satellite, orbited in the frame loop. */
export function cubesatShape(n: number): Float32Array {
  const earth = cubesatFrom(n);
  const out = new Float32Array(n * 3);
  out.set(globeShape(earth, 2.2));
  const r = rand(33);
  for (let i = earth; i < n; i++) {
    const k = r();
    let x: number, y: number, z: number;
    if (k < 0.45) {
      // the cube body: points on its faces
      const f = Math.floor(r() * 6),
        u = r() - 0.5,
        v = r() - 0.5;
      const s = 0.42;
      [x, y, z] = f < 2 ? [f ? s / 2 : -s / 2, u * s, v * s] : f < 4 ? [u * s, f === 3 ? s / 2 : -s / 2, v * s] : [u * s, v * s, f === 5 ? s / 2 : -s / 2];
    } else {
      // two solar wings either side
      const side = r() < 0.5 ? -1 : 1;
      x = side * (0.3 + r() * 1.1);
      y = (r() - 0.5) * 0.36;
      z = 0;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}
export const cubesatFrom = (n: number) => Math.floor(n * 0.72);

/** Order points along a Hilbert curve over their shared bounding box, so that matching two
 *  formations by rank sends each drone a short way and paths rarely cross (a fast stand-in for
 *  the Hungarian assignment Taramandal uses between formations). Returns perm: drone j flies to
 *  target point perm[j]. */
export function matchFormations(A: Float32Array, B: Float32Array): Int32Array {
  const n = A.length / 3;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const P of [A, B])
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, P[i * 3]);
      maxX = Math.max(maxX, P[i * 3]);
      minY = Math.min(minY, P[i * 3 + 1]);
      maxY = Math.max(maxY, P[i * 3 + 1]);
    }
  const S = 1024,
    sx = (S - 1) / (maxX - minX || 1),
    sy = (S - 1) / (maxY - minY || 1);
  const hilbert = (x: number, y: number) => {
    let d = 0;
    for (let s = S / 2; s > 0; s = Math.floor(s / 2)) {
      const rx = (x & s) > 0 ? 1 : 0,
        ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) {
        if (rx === 1) (x = S - 1 - x), (y = S - 1 - y);
        [x, y] = [y, x];
      }
    }
    return d;
  };
  const key = (P: Float32Array) => {
    const k = new Float64Array(n);
    for (let i = 0; i < n; i++) k[i] = hilbert(Math.round((P[i * 3] - minX) * sx), Math.round((P[i * 3 + 1] - minY) * sy));
    return k;
  };
  const ka = key(A),
    kb = key(B);
  const ia = Array.from({ length: n }, (_, i) => i).sort((p, q) => ka[p] - ka[q]);
  const ib = Array.from({ length: n }, (_, i) => i).sort((p, q) => kb[p] - kb[q]);
  const perm = new Int32Array(n);
  for (let r = 0; r < n; r++) perm[ia[r]] = ib[r];
  return perm;
}
