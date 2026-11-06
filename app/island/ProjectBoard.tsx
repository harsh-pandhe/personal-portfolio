"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// The Workshop as a Figma-style board: every build is a card of its own shape and size,
// grouped into clusters and wired to what it grew out of. Drag to pan, scroll or pinch to zoom.
// Projects and links come from github.com/harsh-pandhe (public repos, homepages).

type Shape = "card" | "wide" | "phone" | "sticky" | "terminal" | "chip" | "circle";
type P = { id: string; t: string; s: string; shape: Shape; x: number; y: number; c: string; href?: string; tag?: string };

const GH = (r: string) => `https://github.com/harsh-pandhe/${r}`;

const CLUSTERS = [
  { name: "Drones & autonomy", x: 120, y: 90, w: 980, h: 620, c: "#ff5a36" },
  { name: "Robots & swarms", x: 1180, y: 90, w: 760, h: 620, c: "#12f0c0" },
  { name: "Markets & quant", x: 2020, y: 90, w: 820, h: 620, c: "#7dff8a" },
  { name: "Mobile apps", x: 120, y: 800, w: 1060, h: 640, c: "#ff7ac6" },
  { name: "Platforms & web", x: 1260, y: 800, w: 900, h: 640, c: "#2d5bff" },
  { name: "AI, security & infra", x: 2240, y: 800, w: 600, h: 640, c: "#9b7bff" },
  { name: "Events & community", x: 120, y: 1530, w: 1060, h: 460, c: "#ffd23f" },
  { name: "Hardware & IoT", x: 1260, y: 1530, w: 1580, h: 460, c: "#ff8a3d" },
];

const ITEMS: P[] = [
  // drones
  { id: "iroc", t: "iroc-ascend-nav", s: "GPS-denied drone stack for ISRO IRoC-U 2026: FAST-LIO, Livox MID-360, EKF2, PX4", shape: "wide", x: 170, y: 160, c: "#ff5a36", href: GH("iroc-ascend-nav"), tag: "Finalist" },
  { id: "taramandal", t: "Taramandal GCS", s: "Cybernetic command-and-control dashboard with SITL", shape: "terminal", x: 640, y: 150, c: "#ff5a36", href: GH("Taramandal-GCS") },
  { id: "studio", t: "Taramandal Studio", s: "Swarm choreography generator and 3D visualiser for drone shows", shape: "card", x: 660, y: 420, c: "#ff5a36", href: GH("taramandal-studio") },
  { id: "chloris", t: "Project Chloris", s: "Drone MVP: F450, Pi 5, mission architecture", shape: "sticky", x: 200, y: 430, c: "#ffd23f", href: GH("Project-Chloris") },
  { id: "ascend", t: "ASCEND", s: "Engineering-first aerial intelligence", shape: "circle", x: 430, y: 470, c: "#ff5a36", href: "https://fly-delta-khaki.vercel.app" },
  { id: "cubesat", t: "CubeSat 1U", s: "A 1U satellite build", shape: "chip", x: 920, y: 600, c: "#ff5a36", href: GH("cubesat-1u") },
  // robots
  { id: "mars", t: "MARS", s: "Multi-agent robot swarm: MAPPO + GNN + CBF on TurtleBot3s in ROS 2 / Gazebo. 3 SSRN papers", shape: "wide", x: 1220, y: 160, c: "#12f0c0", href: GH("MARS"), tag: "Research" },
  { id: "bot", t: "Maze bot", s: "Line follower that switches to on-device neural inference for the maze. RoboRashtra 1st runner-up", shape: "card", x: 1230, y: 430, c: "#12f0c0", href: GH("Bot"), tag: "Runner-up" },
  { id: "fleet", t: "FleetCommand", s: "C++ fleet platform", shape: "chip", x: 1600, y: 470, c: "#12f0c0", href: GH("fleetcommand-platform") },
  { id: "podtwin", t: "Pod-transit twin", s: "Digital twin for personal rapid transit", shape: "sticky", x: 1650, y: 230, c: "#ffd23f", href: GH("pod-transit-digital-twin") },
  // markets
  { id: "algo", t: "AlgoTrade", s: "Autonomous multi-agent trading for NSE. 20 phases, 10 rejected hypotheses, Gate E cleared", shape: "wide", x: 2060, y: 160, c: "#7dff8a", href: GH("AlgoTrade"), tag: "3 SSRN papers" },
  { id: "rust", t: "Rust trading engine", s: "High-performance matching engine", shape: "terminal", x: 2520, y: 170, c: "#7dff8a", href: GH("stock-market") },
  { id: "cost", t: "Agentic cost forecasting", s: "EPC contract analysis for construction consultancy", shape: "card", x: 2080, y: 430, c: "#7dff8a", href: GH("agentic-cost-forecasting") },
  { id: "rideradar", t: "RideRadar", s: "Live cab-fare aggregator across Uber, Ola and more", shape: "circle", x: 2560, y: 460, c: "#7dff8a", href: GH("RideRadar") },
  // mobile
  { id: "expense", t: "ExpenseTracker", s: "Auto-captures Indian bank SMS, parses and syncs transactions", shape: "phone", x: 170, y: 870, c: "#ff7ac6", href: "https://expensetracker-v3-web.vercel.app" },
  { id: "rentclear", t: "RentClear", s: "Pay rent, stay TDS-compliant. Flutter + Supabase", shape: "phone", x: 390, y: 870, c: "#ff7ac6", href: GH("rentclear") },
  { id: "doppeldash", t: "DoppelDash", s: "Multi-tenant expenses, leave and travel for Doppelmayr. Next.js + Flutter, 1,000+ tests", shape: "wide", x: 620, y: 880, c: "#ff7ac6", href: GH("DoppelDash"), tag: "Internship" },
  { id: "queuepay", t: "QueuePay", s: "QR scan-to-pay salon queues. Next.js + Flutter + Supabase", shape: "phone", x: 640, y: 1150, c: "#ff7ac6", href: GH("queuepay") },
  { id: "fuel", t: "Fuel Margdarshak", s: "Fuel guide app in Flutter", shape: "phone", x: 860, y: 1150, c: "#ff7ac6", href: GH("fuel-margdarshak") },
  { id: "music", t: "Aura Music", s: "Offline-first music on mobile, desktop and web from your home server", shape: "card", x: 180, y: 1200, c: "#ff7ac6", href: "https://youtube-backend-kohl.vercel.app" },
  { id: "city", t: "City Companion", s: "Consent-first urban mobility telemetry (Expo)", shape: "sticky", x: 420, y: 1240, c: "#ffd23f", href: GH("city-companion") },
  // platforms
  { id: "agritrace", t: "AgriTrace", s: "Agricultural waste tracking platform", shape: "card", x: 1300, y: 870, c: "#2d5bff", href: "https://agri-trace-virid.vercel.app/" },
  { id: "kisan", t: "Kisan Micro-ERP", s: "ERP for small farms", shape: "chip", x: 1560, y: 900, c: "#2d5bff", href: "https://kisan-micro-erp.vercel.app" },
  { id: "ather", t: "Ather Co-Pilot", s: "AI productivity workspace on Next.js, Firebase and Genkit", shape: "card", x: 1780, y: 880, c: "#2d5bff", href: "https://ather-copilot.vercel.app" },
  { id: "chrono", t: "ChronoTrack", s: "Privacy-respecting workforce telemetry and project ROI", shape: "card", x: 1300, y: 1140, c: "#2d5bff", href: "https://chrono-track-tau.vercel.app" },
  { id: "codex", t: "Codex", s: "Real-time collaborative code editor (Monaco + Liveblocks)", shape: "terminal", x: 1560, y: 1130, c: "#2d5bff", href: "https://collabcodex.vercel.app/" },
  { id: "chess", t: "3D Chess", s: "Glassmorphic multiplayer chess with Stockfish", shape: "circle", x: 1960, y: 1180, c: "#2d5bff", href: GH("3d-chess") },
  { id: "linear", t: "Linear scheduler", s: "Line-of-balance scheduling for heavy civil works", shape: "sticky", x: 1980, y: 940, c: "#ffd23f", href: GH("linear-scheduler-app") },
  { id: "ropeway", t: "Ropeway alignment", s: "Eurocode-validated aerial ropeway optimiser: GA, NSGA-II, PPO", shape: "wide", x: 1300, y: 1330, c: "#ff5a6e", href: "https://web-steel-eight-25.vercel.app", tag: "Doppelmayr" },
  // AI / sec
  { id: "aura", t: "Aura", s: "AI memory and chat analysis system", shape: "circle", x: 2290, y: 880, c: "#9b7bff", href: GH("azzy") },
  { id: "netguard", t: "NetGuard-ML", s: "Leakage-free intrusion detection with honest evaluation", shape: "terminal", x: 2500, y: 880, c: "#9b7bff", href: GH("netguard-ml") },
  { id: "noc", t: "Air-gapped NOC copilot", s: "Predicts network degradation, fully offline", shape: "card", x: 2280, y: 1140, c: "#9b7bff", href: GH("airgapped-netops-ai") },
  { id: "terra", t: "Terra Verify", s: "Construction progress from Sentinel-2", shape: "chip", x: 2560, y: 1180, c: "#9b7bff", href: GH("terra-verify") },
  { id: "traffic", t: "Traffic surveillance", s: "Helmet compliance and multi-frame tracking", shape: "sticky", x: 2540, y: 1310, c: "#ffd23f", href: GH("traffic-surveillance-system") },
  // events
  { id: "morpheus", t: "Project Morpheus", s: "24-hour national hackathon site at SIT Lonavala. Wake up. Build the future.", shape: "terminal", x: 170, y: 1600, c: "#22ff4c", href: "https://project-morpheus-nu.vercel.app", tag: "Lead organiser" },
  { id: "pm", t: "Morpheus Prime", s: "Hostel allocation platform for hackathons and camps", shape: "card", x: 560, y: 1600, c: "#ffd23f", href: "https://morpheus-prime-network.vercel.app" },
  { id: "kalpataru", t: "Kalpataru", s: "Ultra-secure college fest registration", shape: "card", x: 830, y: 1600, c: "#ffd23f", href: "https://kalpataru-2025.vercel.app" },
  { id: "dronews", t: "Drone Workshop", s: "IIC SIT three-day drone workshop site", shape: "sticky", x: 600, y: 1810, c: "#ffd23f", href: "https://drone-workshop-iic.vercel.app/" },
  { id: "iicbot", t: "IIC Bot", s: "RAG compliance chatbot for IIC", shape: "chip", x: 860, y: 1860, c: "#ffd23f", href: "https://iic-bot.vercel.app" },
  // hardware
  { id: "esp", t: "ESP32-CAM series", s: "Six builds: live stream, SD timestamps, photo booth, timelapse, PIR security, Telegram bot", shape: "wide", x: 1300, y: 1600, c: "#ff8a3d", href: GH("esp32cam-01-live-stream") },
  { id: "cooler", t: "SmartCooler IoT", s: "ESP32 cooling controller", shape: "chip", x: 1760, y: 1620, c: "#ff8a3d", href: "https://smart-cooler-io-t.vercel.app" },
  { id: "lidar", t: "LiDAR + UWB", s: "Sensor experiments for indoor positioning", shape: "sticky", x: 1980, y: 1600, c: "#ffd23f", href: GH("Lidar") },
  { id: "drowsy", t: "Drowsiness detection", s: "Real-time eye-state computer vision", shape: "circle", x: 2220, y: 1640, c: "#ff8a3d", href: GH("Drowsiness-Detection-System") },
  { id: "toll", t: "NextGen toll", s: "Zero-hardware software-simulated highway toll", shape: "card", x: 2470, y: 1620, c: "#ff8a3d", href: GH("nextgen-highspeed-toll") },
];

// what grew out of what
const WIRES: [string, string][] = [
  ["iroc", "taramandal"], ["taramandal", "studio"], ["iroc", "chloris"], ["iroc", "ascend"], ["studio", "mars"], ["mars", "bot"], ["mars", "fleet"],
  ["podtwin", "ropeway"], ["algo", "rust"], ["algo", "cost"], ["doppeldash", "ropeway"], ["doppeldash", "queuepay"], ["expense", "rentclear"],
  ["queuepay", "fuel"], ["music", "aura"], ["agritrace", "kisan"], ["codex", "chess"], ["ather", "aura"], ["netguard", "noc"], ["terra", "traffic"],
  ["morpheus", "pm"], ["pm", "kalpataru"], ["morpheus", "dronews"], ["dronews", "iroc"], ["esp", "cooler"], ["lidar", "iroc"], ["drowsy", "traffic"], ["linear", "ropeway"], ["iicbot", "morpheus"],
];

const SIZE: Record<Shape, [number, number]> = {
  card: [230, 150],
  wide: [400, 190],
  phone: [170, 250],
  sticky: [190, 170],
  terminal: [330, 180],
  chip: [210, 80],
  circle: [170, 170],
};

function Card({ p }: { p: P }) {
  const [w, h] = SIZE[p.shape];
  const common = "absolute block select-none transition-transform duration-300 hover:z-10 hover:-translate-y-1.5";
  const style = { left: p.x, top: p.y, width: w, height: h } as React.CSSProperties;
  const inner = (
    <>
      {p.tag && (
        <span className="absolute -top-3 right-3 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-black" style={{ background: p.c }}>
          {p.tag}
        </span>
      )}
    </>
  );
  if (p.shape === "phone")
    return (
      <a href={p.href} target="_blank" rel="noreferrer" className={common} style={style} draggable={false}>
        <div className="h-full rounded-[28px] border-[5px] border-[#151a24] bg-[linear-gradient(170deg,#1d2433,#0d111a)] p-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)]">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15" />
          <div className="h-14 rounded-xl" style={{ background: `linear-gradient(135deg, ${p.c}, transparent)` }} />
          <b className="mt-3 block text-[15px] leading-tight">{p.t}</b>
          <p className="mt-1.5 text-[11.5px] leading-snug text-white/60">{p.s}</p>
        </div>
        {inner}
      </a>
    );
  if (p.shape === "sticky")
    return (
      <a href={p.href} target="_blank" rel="noreferrer" className={common} style={{ ...style, transform: `rotate(${(p.x % 7) - 3}deg)` }} draggable={false}>
        <div className="h-full p-4 text-[#2a2200] shadow-[0_14px_24px_-10px_rgba(0,0,0,.6)]" style={{ background: p.c }}>
          <b className="block text-[16px] leading-tight">{p.t}</b>
          <p className="mt-2 text-[12px] leading-snug opacity-80">{p.s}</p>
        </div>
      </a>
    );
  if (p.shape === "terminal")
    return (
      <a href={p.href} target="_blank" rel="noreferrer" className={common} style={style} draggable={false}>
        <div className="h-full overflow-hidden rounded-xl border border-white/15 bg-[#05080d] font-mono shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)]">
          <div className="flex gap-1.5 border-b border-white/10 px-3 py-2">
            {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
              <i key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="p-3.5 text-[12px] leading-relaxed">
            <span style={{ color: p.c }}>$ </span>
            <b className="text-white">{p.t.toLowerCase().replace(/\s+/g, "-")}</b>
            <p className="mt-1.5 text-white/60">{p.s}</p>
          </div>
        </div>
        {inner}
      </a>
    );
  if (p.shape === "circle")
    return (
      <a href={p.href} target="_blank" rel="noreferrer" className={common} style={style} draggable={false}>
        <div className="flex h-full flex-col items-center justify-center rounded-full border-2 p-5 text-center shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)]" style={{ borderColor: p.c, background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${p.c} 35%, #111827), #0b1020)` }}>
          <b className="text-[15px] leading-tight">{p.t}</b>
          <p className="mt-1 text-[10.5px] leading-snug text-white/60">{p.s}</p>
        </div>
      </a>
    );
  if (p.shape === "chip")
    return (
      <a href={p.href} target="_blank" rel="noreferrer" className={common} style={style} draggable={false}>
        <div className="flex h-full items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 backdrop-blur">
          <i className="h-9 w-9 shrink-0 rounded-full" style={{ background: p.c, boxShadow: `0 0 18px ${p.c}` }} />
          <span>
            <b className="block text-[14px] leading-tight">{p.t}</b>
            <span className="text-[11px] leading-tight text-white/55">{p.s}</span>
          </span>
        </div>
      </a>
    );
  return (
    <a href={p.href} target="_blank" rel="noreferrer" className={common} style={style} draggable={false}>
      <div className="h-full rounded-2xl border border-white/12 bg-[linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02))] p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)]">
        <i className="mb-3 block h-1.5 w-10 rounded-full" style={{ background: p.c }} />
        <b className={`block leading-tight ${p.shape === "wide" ? "text-[22px]" : "text-[16px]"}`}>{p.t}</b>
        <p className={`mt-2 leading-snug text-white/65 ${p.shape === "wide" ? "text-[14px]" : "text-[12px]"}`}>{p.s}</p>
      </div>
      {inner}
    </a>
  );
}

export default function ProjectBoard() {
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: -40, y: -20, k: 0.42 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const byId = useMemo(() => Object.fromEntries(ITEMS.map((p) => [p.id, p])), []);
  const centre = (p: P) => [p.x + SIZE[p.shape][0] / 2, p.y + SIZE[p.shape][1] / 2];

  const fit = () => {
    const el = wrap.current;
    if (!el) return;
    // narrow screens fit the height and pan sideways; fitting the width there leaves a thin strip of tiny cards
    if (el.clientWidth < 640) return setView({ x: 8, y: 8, k: (el.clientHeight - 16) / 2060 });
    const k = Math.min(el.clientWidth / 2900, el.clientHeight / 2020);
    setView({ x: (el.clientWidth - 2960 * k) / 2, y: 8, k });
  };
  useEffect(fit, []);
  useEffect(() => {
    const el = wrap.current!;
    const wheel = (e: WheelEvent) => {
      // ctrl/pinch or plain wheel both zoom around the cursor; the case page scrolls past otherwise via shift
      if (e.shiftKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left,
        my = e.clientY - r.top;
      setView((v) => {
        const k = Math.min(1.6, Math.max(0.25, v.k * Math.exp(-e.deltaY * 0.0015)));
        return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <span className="font-mono text-[12px] uppercase tracking-wide text-[var(--accent)]">The board · {ITEMS.length} builds</span>
        <span className="flex gap-2 font-mono text-[11px] uppercase text-white/50">
          <span className="hidden sm:inline">Drag to pan · scroll to zoom</span>
          <span className="sm:hidden">Swipe sideways to pan</span>
          {[
            ["−", 0.8],
            ["+", 1.25],
          ].map(([l, f]) => (
            <button key={l as string} onClick={() => setView((v) => ({ ...v, k: Math.min(1.6, Math.max(0.25, v.k * (f as number))) }))} className="h-6 w-6 rounded-md border border-white/20 text-white hover:bg-white/10">
              {l}
            </button>
          ))}
          <button onClick={fit} className="rounded-md border border-white/20 px-2 text-white hover:bg-white/10">
            Fit
          </button>
        </span>
      </div>
      <div
        ref={wrap}
        className="relative h-[520px] cursor-grab sm:h-[780px] overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0f19] active:cursor-grabbing"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px)", backgroundSize: `${24 * view.k}px ${24 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px`, touchAction: "pan-y" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
          setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
        onClickCapture={(e) => {
          // a drag that ends over a card shouldn't open it
          if (drag.current?.moved) e.preventDefault();
        }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: 2960, height: 2060 }}>
          {CLUSTERS.map((c) => (
            <div key={c.name} className="absolute rounded-[36px] border-2 border-dashed" style={{ left: c.x, top: c.y, width: c.w, height: c.h, borderColor: `color-mix(in srgb, ${c.c} 45%, transparent)`, background: `color-mix(in srgb, ${c.c} 5%, transparent)` }}>
              <span className="absolute -top-5 left-8 rounded-full px-4 py-1.5 text-[18px] font-semibold text-black" style={{ background: c.c }}>
                {c.name}
              </span>
            </div>
          ))}
          <svg className="pointer-events-none absolute left-0 top-0" width={2960} height={2060}>
            <defs>
              <filter id="wire-glow">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            {WIRES.map(([a, b]) => {
              const A = byId[a],
                B = byId[b];
              if (!A || !B) return null;
              const [x1, y1] = centre(A),
                [x2, y2] = centre(B);
              const mx = (x1 + x2) / 2;
              const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
              return (
                <g key={a + b}>
                  <path d={d} stroke={A.c} strokeOpacity={0.35} strokeWidth={6} fill="none" filter="url(#wire-glow)" />
                  <path d={d} stroke={A.c} strokeOpacity={0.8} strokeWidth={2.5} fill="none" strokeDasharray="10 8">
                    <animate attributeName="stroke-dashoffset" from="36" to="0" dur="1.6s" repeatCount="indefinite" />
                  </path>
                  <circle cx={x1} cy={y1} r={6} fill={A.c} />
                  <circle cx={x2} cy={y2} r={6} fill={B.c} />
                </g>
              );
            })}
          </svg>
          {ITEMS.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
