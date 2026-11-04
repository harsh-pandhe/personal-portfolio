"use client";

import { useMemo } from "react";
import { archive, papers } from "@/lib/achievements";
import type { ZoneId } from "./zones";

// Animated SVG covers, one per place. Pure SVG + CSS animation: no images, no WebGL.
const W = 1200,
  H = 460;

const css = `
@keyframes cv-spin { to { transform: rotate(360deg) } }
@keyframes cv-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
@keyframes cv-fall { from { transform: translateY(-60px) rotate(0deg) } to { transform: translateY(520px) rotate(540deg) } }
@keyframes cv-draw { from { stroke-dashoffset: var(--len) } to { stroke-dashoffset: 0 } }
@keyframes cv-pulse { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
@keyframes cv-ring { from { r: 6; opacity: .9 } to { r: 230; opacity: 0 } }
@keyframes cv-rain { from { transform: translateY(-100%) } to { transform: translateY(100%) } }
@keyframes cv-left { to { transform: translateX(-50%) } }
@keyframes cv-right { from { transform: translateX(-50%) } to { transform: translateX(0) } }
@keyframes cv-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes cv-growx { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes cv-rise { from { transform: translateY(120px) } to { transform: translateY(0) } }
.cv-spin { animation: cv-spin 9s linear infinite; transform-box: fill-box; transform-origin: center }
.cv-bob { animation: cv-bob 3.2s ease-in-out infinite }
.cv-pulse { animation: cv-pulse 2.4s ease-in-out infinite }
`;

function Grid({ accent }: { accent: string }) {
  return (
    <>
      <defs>
        <pattern id="cv-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.06)" />
        </pattern>
        <radialGradient id="cv-glow" cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor={accent} stopOpacity=".35" />
          <stop offset="100%" stopColor="#070b17" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#070b17" />
      <rect width={W} height={H} fill="url(#cv-grid)" />
      <rect width={W} height={H} fill="url(#cv-glow)" />
    </>
  );
}

function HQ({ a }: { a: string }) {
  return (
    <g transform={`translate(${W / 2} ${H / 2})`}>
      {[60, 110, 165, 220].map((r, i) => (
        <g key={r} className="cv-spin" style={{ animationDuration: `${8 + i * 5}s`, animationDirection: i % 2 ? "reverse" : "normal" }}>
          <ellipse rx={r * 1.6} ry={r * 0.62} fill="none" stroke="rgba(255,255,255,.18)" />
          <circle cx={r * 1.6} cy={0} r={6 - i} fill={i % 2 ? "#fff" : a} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} r="6" fill="none" stroke={a} strokeWidth="2" style={{ animation: `cv-ring 3.6s ${i * 1.2}s ease-out infinite` }} />
      ))}
      <circle r="44" fill="#0b1020" stroke={a} strokeWidth="2" />
      <text textAnchor="middle" dy="10" fontSize="30" fontWeight="700" fill="#fff" letterSpacing="-1">
        HP
      </text>
    </g>
  );
}

function Arena({ a }: { a: string }) {
  const bits = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (i * 97) % W, d: (i % 7) * 0.55, s: 6 + (i % 4) * 3, c: ["#f5b301", "#2d5bff", "#12f0c0", "#ff7ac6", "#fff"][i % 5], t: 4 + (i % 5) })), []);
  return (
    <>
      {bits.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.s} height={b.s * 0.6} fill={b.c} style={{ animation: `cv-fall ${b.t}s ${b.d}s linear infinite`, transformBox: "fill-box", transformOrigin: "center" }} />
      ))}
      <g transform={`translate(${W / 2} 70)`}>
      <g className="cv-bob">
        <path d="M-90 0 H90 C90 120 40 160 0 165 C-40 160 -90 120 -90 0 Z" fill={a} />
        <path d="M-90 20 C-150 20 -150 110 -60 110 M90 20 C150 20 150 110 60 110" fill="none" stroke={a} strokeWidth="14" />
        <rect x="-16" y="160" width="32" height="70" fill={a} />
        <rect x="-70" y="228" width="140" height="34" rx="6" fill={a} />
        <text textAnchor="middle" y="90" fontSize="46" fontWeight="800" fill="#070b17">
          SIH
        </text>
        <text textAnchor="middle" y="252" fontSize="18" fontWeight="700" fill="#070b17" letterSpacing="3">
          2025 · WINNER
        </text>
      </g>
      </g>
    </>
  );
}

function Mars({ a }: { a: string }) {
  const pts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 420; i++) {
      const t = i / 420;
      const x = (i * 131.7) % W;
      const depth = (i * 0.618) % 1;
      out.push([x, 300 + depth * 150 + Math.sin(x * 0.01 + t * 20) * 10 * depth]);
    }
    return out;
  }, []);
  return (
    <>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.8 + (y - 300) / 90} fill={a} opacity={0.25 + (y - 300) / 220} />
      ))}
      <g transform={`translate(${W / 2} 300)`}>
        <g className="cv-spin" style={{ animationDuration: "3s" }}>
          <path d="M0 0 L520 -60 A520 520 0 0 1 520 60 Z" fill={a} opacity=".18" />
        </g>
      </g>
      <g transform={`translate(${W / 2} 170)`}>
      <g className="cv-bob">
        {[
          [-70, -70],
          [70, -70],
          [-70, 70],
          [70, 70],
        ].map(([x, y], i) => (
          <g key={i}>
            <line x1="0" y1="0" x2={x} y2={y * 0.45} stroke="#e8edf3" strokeWidth="7" />
            <ellipse cx={x} cy={y * 0.45} rx="46" ry="9" fill="rgba(255,255,255,.18)" className="cv-pulse" style={{ animationDuration: ".3s" }} />
          </g>
        ))}
        <rect x="-26" y="-14" width="52" height="28" rx="6" fill="#f5b301" />
        <circle cx="0" cy="-22" r="11" fill="#2b2f36" />
        <line x1="0" y1="20" x2="0" y2="130" stroke={a} strokeDasharray="4 6" opacity=".7" />
      </g>
      </g>
      <text x="40" y={H - 30} fontFamily="monospace" fontSize="14" fill="rgba(255,255,255,.55)">
        FAST-LIO · LIVOX MID-360 · EKF2 · PX4 · NO GPS
      </text>
    </>
  );
}

function Swarm({ a }: { a: string }) {
  const C = 18,
    R = 8,
    S = 44,
    ox = W / 2 - (C * S) / 2,
    oy = 60;
  return (
    <>
      {Array.from({ length: C * R }, (_, i) => {
        const c = i % C,
          r = Math.floor(i / C);
        const lane = Math.floor(c / 6);
        const order = (c % 6) * R + (c % 2 ? R - 1 - r : r);
        return (
          <rect
            key={i}
            x={ox + c * S + 3}
            y={oy + r * S + 3}
            width={S - 6}
            height={S - 6}
            rx="6"
            fill={a}
            style={{ animation: `cv-pulse 7.2s ${(order / (6 * R)) * 7.2 + lane * 0.15}s ease-in-out infinite`, opacity: 0.12 }}
          />
        );
      })}
      {[0, 1, 2].map((b) => (
        <circle key={b} r="13" fill="#fff" stroke={a} strokeWidth="4">
          <animateMotion
            dur="7.2s"
            repeatCount="indefinite"
            path={`M${ox + b * 6 * S + S / 2} ${oy + S / 2} ${Array.from({ length: 6 }, (_, c) => `L${ox + (b * 6 + c) * S + S / 2} ${c % 2 ? oy + S / 2 : oy + (R - 0.5) * S} ${c < 5 ? `L${ox + (b * 6 + c + 1) * S + S / 2} ${c % 2 ? oy + S / 2 : oy + (R - 0.5) * S}` : ""}`).join(" ")}`}
          />
        </circle>
      ))}
    </>
  );
}

function Rope({ a }: { a: string }) {
  const path = "M120 360 Q600 360 1080 110";
  return (
    <>
      <path d="M0 460 L240 250 L420 380 L760 120 L980 300 L1200 180 L1200 460 Z" fill="rgba(255,255,255,.06)" />
      <path d="M760 120 L700 170 L820 170 Z" fill="rgba(255,255,255,.4)" />
      <path d={path} fill="none" stroke="#d6dbe3" strokeWidth="3" />
      <path d="M120 375 Q600 375 1080 125" fill="none" stroke="#d6dbe3" strokeWidth="3" opacity=".6" />
      {[0, 2.6, 5.2].map((d) => (
        <g key={d}>
          <g>
            <animateMotion dur="7.8s" begin={`${d}s`} repeatCount="indefinite" path={path} />
            <line x1="0" y1="0" x2="0" y2="24" stroke="#d6dbe3" strokeWidth="3" />
            <rect x="-22" y="24" width="44" height="36" rx="6" fill={a} />
            <rect x="-17" y="30" width="34" height="12" rx="3" fill="#bfe8ff" />
          </g>
        </g>
      ))}
      <rect x="80" y="360" width="90" height="60" fill="#f2f3f5" />
      <rect x="1040" y="110" width="90" height="60" fill="#f2f3f5" />
      <text x="40" y="44" fontFamily="monospace" fontSize="14" fill="rgba(255,255,255,.55)">
        GA · NSGA-II · PPO · EUROCODE · 12 INSTALLATIONS · 5 CONTINENTS
      </text>
    </>
  );
}

function Trade({ a }: { a: string }) {
  const series = useMemo(() => {
    let v = 300;
    return Array.from({ length: 44 }, (_, i) => {
      const o = v;
      v = Math.max(80, Math.min(400, v - 9 + ((i * 37) % 23) - 8 + Math.sin(i * 0.7) * 10));
      return { o, c: v };
    });
  }, []);
  const line = series.map((s, i) => `${i ? "L" : "M"}${60 + i * 25} ${s.c}`).join(" ");
  return (
    <>
      {series.map((s, i) => (
        <rect
          key={i}
          x={52 + i * 25}
          y={Math.min(s.o, s.c)}
          width="14"
          height={Math.max(3, Math.abs(s.c - s.o))}
          fill={s.c <= s.o ? "#00e08a" : "#ff4d5e"}
          style={{ animation: `cv-grow .6s ${i * 0.04}s both`, transformBox: "fill-box", transformOrigin: "bottom" }}
        />
      ))}
      <path d={line} fill="none" stroke={a} strokeWidth="3" style={{ ["--len" as string]: 2000, strokeDasharray: 2000, animation: "cv-draw 3s ease-out both" }} />
      <text x="60" y="80" fontSize="64" fontWeight="700" fill="#fff" letterSpacing="-3">
        40.2%
      </text>
      <text x="62" y="108" fontFamily="monospace" fontSize="14" fill="rgba(255,255,255,.55)">
        CAGR · SHARPE 1.68 · MAX DD −26.4%
      </text>
    </>
  );
}

function Workshop({ a }: { a: string }) {
  const rows = [archive.slice(0, 9), archive.slice(9, 17), archive.slice(17)];
  return (
    <>
      {rows.map((r, i) => (
        <g key={i} transform={`translate(0 ${100 + i * 110})`}>
          <g style={{ animation: `${i % 2 ? "cv-right" : "cv-left"} ${40 + i * 8}s linear infinite` }}>
            {[...r, ...r, ...r, ...r].map((p, j) => (
              <g key={j} transform={`translate(${j * 260} 0)`}>
                <rect width="240" height="80" rx="16" fill={j % 3 === 0 ? a : "rgba(255,255,255,.07)"} stroke="rgba(255,255,255,.12)" />
                <text x="20" y="36" fontSize="20" fontWeight="700" fill="#fff">
                  {p.name.length > 20 ? p.name.slice(0, 19) + "…" : p.name}
                </text>
                <text x="20" y="60" fontFamily="monospace" fontSize="12" fill="rgba(255,255,255,.6)">
                  {p.year} · {p.kind.toUpperCase()}
                </text>
              </g>
            ))}
          </g>
        </g>
      ))}
    </>
  );
}

function Library({ a }: { a: string }) {
  // horizontal bars with the title beside each one, so long paper names never overflow
  const max = Math.max(...papers.map((p) => p.views));
  return (
    <>
      <text x="40" y="44" fontFamily="monospace" fontSize="14" fill="rgba(255,255,255,.55)">
        SSRN · VIEWS PER PAPER · QUANT (LIGHT) · ROBOTICS (COLOUR)
      </text>
      {papers.map((p, i) => {
        const y = 78 + i * 62;
        const w = 40 + (p.views / max) * 520;
        const t = p.title.split(":")[0];
        return (
          <g key={p.id}>
            <text x="40" y={y + 26} fontSize="16" fontWeight="600" fill="rgba(255,255,255,.88)">
              {t.length > 46 ? t.slice(0, 45) + "…" : t}
            </text>
            <rect x="560" y={y + 6} width={w} height="30" rx="7" fill={i < 3 ? "#e9eef5" : a} style={{ animation: `cv-growx 1.1s ${i * 0.12}s cubic-bezier(.16,1,.3,1) both`, transformBox: "fill-box", transformOrigin: "left" }} />
            <text x={560 + w + 12} y={y + 27} fontSize="15" fontWeight="700" fill="rgba(255,255,255,.8)" fontFamily="monospace">
              {p.views}
            </text>
          </g>
        );
      })}
    </>
  );
}

function Morpheus({ a }: { a: string }) {
  const cols = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x: i * 25 + 6,
        d: (i * 0.37) % 3,
        t: 3 + (i % 5),
        s: Array.from({ length: 22 }, (_, j) => String.fromCharCode(0x30a0 + ((i * 13 + j * 7) % 90))).join(""),
      })),
    []
  );
  return (
    <>
      {cols.map((c, i) => (
        <text key={i} x={c.x} y={0} fontSize="18" fontFamily="monospace" fill={a} style={{ writingMode: "vertical-rl", animation: `cv-rain ${c.t}s ${c.d}s linear infinite`, opacity: 0.55 + (i % 3) * 0.15 }}>
          {c.s}
        </text>
      ))}
      <g transform={`translate(${W / 2} ${H / 2})`}>
        <rect x="-250" y="-70" width="500" height="140" rx="20" fill="rgba(7,11,23,.85)" stroke={a} />
        <circle cx="-150" cy="0" r="26" fill="#ff2b2b" className="cv-pulse" />
        <circle cx="150" cy="0" r="26" fill="#2b6bff" className="cv-pulse" style={{ animationDelay: "1.2s" }} />
        <text textAnchor="middle" dy="10" fontSize="28" fontWeight="700" fill="#fff" letterSpacing="-1">
          PROJECT MORPHEUS
        </text>
      </g>
    </>
  );
}

function Home({ a }: { a: string }) {
  return (
    <>
      <circle cx={W / 2} cy="330" r="120" fill={a} opacity=".85" style={{ animation: "cv-rise 2.4s cubic-bezier(.16,1,.3,1) both" }} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="0" y={330 + i * 18} width={W} height={8 + i} fill="#070b17" />
      ))}
      <g transform={`translate(${W / 2 - 300} 250)`}>
        <rect x="0" y="40" width="120" height="80" fill="#fff4e2" />
        <path d="M-12 44 L60 -10 L132 44 Z" fill="#e86a6a" />
        <rect x="48" y="78" width="24" height="42" fill="#a8754a" />
        <rect x="14" y="58" width="22" height="18" fill="#ffd27a" className="cv-pulse" />
      </g>
      <text x="40" y="44" fontFamily="monospace" fontSize="14" fill="rgba(255,255,255,.55)">
        NAVI MUMBAI · OPEN TO A HELLO
      </text>
    </>
  );
}

export default function Cover({ id, accent }: { id: ZoneId; accent: string }) {
  const body = {
    hq: <HQ a={accent} />,
    arena: <Arena a={accent} />,
    marsyard: <Mars a={accent} />,
    swarm: <Swarm a={accent} />,
    ropeway: <Rope a={accent} />,
    trading: <Trade a={accent} />,
    workshop: <Workshop a={accent} />,
    library: <Library a={accent} />,
    morpheus: <Morpheus a={accent} />,
    home: <Home a={accent} />,
  }[id];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" style={{ fontFamily: "var(--font-sans)" }}>
      <style>{css}</style>
      <Grid accent={accent} />
      {body}
    </svg>
  );
}
