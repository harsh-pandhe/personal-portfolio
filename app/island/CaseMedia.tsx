"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Cover from "./Cover";
import { Quad } from "./Landmarks";
import type { ZoneId } from "./zones";

// Real media for each case page: Google Flow clips (animated, AI-generated, labelled as such),
// photos from Harsh's LinkedIn posts, and live heroes where a demo says more than a picture.
type Shot = { src: string; cap: string; video?: boolean; wide?: boolean };
type Media = { hero?: { video: string; cap: string }; live?: "swarm" | "morpheus" | "mars"; gallery?: Shot[] };

const V = (n: string) => `/media/video/${n}.mp4`;
const P = (n: string) => `/media/photos/${n}.jpg`;

export const MEDIA: Partial<Record<ZoneId, Media>> = {
  hq: {
    hero: { video: "story-1-campus", cap: "SIT Lonavala, on the edge of the Sahyadris" },
    gallery: [
      { src: P("sih-team-stage"), cap: "Algo Sapiens on stage, SIH 2025 Grand Finale", wide: true },
      { src: P("desk-rig"), cap: "The desk where most of it gets built" },
      { src: P("code2launch-lecture"), cap: "Code2Launch: a three-day ACM web-dev event" },
    ],
  },
  arena: {
    hero: { video: "arena-trophy", cap: "SIH 2025: the trophy goes up, animated" },
    gallery: [
      { src: V("story-5-hackathon"), cap: "The hackathon hall, animated", video: true, wide: true },
      { src: P("sih-team-stage"), cap: "Algo Sapiens at the SIH 2025 Grand Finale", wide: true },
      { src: P("sih-grand-finale"), cap: "Smart India Hackathon 2025 Grand Finale" },
      { src: P("roborashtra-cheque"), cap: "RoboRashtra 2026: 1st runner-up, ₹10,000 for the maze bot", wide: true },
      { src: P("roborashtra-bot"), cap: "The maze-solving bot" },
      { src: P("roborashtra-newspaper"), cap: "RoboRashtra in Maval Maza" },
    ],
  },
  marsyard: {
    live: "mars",
    gallery: [
      { src: V("mars-drone"), cap: "A drone mapping a Mars yard with LiDAR, animated", video: true, wide: true },
      { src: V("story-2-navigation"), cap: "Navigating without GPS, animated", video: true },
      { src: P("ascend-site"), cap: "ASCEND: the drone project's landing page" },
    ],
  },
  swarm: { live: "swarm" },
  ropeway: {
    hero: { video: "ropeway-aerial", cap: "A ropeway over the hills, animated" },
    gallery: [
      { src: V("ropeway-cabin"), cap: "Cabin on the line", video: true, wide: true },
      { src: V("ropeway-pov"), cap: "Cabin's-eye view", video: true },
      { src: V("ropeway-twilight"), cap: "Blue hour over the line", video: true },
    ],
  },
  trading: {
    hero: { video: "story-3-markets", cap: "Reading the market, animated" },
    gallery: [
      { src: P("algo-gate-e"), cap: "Gate E: production clearance after 10 rejected hypotheses", wide: true },
      { src: P("algo-sector-neutrality"), cap: "Why sector neutrality fails in Indian momentum" },
      { src: P("algo-hysteresis"), cap: "Banded rebalancing: the hysteresis buffer" },
      { src: P("algo-costs"), cap: "Transaction costs in Indian algo trading" },
      { src: P("algo-paper-validation"), cap: "60-day unattended paper validation" },
      { src: P("algo-pit-index"), cap: "Point-in-time index reconstruction" },
      { src: P("algo-quant-station"), cap: "Evolution of the quant station" },
    ],
  },
  workshop: {
    hero: { video: "story-4-builds", cap: "Building, animated" },
    gallery: [
      { src: P("aura-music"), cap: "Aura: self-hosted music ecosystem", wide: true },
      { src: P("harsh-os"), cap: "Harsh OS: local-first networking" },
      { src: P("aura-youtube"), cap: "Aura vs the YouTube scraping war" },
      { src: P("netguard"), cap: "NetGuard-ML: honest intrusion detection" },
      { src: P("workbench-illustration"), cap: "The workbench" },
    ],
  },
  morpheus: {
    live: "morpheus",
    gallery: [
      { src: P("morpheus-poster"), cap: "Project Morpheus 2026", wide: true },
      { src: P("morpheus-allocator"), cap: "From spreadsheets to MongoDB: the Morpheus allocator" },
      { src: P("kalpataru"), cap: "Kalpataru, the college fest platform" },
    ],
  },
  home: { hero: { video: "story-6-singapore", cap: "Next stop: Singapore, 15–17 Nov 2026" } },
};

/** A muted looping clip that only plays while on screen. */
function Clip({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={src.replace(".mp4", ".jpg")} muted loop playsInline preload="none" className={className} />;
}

export function MediaHero({ id, accent }: { id: ZoneId; accent: string }) {
  const m = MEDIA[id];
  if (m?.live === "swarm") return <SwarmSim accent={accent} />;
  if (m?.live === "morpheus") return <MorpheusHero />;
  if (m?.live === "mars") return <MarsHero />;
  if (!m?.hero) return <Cover id={id} accent={accent} />;
  return (
    <div className="relative aspect-[16/7] w-full overflow-hidden bg-black">
      <Clip src={V(m.hero.video)} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(7,11,23,.85))]" />
      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between font-mono text-[11px] uppercase tracking-wide text-white/75">
        <span>{m.hero.cap}</span>
        <span className="rounded-full border border-white/25 px-2 py-0.5 text-white/55">Animated with Google Flow</span>
      </div>
    </div>
  );
}

export function Gallery({ id, accent }: { id: ZoneId; accent: string }) {
  const g = MEDIA[id]?.gallery;
  const [big, setBig] = useState<Shot | null>(null);
  if (!g?.length) return null;
  return (
    <section className="mx-10 mt-16">
      <span className="font-mono text-[12px] uppercase tracking-wide" style={{ color: accent }}>
        From the field
      </span>
      <div className="mt-4 grid grid-cols-3 gap-3 [grid-auto-flow:dense]">
        {g.map((s) => (
          <figure
            key={s.src}
            onClick={() => !s.video && setBig(s)}
            className={`group relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] ${s.wide ? "col-span-2 row-span-2" : ""} ${s.video ? "" : "cursor-zoom-in"}`}
          >
            {s.video ? (
              <Clip src={s.src} className="aspect-video h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.src} alt={s.cap} loading="lazy" className="aspect-video h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
            )}
            <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(0,0,0,.8))] px-3.5 pb-3 pt-8 text-[13px] leading-snug text-white/90">{s.cap}</figcaption>
          </figure>
        ))}
      </div>
      {big && (
        <div onClick={() => setBig(null)} className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/85 p-10 backdrop-blur">
          <figure className="max-h-full max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big.src} alt={big.cap} className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <figcaption className="mt-3 text-center text-white/80">{big.cap}</figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

/* ---------- Swarm: a live coverage simulation with failure injection ---------- */
function SwarmSim({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ cov: 0, alive: 6, t: 0, event: "Six robots, one map. Coverage starts." });
  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const W = (cv.width = 1200),
      H = (cv.height = 520);
    const C = 40,
      R = 13;
    const cols = Math.floor(W / C),
      rows = Math.floor(H / C);
    let seen: Float32Array;
    type Bot = { x: number; y: number; tx: number; ty: number; alive: boolean; c: string; trail: [number, number][] };
    let bots: Bot[] = [];
    const colors = ["#12f0c0", "#2d5bff", "#ffd23f", "#ff7ac6", "#9b7bff", "#ff8a3d"];
    const reset = () => {
      seen = new Float32Array(cols * rows);
      bots = colors.map((c, i) => ({ x: 60 + i * 18, y: H - 60, tx: 0, ty: 0, alive: true, c, trail: [] }));
      bots.forEach(pick);
    };
    // frontier-style target: nearest unseen cell, nudged away from teammates (the "consensus map")
    function pick(b: Bot) {
      let best = -1,
        bd = 1e9;
      for (let i = 0; i < seen.length; i++) {
        if (seen[i] > 0.5) continue;
        const cx = (i % cols) * C + C / 2,
          cy = Math.floor(i / cols) * C + C / 2;
        let d = Math.hypot(cx - b.x, cy - b.y);
        for (const o of bots) if (o !== b && o.alive) d += 900 / (1 + Math.hypot(cx - o.tx, cy - o.ty));
        if (d < bd) (bd = d), (best = i);
      }
      if (best < 0) return;
      b.tx = (best % cols) * C + C / 2;
      b.ty = Math.floor(best / cols) * C + C / 2;
    }
    reset();
    let t0 = performance.now(),
      last = t0,
      killed = false,
      raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - t0) / 1000;
      // failure injection at 7 s: one robot drops, the rest absorb its area
      if (!killed && t > 7) {
        killed = true;
        bots[2].alive = false;
        setHud((h) => ({ ...h, event: "Robot 3 lost. The other five re-plan around the gap." }));
      }
      for (const b of bots) {
        if (!b.alive) continue;
        const dx = b.tx - b.x,
          dy = b.ty - b.y,
          d = Math.hypot(dx, dy);
        // CBF-style separation: slow and steer away when another robot gets close
        let sx = 0,
          sy = 0;
        for (const o of bots) {
          if (o === b || !o.alive) continue;
          const q = Math.hypot(b.x - o.x, b.y - o.y);
          if (q < 46) (sx += (b.x - o.x) / q), (sy += (b.y - o.y) / q);
        }
        const v = 140;
        if (d < 4) pick(b);
        else {
          b.x += ((dx / d) * v + sx * 90) * dt;
          b.y += ((dy / d) * v + sy * 90) * dt;
        }
        const ci = Math.floor(b.x / C) + Math.floor(b.y / C) * cols;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const k = ci + ox + oy * cols;
            if (k >= 0 && k < seen.length) seen[k] = Math.min(1, seen[k] + dt * (ox || oy ? 1.2 : 3));
          }
        b.trail.push([b.x, b.y]);
        if (b.trail.length > 60) b.trail.shift();
      }
      let cov = 0;
      for (const s of seen) cov += s > 0.5 ? 1 : 0;
      const pct = (cov / seen.length) * 100;
      // draw
      g.fillStyle = "#070b14";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < seen.length; i++) {
        const x = (i % cols) * C,
          y = Math.floor(i / cols) * C;
        g.fillStyle = seen[i] > 0.5 ? `rgba(18,240,192,${0.08 + seen[i] * 0.16})` : "rgba(255,255,255,0.025)";
        g.fillRect(x + 1, y + 1, C - 2, C - 2);
      }
      for (const b of bots) {
        g.strokeStyle = b.alive ? b.c + "66" : "#ff3b3b44";
        g.lineWidth = 2;
        g.beginPath();
        b.trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        if (b.alive) {
          g.strokeStyle = b.c + "55";
          g.setLineDash([4, 6]);
          g.beginPath();
          g.moveTo(b.x, b.y);
          g.lineTo(b.tx, b.ty);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = b.c + "30";
          g.beginPath();
          g.arc(b.x, b.y, 46, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = b.alive ? b.c : "#ff3b3b";
        g.beginPath();
        g.arc(b.x, b.y, R, 0, Math.PI * 2);
        g.fill();
        if (!b.alive) {
          g.strokeStyle = "#fff";
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(b.x - 6, b.y - 6);
          g.lineTo(b.x + 6, b.y + 6);
          g.moveTo(b.x + 6, b.y - 6);
          g.lineTo(b.x - 6, b.y + 6);
          g.stroke();
        }
      }
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) setHud((h) => ({ ...h, cov: pct, alive: bots.filter((b) => b.alive).length, t }));
      if (pct > 97) {
        setHud((h) => ({ ...h, event: "Map covered. Resetting the run." }));
        t0 = now;
        killed = false;
        reset();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="relative bg-[#070b14]">
      <canvas ref={ref} className="block aspect-[1200/520] w-full" />
      <div className="absolute left-5 top-4 flex gap-2 font-mono text-[11px] uppercase">
        {[
          ["Coverage", `${hud.cov.toFixed(0)}%`],
          ["Robots up", `${hud.alive}/6`],
          ["t", `${hud.t.toFixed(1)} s`],
        ].map(([k, v]) => (
          <span key={k} className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 backdrop-blur">
            <span className="text-white/45">{k} </span>
            <b style={{ color: accent }}>{v}</b>
          </span>
        ))}
      </div>
      <div className="absolute bottom-4 left-5 right-5 flex justify-between font-mono text-[11px] uppercase text-white/70">
        <span>{hud.event}</span>
        <span className="text-white/40">Illustrative sim · frontier targets · separation filter · failure injection</span>
      </div>
    </div>
  );
}

/* ---------- Morpheus: the real site's pixel-green CRT terminal ---------- */
function MorpheusHero() {
  const [typed, setTyped] = useState("");
  const line = "WAKE UP. BUILD THE FUTURE.";
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % (line.length + 18);
      setTyped(line.slice(0, Math.min(i, line.length)));
    }, 90);
    return () => clearInterval(id);
  }, []);
  const bits = useMemo(() => Array.from({ length: 34 }, (_, i) => ({ x: (i * 37) % 100, d: 3 + ((i * 7) % 5), del: (i % 9) * 0.4 })), []);
  return (
    <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#020702] font-[family-name:var(--font-pixel)] text-[#22ff4c]">
      <style>{`@keyframes mf{from{transform:translateY(-10%)}to{transform:translateY(110%)}}@keyframes mb{50%{opacity:0}}`}</style>
      {bits.map((b, i) => (
        <span key={i} className="absolute top-0 text-[11px] opacity-25" style={{ left: `${b.x}%`, animation: `mf ${b.d}s linear ${b.del}s infinite` }}>
          {i % 2 ? "1" : "0"}
        </span>
      ))}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.35)_0_2px,transparent_2px_4px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,.8))]" />
      <div className="relative flex h-full items-center gap-10 px-[6%]">
        <div className="flex-1">
          <p className="text-[11px] text-[#22ff4c]/70">&gt; SYSTEM INITIALIZING…</p>
          <h3 className="mt-4 text-[clamp(28px,4.2vw,64px)] leading-[1.05] [text-shadow:0_0_18px_#22ff4c,4px_4px_0_#0a5a14]">
            PROJECT
            <br />
            MORPHEUS
          </h3>
          <p className="mt-5 text-[13px]">
            {typed}
            <span style={{ animation: "mb 1s steps(1) infinite" }}>_</span>
          </p>
          <div className="mt-7 flex gap-3 text-[10px]">
            <span className="border border-[#22ff4c] bg-[#22ff4c] px-3 py-2 text-black">▶ 24 HOURS</span>
            <span className="border border-[#ff2d2d] px-3 py-2 text-[#ff2d2d]"><span className="font-sans font-bold">₹</span>2L+ PRIZE POOL</span>
          </div>
        </div>
        <div className="hidden w-[34%] border border-[#22ff4c]/70 p-4 text-[9px] leading-[2] shadow-[0_0_30px_rgba(34,255,76,.25)] md:block">
          <div className="flex justify-between text-[#22ff4c]/60">
            <span>ID: MRP-2026</span>
            <span>CLASS: OPERATOR</span>
          </div>
          {["EDTECH", "HEALTHCARE", "WOMEN SAFETY", "AGRITECH", "FINTECH"].map((d, i) => (
            <div key={d} className="mt-1 flex justify-between border-b border-[#22ff4c]/15">
              <span>LEVEL 0{i + 1}</span>
              <span>{d}</span>
            </div>
          ))}
          <div className="mt-3 text-[#ff2d2d]">[SENTINEL] ACTIVE</div>
          <div className="text-[#22ff4c]/60">SIT LONAVALA · FEB 26, 2026</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mars: the GPS-denied quad in 3D, props spinning, LiDAR sweeping ---------- */
function ScanCloud() {
  const pts = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const N = 2600,
      a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2,
        r = 2.5 + Math.random() * 9;
      a[i * 3] = Math.cos(th) * r;
      a[i * 3 + 1] = -1.6 + Math.sin(th * 3 + r) * 0.25 + (r > 8 ? Math.random() * 2.5 : 0);
      a[i * 3 + 2] = Math.sin(th) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (pts.current) pts.current.rotation.y = clock.elapsedTime * 0.25;
  });
  return (
    <points ref={pts} geometry={geo}>
      <pointsMaterial size={0.05} color="#ff6a3d" transparent opacity={0.85} />
    </points>
  );
}
function Hover() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!g.current) return;
    g.current.position.y = Math.sin(t * 1.4) * 0.15;
    g.current.rotation.y = t * 0.35;
    g.current.rotation.z = Math.sin(t * 0.9) * 0.06;
  });
  return (
    <group ref={g}>
      <Quad scale={9} />
    </group>
  );
}
function MarsHero() {
  return (
    <div className="relative aspect-[16/7] w-full bg-[radial-gradient(ellipse_at_50%_80%,#5a1d10,#0b0604_70%)]">
      <Canvas camera={{ position: [0, 2.2, 6.5], fov: 40 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 3]} intensity={2.2} />
        <pointLight position={[-3, 1, 2]} color="#ff5a36" intensity={6} />
        <Hover />
        <ScanCloud />
      </Canvas>
      <div className="pointer-events-none absolute bottom-4 left-5 right-5 flex justify-between font-mono text-[11px] uppercase text-white/70">
        <span>FAST-LIO · Livox MID-360 · EKF2 · PX4 · no GPS</span>
        <span className="text-white/40">Live 3D · props spinning · simulated LiDAR sweep</span>
      </div>
    </div>
  );
}
