"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { Clouds, Flowers, Lights, Mountains, Sea, SkyDome, Terrain, Trees } from "./Env";
import Landmarks from "./Landmarks";
import { CameraRig, LightShow, Player } from "./Actors";
import { getUI, setUI, TOUR, useUI, world } from "./store";
import { zoneById, zonePos, ZONES, type Block, type ZoneId } from "./zones";
import { profile } from "@/lib/achievements";

/* ---------------- 3D scene ---------------- */
const LITE = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("lite");

function Scene() {
  return (
    <Canvas
      shadows={!LITE}
      dpr={LITE ? 0.75 : [1, 2]}
      camera={{ fov: 40, near: 0.1, far: 900, position: [70, 60, 90] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0 }}
      onPointerMissed={() => (document.body.style.cursor = "")}
    >
      <fog attach="fog" args={["#cdeeff", 110, 330]} />
      <SkyDome />
      <Lights />
      <Environment resolution={LITE ? 64 : 256} frames={1}>
        <Lightformer intensity={2.2} position={[0, 6, -9]} scale={[14, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-9, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color="#bfe8ff" />
        <Lightformer intensity={1.2} position={[9, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer intensity={0.8} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#86c96b" />
      </Environment>
      <Suspense fallback={null}>
        <Sea />
        <Mountains />
        <Terrain />
        <Trees />
        <Flowers />
        <Clouds />
        <Landmarks />
        <Player />
        <LightShow />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}

/* ---------------- loader ---------------- */
function Loader() {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      // time-based so slow machines don't sit on the loader
      setShown((s) => Math.min(s + dt * 90, progress >= 100 ? 100 : Math.max(progress, 5) * 0.99));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  useEffect(() => {
    if (!active && progress >= 100 && shown >= 99.5) {
      const t = setTimeout(() => {
        setGone(true);
        setUI({ loaded: true });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [active, progress, shown]);
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-between bg-[#0a0a0a] p-10 text-[#f3f3f1] transition-[clip-path] [transition-duration:1100ms] [transition-timing-function:cubic-bezier(.76,0,.24,1)] ${
        gone ? "pointer-events-none [clip-path:inset(0_0_100%_0)]" : "[clip-path:inset(0_0_0_0)]"
      }`}
    >
      <div className="flex justify-between font-mono text-xs uppercase tracking-wider">
        <span>Harsh Pandhe</span>
        <span>Mission Island · 2026</span>
      </div>
      <div>
        <div className="mb-4 font-mono text-xs uppercase tracking-wider text-white/50">Spinning up rotors, waking the swarm…</div>
        <div className="text-[22vw] font-semibold leading-[0.8] tracking-[-0.06em] tabular-nums">{String(Math.floor(shown)).padStart(2, "0")}</div>
      </div>
      <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-[#2d5bff] via-[#00d2ff] to-[#12f0c0]" style={{ width: `${shown}%` }} />
    </div>
  );
}

/* ---------------- left glass panel ---------------- */
const Icon = {
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  route: (
    <path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  ),
  trophy: <path d="M8 4h8v4a4 4 0 0 1-8 0V4Zm0 2H5a3 3 0 0 0 3 3m8-3h3a3 3 0 0 1-3 3M12 12v4m-4 4h8m-6-4h4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
  case: <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.6" fill="none" />,
  sun: <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8L17 7m-10 10-1.4 1.4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
};

function Svg({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      {d}
    </svg>
  );
}

function MenuItem({ title, sub, icon, primary, onClick, active }: { title: string; sub: string; icon: React.ReactNode; primary?: boolean; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-[18px] px-3 py-3 text-left transition-all duration-300 ${
        primary ? "bg-[#22d36b] text-[#06240f] hover:bg-[#2be277]" : active ? "bg-white/[0.12]" : "bg-white/[0.05] hover:bg-white/[0.1]"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${primary ? "bg-[#0b1a10] text-white" : "bg-white/[0.06] text-white/80"}`}>
        <Svg d={icon} />
      </span>
      <span>
        <span className={`block text-[15px] font-semibold tracking-[-0.01em] ${primary ? "" : "text-white"}`}>{title}</span>
        <span className={`block text-[12.5px] ${primary ? "text-[#0b3a1c]/80" : "text-white/50"}`}>{sub}</span>
      </span>
    </button>
  );
}

function Panel() {
  const ui = useUI();
  const exploring = ui.mode === "explore";
  return (
    <aside className="fixed bottom-[18px] left-[18px] top-[18px] z-30 flex w-[340px] flex-col rounded-[30px] border border-white/10 bg-[#1e2126]/[0.86] p-[18px] text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-center gap-3 px-1 pb-4 pt-1">
        <div className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-[conic-gradient(from_200deg,#2d5bff,#00d2ff,#12f0c0,#22d36b,#2d5bff)] p-[2.5px]">
          <div className="grid h-full w-full place-items-center rounded-full bg-[#14171b] text-[17px] font-bold tracking-tight">HP</div>
        </div>
        <div>
          <div className="text-[21px] font-semibold leading-tight tracking-[-0.035em]">{profile.name}</div>
          <div className="text-[13px] text-white/60">Autonomous systems & robotics</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {exploring ? (
          <MenuItem title="Back to overview" sub="See the whole island" icon={Icon.route} primary onClick={() => setUI({ mode: "intro", open: null })} />
        ) : (
          <MenuItem title="Enter the island" sub="Walk it at your own pace" icon={Icon.play} primary onClick={() => setUI({ mode: "explore", open: null })} />
        )}
        <MenuItem title="Guided tour" sub="Every place, one after another" icon={Icon.route} active={ui.mode === "tour"} onClick={() => setUI({ mode: "tour", tour: 0, open: null })} />
        <MenuItem title="Mission log" sub="Wins, finals and selections" icon={Icon.trophy} onClick={() => setUI({ open: "arena" })} />
        <MenuItem title="About Harsh" sub="Work, research and path" icon={Icon.user} onClick={() => setUI({ open: "hq" })} />
        <MenuItem title="Work with me" sub="Roles, projects or a hello" icon={Icon.case} onClick={() => setUI({ open: "home" })} />
      </div>

      {exploring && (
        <div className="mt-4">
          <div className="mb-2 px-1 font-mono text-[10.5px] uppercase tracking-wider text-white/40">Fast travel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => travel(z.id)}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12.5px] transition ${ui.near === z.id ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/70 hover:bg-white/10"}`}
              >
                <span className="font-mono text-[10px] text-white/40">{z.key}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: z.accent }} />
                <span className="truncate">{z.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={() => setUI({ night: !ui.night })}
        className="mb-3 flex items-center justify-between rounded-[16px] bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/75 transition hover:bg-white/10"
      >
        <span className="flex items-center gap-2.5">
          <Svg d={ui.night ? Icon.moon : Icon.sun} />
          {ui.night ? "Night · drone show is on" : "Switch to night · drone show"}
        </span>
        <kbd className="rounded-md border border-white/20 px-1.5 font-mono text-[10px]">L</kbd>
      </button>

      <div className={`grid grid-cols-3 gap-2 ${exploring ? "hidden" : ""}`}>
        {[
          { v: "SIH", k: "2025 national winner, of 10,000+ teams" },
          { v: "6", k: "SSRN papers on robots and markets" },
          { v: "25+", k: "builds, drones to trading systems" },
        ].map((s) => (
          <div key={s.v} className="rounded-[16px] bg-white/[0.06] p-3">
            <div className="text-[26px] font-semibold leading-none tracking-[-0.04em]">{s.v}</div>
            <div className="mt-2 text-[11px] leading-snug text-white/55">{s.k}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11.5px] text-white/50">
        {[
          ["WASD", "walk"],
          ["E", "open"],
          ["T", "tour"],
          ["L", "night"],
          ["O", "overview"],
        ].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd className="rounded-md border border-white/25 px-1.5 py-px font-mono text-[10px] text-white/80">{k}</kbd>
            {v}
          </span>
        ))}
      </div>
    </aside>
  );
}

function travel(id: ZoneId) {
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  // stand on the HQ side of the zone, facing it
  const k = z.radius ? (z.radius - 9) / z.radius : 0;
  world.player.x = z.radius ? x * k : 0;
  world.player.z = z.radius ? zz * k : 10;
  world.player.yaw = Math.atan2(x - world.player.x, zz - world.player.z) || Math.PI;
  world.camYaw = world.player.yaw + Math.PI;
  setUI({ mode: "explore", open: null });
}

/* ---------------- hero headline (overview) ---------------- */
function Hero() {
  const ui = useUI();
  const show = ui.mode === "intro" && !ui.open && ui.loaded;
  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[62vh] bg-gradient-to-t transition-opacity duration-1000 ${
          ui.night ? "from-[#050816]/85 via-[#050816]/40" : "from-white/85 via-white/40"
        } to-transparent ${
          show ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className={`pointer-events-none fixed bottom-[46px] left-[396px] right-12 z-20 transition-all [transition-duration:1200ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        <div className={`mb-3 text-[15px] font-medium ${ui.night ? "text-white/80" : "text-neutral-800"}`}>Autonomous navigation & multi-agent robotics · SIT Lonavala</div>
        <h1 className={`text-[clamp(72px,8.6vw,168px)] font-semibold leading-[0.86] tracking-[-0.065em] transition-colors duration-1000 ${ui.night ? "text-white" : "text-[#121417]"}`}>
          A portfolio
          <br />
          you can <span className={`font-serif font-normal italic tracking-[-0.03em] ${ui.night ? "text-[#2ee0ff]" : "text-[#2d5bff]"}`}>fly</span> through.
        </h1>
        <p className={`mt-6 max-w-[620px] text-[18px] leading-snug ${ui.night ? "text-white/70" : "text-neutral-700"}`}>
          I build drones that navigate without GPS, robot swarms that cover ground safely, and research that reports what didn&rsquo;t work.
        </p>
      </div>
    </>
  );
}

/* ---------------- explore HUD ---------------- */
function Prompt() {
  const ui = useUI();
  if (ui.mode !== "explore" || ui.open) return null;
  const z = ui.near ? zoneById[ui.near] : null;
  return (
    <div className="pointer-events-none fixed bottom-8 left-[calc(50%+170px)] z-20 -translate-x-1/2">
      <div className={`flex items-center gap-3 rounded-full bg-[#1e2126]/90 py-2 pl-2 pr-5 text-white shadow-2xl backdrop-blur transition-all duration-500 ${z ? "opacity-100" : "translate-y-3 opacity-0"}`}>
        <kbd className="grid h-8 w-8 place-items-center rounded-full bg-white font-mono text-sm font-bold text-black">E</kbd>
        <span className="text-[14px]">
          <b className="font-semibold">{z?.name}</b> <span className="text-white/55">· {z?.team}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- guided tour card ---------------- */
function TourCard() {
  const ui = useUI();
  const on = ui.mode === "tour" && !ui.open;
  useEffect(() => {
    if (ui.mode !== "tour" || ui.open) return;
    const t = setTimeout(() => setUI({ tour: (getUI().tour + 1) % TOUR.length }), 9000);
    return () => clearTimeout(t);
  }, [ui.mode, ui.tour, ui.open]);
  const z = zoneById[TOUR[ui.tour]];
  return (
    <div
      className={`fixed bottom-[18px] left-[376px] z-20 w-[520px] rounded-[28px] border border-white/60 bg-white/80 p-6 text-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${
        on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      }`}
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-neutral-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: z.accent }} />
          {z.team}
        </span>
        <span>
          {String(ui.tour + 1).padStart(2, "0")} / {String(TOUR.length).padStart(2, "0")}
        </span>
      </div>
      <h2 className="mt-3 text-[40px] font-semibold leading-[0.95] tracking-[-0.05em]">{z.name}</h2>
      <p className="mt-2 text-[18px] font-medium leading-snug tracking-[-0.02em] text-neutral-800">{z.headline}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">{z.blurb}</p>
      <div className="mt-5 flex items-center gap-2">
        <button onClick={() => setUI({ tour: (ui.tour - 1 + TOUR.length) % TOUR.length })} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] font-medium hover:bg-neutral-100">
          ← Prev
        </button>
        <button onClick={() => setUI({ tour: (ui.tour + 1) % TOUR.length })} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] font-medium hover:bg-neutral-100">
          Next →
        </button>
        <button onClick={() => setUI({ open: z.id })} className="ml-auto rounded-full bg-[#121417] px-5 py-2 text-[13px] font-semibold text-white hover:bg-black">
          Open {z.name} ↗
        </button>
      </div>
      <div className="mt-5 flex gap-1">
        {TOUR.map((id, i) => (
          <button key={id} onClick={() => setUI({ tour: i })} className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
            <span
              key={`${ui.tour}-${i}`}
              className={`block h-full rounded-full ${i < ui.tour ? "w-full bg-neutral-800" : i === ui.tour ? "w-0 animate-[grow_9s_linear_forwards] bg-neutral-800" : "w-0"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- case-study drawer ---------------- */
function BlockView({ b, accent }: { b: Block; accent: string }) {
  if (b.kind === "lead") return <p className="text-[17px] leading-relaxed text-white/75">{b.text}</p>;
  if (b.kind === "stats")
    return (
      <div className="grid grid-cols-2 gap-2">
        {b.items.map((s) => (
          <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[36px] font-semibold leading-none tracking-[-0.05em]" style={{ color: accent }}>
              {s.v}
            </div>
            <div className="mt-2 text-[13px] text-white/55">{s.k}</div>
          </div>
        ))}
      </div>
    );
  if (b.kind === "tags")
    return (
      <div>
        {b.title && <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/40">{b.title}</h4>}
        <div className="flex flex-wrap gap-1.5">
          {b.items.map((t) => (
            <span key={t} className="rounded-full border border-white/15 px-3 py-1 text-[13px] text-white/75">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  if (b.kind === "notes")
    return (
      <div className="grid grid-cols-2 gap-2">
        {b.items.map((n) => (
          <div key={n.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {n.tag && <div className="mb-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: accent }}>{n.tag}</div>}
            <div className="text-[15px] font-semibold tracking-[-0.01em]">{n.t}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-white/55">{n.s}</div>
          </div>
        ))}
      </div>
    );
  return (
    <div>
      {b.title && <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/40">{b.title}</h4>}
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {b.items.map((it) => {
          const body = (
            <div className="group flex items-start justify-between gap-6 py-3.5">
              <div>
                <div className="text-[16px] font-semibold leading-snug tracking-[-0.015em] group-hover:underline">{it.t}</div>
                {it.s && <div className="mt-1 text-[13.5px] leading-relaxed text-white/55">{it.s}</div>}
                {it.meta && <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-white/35">{it.meta}</div>}
              </div>
              {it.href && <span className="mt-0.5 text-white/40 group-hover:text-white">↗</span>}
            </div>
          );
          return (
            <li key={it.t}>
              {it.href ? (
                <a href={it.href} target="_blank" rel="noreferrer">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Drawer() {
  const ui = useUI();
  const [last, setLast] = useState<ZoneId>("hq");
  useEffect(() => {
    if (ui.open) setLast(ui.open);
  }, [ui.open]);
  const z = zoneById[ui.open ?? last];
  const on = !!ui.open;
  return (
    <div
      className={`fixed bottom-[18px] right-[18px] top-[18px] z-40 w-[620px] overflow-hidden rounded-[30px] border border-white/10 bg-[#121417]/[0.9] text-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${
        on ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[110%] opacity-0"
      }`}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${z.accent}, #00d2ff, #12f0c0)` }} />
      <div className="h-full overflow-y-auto px-9 pb-24 pt-7 [scrollbar-width:thin]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: z.accent }}>
            {z.team}
          </span>
          <button onClick={() => setUI({ open: null })} className="rounded-full border border-white/20 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">
            Esc · close
          </button>
        </div>
        <h2 className="mt-6 text-[64px] font-semibold leading-[0.9] tracking-[-0.06em]">{z.name}</h2>
        <p className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.035em] text-white/90">{z.headline}</p>
        <p className="mt-4 text-[15.5px] leading-relaxed text-white/60">{z.blurb}</p>
        <div className="mt-8 flex flex-col gap-8">
          {z.blocks.map((b, i) => (
            <BlockView key={i} b={b} accent={z.accent} />
          ))}
        </div>
        {z.id !== "home" && (
          <button onClick={() => travel(z.id)} className="mt-10 rounded-full bg-[#22d36b] px-6 py-3 text-[14px] font-semibold text-[#06240f] hover:bg-[#2be277]">
            Walk to {z.name} →
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- top-right: contact pill ---------------- */
function Corner() {
  const ui = useUI();
  return (
    <div className={`fixed right-[18px] top-[18px] z-20 flex items-center gap-2 transition-opacity duration-500 ${ui.open ? "opacity-0" : "opacity-100"}`}>
      <a href={profile.links.github} target="_blank" rel="noreferrer" className="rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-neutral-900 shadow-lg backdrop-blur hover:bg-white">
        GitHub ↗
      </a>
      <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-neutral-900 shadow-lg backdrop-blur hover:bg-white">
        LinkedIn ↗
      </a>
      <a href={`mailto:${profile.email}`} className="rounded-full bg-[#121417] px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:bg-black">
        Say hello
      </a>
    </div>
  );
}

/* ---------------- root ---------------- */
export default function Island() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const ui = getUI();
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (ui.open) setUI({ open: null });
        else if (ui.mode !== "intro") setUI({ mode: "intro" });
      } else if (k === "e" && ui.mode === "explore" && ui.near) setUI({ open: ui.open ? null : ui.near });
      else if (k === "l") setUI({ night: !ui.night });
      else if (k === "t") setUI({ mode: "tour", tour: 0, open: null });
      else if (k === "o") setUI({ mode: "intro", open: null });
      else if (k === "enter" && ui.mode === "intro") setUI({ mode: "explore" });
      else if (/^[0-9]$/.test(k)) {
        const z = ZONES.find((zz) => zz.key === k);
        if (z) travel(z.id);
      } else if (ui.mode === "tour" && (k === "arrowright" || k === "arrowleft")) {
        setUI({ tour: (ui.tour + (k === "arrowright" ? 1 : TOUR.length - 1)) % TOUR.length });
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#cdeeff] font-sans">
      <Scene />
      <Hero />
      <Panel />
      <Prompt />
      <TourCard />
      <Corner />
      <Drawer />
      <Loader />
    </div>
  );
}
