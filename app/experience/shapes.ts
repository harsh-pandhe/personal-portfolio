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
  ctx.font = "900 190px Inter, Arial Black, sans-serif";
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
