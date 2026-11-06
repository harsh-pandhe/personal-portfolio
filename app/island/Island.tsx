"use client";

import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import HillSign from "./HillSign";
import Statue from "./Statue";
import PalmBeach, { Surf } from "./Beach";
import { Birds, Clouds, Flowers, Grass, Lights, Mountains, Nature, Sea, Ships, Shore, SkyDome, Terrain, Trees } from "./Env";
import Landmarks from "./Landmarks";
import Decor from "./Decor";
import Paths from "./Paths";
import Extras from "./Extras";
import { CameraRig, Dust, MEDALS, Medals, Player, TargetMarker, Teammates } from "./Actors";
import { Fireworks, LaunchDeck, LightShow, Searchlights } from "./Show";
import People from "./People";
import { Skyline, Traffic } from "./City";
import { JourneyPlaza, Singapore, SingaporeCorner } from "./Plaza";
import { Rain, WeatherController } from "./Weather";
import { endGala, GalaOverlay, startGala, startStory, StoryOverlay } from "./Story";
import { setMusic, setSound, sfx } from "./audio";
import { getUI, setUI, travel, TOUR, useUI, world } from "./store";
import { DEVICE, useDevice } from "./device";
import TouchControls from "./TouchControls";
import { Help, Minimap, Settings, SoundEffects, Toast } from "./Hud";
import CaseStudy from "./CaseStudy";
import { zoneById, ZONES } from "./zones";
import { profile } from "@/lib/achievements";

/* ---------------- 3D scene ---------------- */
/** Build every shader under this group off the main thread (KHR_parallel_shader_compile) before it
 *  is drawn, so mounting it never freezes a frame. */
function Warm({ children, onReady }: { children: React.ReactNode; onReady?: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const { gl, camera, scene } = useThree();
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    let live = true;
    // compile while visible (compile skips hidden objects), then hide until the programs are linked
    g.visible = true;
    const p = gl.compileAsync(g, camera, scene);
    g.visible = false;
    p.catch(() => undefined).then(() => {
      if (!live) return;
      setReady(true);
      onReady?.();
    });
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group ref={ref} visible={ready}>
      {children}
    </group>
  );
}

/** Mount children once the loader is gone, `step` idle slots later (~350 ms apart). */
function Deferred({ step, children }: { step: number; children: React.ReactNode }) {
  const loaded = useUI().loaded;
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!loaded || on) return;
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const t = setTimeout(() => (ric ? ric(() => setOn(true), { timeout: 1200 }) : setOn(true)), 250 + step * 350);
    return () => clearTimeout(t);
  }, [loaded, on, step]);
  return on ? (
    <Suspense fallback={null}>
      <Warm>{children}</Warm>
    </Suspense>
  ) : null;
}

/** dev only: expose the three.js scene to the console for measuring and debugging */
function DevHandle() {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __scene: scene, __camera: camera, __gl: gl, __THREE: THREE });
  }, [scene, camera, gl]);
  return null;
}

/** Mounts once every asset of the first screen has loaded (it sits last inside the Suspense);
 *  compiles the whole scene's shaders, then tells the loader it may lift. */
function FirstScreenReady() {
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    let live = true;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => live && setUI({ compiled: true }));
    return () => void (live = false);
  }, [gl, camera, scene]);
  return null;
}

// three render tiers: ?lite (oldest hardware), low (phones, small-memory devices), full
const LITE = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("lite");
const LOW = !LITE && DEVICE.low;
const DPR_MAX = LITE ? 0.75 : LOW ? 1.5 : 1.75;

function Scene() {
  // start crisp, step down if the frame rate drops
  const [dpr, setDpr] = useState(LITE ? 0.75 : LOW ? 1.25 : 1.5);
  // shadows start at 2048 for a quick first screen and go to 4096 once the frame rate allows
  const [sharp, setSharp] = useState(false);
  return (
    <Canvas
      shadows={!LITE && !LOW}
      dpr={dpr}
      camera={{ fov: 40, near: 0.1, far: 1100, position: [95, 80, 120] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0 }}
      onPointerMissed={() => (document.body.style.cursor = "")}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr((d) => Math.max(0.8, d - 0.25));
          setSharp(false);
        }}
        onIncline={() => {
          setDpr((d) => Math.min(DPR_MAX, d + 0.25));
          setSharp(true);
        }}
        flipflops={4}
      />
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={["#cdeeff", 150, 430]} />
      <SkyDome />
      <Lights shadowSize={sharp ? 4096 : 2048} />
      <Environment resolution={LITE ? 64 : LOW ? 128 : 256} frames={1}>
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
        <Shore />
        <Surf />
        <PalmBeach />
        <Landmarks />
        <HillSign />
        <Decor />
        <Paths />
        <Teammates />
        <Medals />
        <Player />
        <TargetMarker />
        <LightShow />
        <LaunchDeck />
        <JourneyPlaza />
        <Statue />
        <FirstScreenReady />
      </Suspense>
      {/* everything decorative mounts after the hero has painted, a piece at a time, so the
          first screen doesn't stutter while ~40k grass blades, crowds and GLB clones compile */}
      <Deferred step={1}>{!LITE && <Grass count={LOW ? 20000 : 56000} />}</Deferred>
      <Deferred step={2}>
        <Flowers />
        <Nature />
        <Clouds />
        <Birds />
      </Deferred>
      <Deferred step={3}>
        <Extras />
        <Dust />
      </Deferred>
      <Deferred step={4}>
        <People />
      </Deferred>
      <Deferred step={5}>
        <Traffic />
        <Ships />
      </Deferred>
      <Deferred step={6}>
        <Skyline />
        <Singapore />
        <SingaporeCorner />
      </Deferred>
      <Deferred step={7}>
        <Fireworks />
        <Searchlights />
        <Rain />
      </Deferred>
      <CameraRig />
      <DevHandle />
    </Canvas>
  );
}

/* ---------------- loader ---------------- */
function Loader() {
  const { progress, active } = useProgress();
  const compiled = useUI().compiled;
  const [gone, setGone] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      // time-based so slow machines don't sit on the loader
      // assets fill the first 90%, compiling the first screen's shaders the last 10%
      setShown((s) => Math.min(s + dt * 90, getUI().compiled ? 100 : Math.max(progress, 5) * 0.9));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  useEffect(() => {
    if (!active && compiled && shown >= 99.5) {
      const t = setTimeout(() => {
        setGone(true);
        setUI({ loaded: true });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [active, compiled, shown]);
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
        <div className="font-display text-[22vw] font-semibold leading-[0.8] tracking-[-0.04em] tabular-nums">{String(Math.floor(shown)).padStart(2, "0")}</div>
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
  film: <path d="M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
  gear: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
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
      className={`group flex w-full items-center gap-3.5 rounded-[18px] px-3 py-2.5 text-left transition-all duration-300 ${
        primary ? "bg-[#22d36b] text-[#06240f] hover:bg-[#2be277]" : active ? "bg-white/[0.12]" : "bg-white/[0.05] hover:bg-white/[0.1]"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${primary ? "bg-[#0b1a10] text-white" : "bg-white/[0.06] text-white/80"}`}>
        <Svg d={icon} />
      </span>
      <span>
        <span className={`block text-[15px] font-semibold tracking-[-0.01em] ${primary ? "" : "text-white"}`}>{title}</span>
        <span className={`block text-[12.5px] ${primary ? "text-[#0b3a1c]/80" : "text-white/50"}`}>{sub}</span>
      </span>
    </button>
  );
}

/** Show/hide the sidebar; remembered per visitor, and exposed as --pl so overlays slide over. */
function usePanelToggle() {
  const ui = useUI();
  const { phone } = useDevice();
  useEffect(() => {
    // on a phone the menu is a sheet that starts closed; on desktop the sidebar remembers its state
    if (DEVICE.phone) return setUI({ panel: false });
    try {
      if (localStorage.getItem("panel") === "0") setUI({ panel: false });
    } catch {}
  }, []);
  useEffect(() => {
    const cinema = ui.story !== null || ui.gala !== null;
    document.documentElement.style.setProperty("--pl", phone ? "0px" : ui.panel && !cinema ? "376px" : "18px");
    if (phone) return;
    try {
      localStorage.setItem("panel", ui.panel ? "1" : "0");
    } catch {}
  }, [ui.panel, ui.story, ui.gala, phone]);
}

function PanelToggle() {
  const ui = useUI();
  const { phone } = useDevice();
  if (phone || ui.story !== null || ui.gala !== null) return null;
  return (
    <button
      onClick={() => setUI({ panel: !ui.panel })}
      title={ui.panel ? "Hide the sidebar ([)" : "Show the sidebar ([)"}
      aria-label={ui.panel ? "Hide the sidebar" : "Show the sidebar"}
      className={`fixed top-[34px] z-[31] grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#1e2126]/90 text-white shadow-lg backdrop-blur transition-all [transition-duration:800ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:bg-[#2a2e35] ${
        ui.panel ? "left-[340px]" : "left-[18px]"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${ui.panel ? "" : "rotate-180"}`}>
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

function Panel() {
  const ui = useUI();
  const { phone, touch } = useDevice();
  usePanelToggle();
  const exploring = ui.mode === "explore";
  const cinema = ui.story !== null || ui.gala !== null || !ui.panel;
  // on a phone a menu choice should close the sheet so the island is visible again
  const pick = (f: () => void) => () => {
    f();
    if (phone) setUI({ panel: false });
  };
  return (
    <>
    {phone && !cinema && <div className="fixed inset-0 z-[29] bg-black/30" onClick={() => setUI({ panel: false })} />}
    <aside
      aria-label="Menu"
      className={
        phone
          ? `fixed inset-x-2 bottom-2 z-30 flex max-h-[82dvh] flex-col overflow-y-auto overscroll-contain rounded-[26px] border border-white/10 bg-[#1e2126]/95 p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform [transition-duration:600ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${
              cinema ? "translate-y-[115%]" : "translate-y-0"
            }`
          : `fixed bottom-[18px] left-[18px] top-[18px] z-30 flex w-[340px] flex-col rounded-[30px] border border-white/10 bg-[#1e2126]/[0.86] p-[18px] text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform [transition-duration:800ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${
              cinema ? "-translate-x-[120%]" : "translate-x-0"
            }`
      }
    >
      {phone && <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-white/25" />}
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
          <MenuItem title="Back to overview" sub="See the whole island" icon={Icon.route} primary onClick={pick(() => setUI({ mode: "intro", open: null }))} />
        ) : (
          <MenuItem title="Enter the island" sub="Walk it at your own pace" icon={Icon.play} primary onClick={pick(() => setUI({ mode: "explore", open: null }))} />
        )}
        <MenuItem title="Watch the story" sub={touch ? "Nine chapters, then the gala" : "Nine chapters, then the gala · M"} icon={Icon.film} onClick={pick(startStory)} />
        <MenuItem title="Guided tour" sub={touch ? "Every place, one after another" : "Every place, one after another · T"} icon={Icon.route} active={ui.mode === "tour"} onClick={pick(() => setUI({ mode: "tour", tour: 0, open: null }))} />
        <MenuItem title="Gala night" sub={touch ? "The drone show, with fireworks" : "The drone show, with fireworks · G"} icon={Icon.spark} onClick={pick(startGala)} />
        <MenuItem title="About Harsh" sub="Work, research and path" icon={Icon.user} onClick={pick(() => setUI({ open: "hq" }))} />
        <MenuItem title="Work with me" sub="Roles, projects or a hello" icon={Icon.case} onClick={pick(() => setUI({ open: "home" }))} />
        {phone && <MenuItem title="Read as a page" sub="Every case study, no 3D" icon={Icon.case} onClick={() => (window.location.href = "/read")} />}
      </div>

      {exploring && (
        <div className="mt-4">
          <div className="mb-2 px-1 font-mono text-[10.5px] uppercase tracking-wider text-white/40">Fast travel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z.id}
                onClick={pick(() => travel(z.id))}
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

      <div className={phone ? "h-3 shrink-0" : "flex-1"} />

      <div className="mb-2 flex items-center justify-between rounded-[16px] bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/75">
        <span className="flex items-center gap-2.5">
          <span className="flex gap-1">
            {MEDALS.map((m, i) => (
              <span
                key={m.name}
                title={ui.medals.includes(i) ? m.name : "Hidden somewhere on the island"}
                className={`h-3 w-3 rounded-full border transition-colors ${ui.medals.includes(i) ? "border-[#f5b301] bg-[#f5b301] shadow-[0_0_8px_#f5b301]" : "border-white/30"}`}
              />
            ))}
          </span>
          {ui.medals.length === MEDALS.length ? "All medals found" : `${ui.medals.length} of ${MEDALS.length} medals found`}
        </span>
        <button onClick={() => setUI({ help: true })} aria-label="How to get around" className="rounded-md border border-white/20 px-1.5 font-mono text-[10px] text-white/80 hover:bg-white/10">
          ?
        </button>
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() => setUI({ night: !ui.night, timeMode: "manual" })}
          className="flex items-center justify-between rounded-[16px] bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/75 transition hover:bg-white/10"
        >
          <span className="flex items-center gap-2.5">
            <Svg d={ui.night ? Icon.moon : Icon.sun} />
            {ui.night ? "Night" : "Day"} {ui.timeMode === "live" ? "· live IST" : ""}
          </span>
          {!touch && <kbd className="rounded-md border border-white/20 px-1.5 font-mono text-[10px]">L</kbd>}
        </button>
        <button onClick={() => setUI({ settings: true })} aria-label="Settings" className="grid w-11 place-items-center rounded-[16px] bg-white/[0.05] text-white/75 transition hover:bg-white/10">
          <Svg d={Icon.gear} />
        </button>
      </div>

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
      <div className={`mt-3 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11.5px] text-white/50 ${touch ? "hidden" : "flex"}`}>
        {[
          ["WASD", "walk"],
          ["E", "open"],
          ["M", "story"],
          ["G", "gala"],
          ["?", "help"],
        ].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd className="rounded-md border border-white/25 px-1.5 py-px font-mono text-[10px] text-white/80">{k}</kbd>
            {v}
          </span>
        ))}
      </div>
    </aside>
    </>
  );
}

/* ---------------- phone: a dock of the four things people do most ---------------- */
function MobileDock() {
  const ui = useUI();
  const { phone } = useDevice();
  if (!phone || ui.story !== null || ui.gala !== null || ui.open || !ui.loaded) return null;
  const exploring = ui.mode === "explore";
  const btn = "flex flex-1 flex-col items-center gap-1 rounded-[18px] py-2 text-[11px] font-semibold transition active:scale-95";
  return (
    <nav aria-label="Quick actions" className="fixed inset-x-2 bottom-2 z-20 flex gap-1.5 rounded-[24px] border border-white/10 bg-[#1e2126]/90 p-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur-xl">
      <button className={`${btn} ${exploring ? "bg-white/10" : "bg-[#22d36b] text-[#06240f]"}`} onClick={() => setUI({ mode: exploring ? "intro" : "explore", open: null })}>
        <Svg d={exploring ? Icon.route : Icon.play} />
        {exploring ? "Overview" : "Explore"}
      </button>
      <button className={`${btn} bg-white/[0.06]`} onClick={startStory}>
        <Svg d={Icon.film} />
        Story
      </button>
      <button className={`${btn} bg-white/[0.06]`} onClick={startGala}>
        <Svg d={Icon.spark} />
        Gala
      </button>
      <button className={`${btn} bg-white/[0.06]`} onClick={() => setUI({ panel: true })} aria-expanded={ui.panel}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menu
      </button>
    </nav>
  );
}


/* ---------------- hero headline (overview) ---------------- */
function Hero() {
  const ui = useUI();
  const { phone } = useDevice();
  const show = ui.mode === "intro" && !ui.open && ui.loaded && ui.story === null && ui.gala === null && !(phone && ui.panel);
  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[62vh] bg-gradient-to-t transition-opacity duration-1000 ${
          ui.night ? "from-[#050816]/85 via-[#050816]/40" : "from-white/85 via-white/40"
        } to-transparent ${
          show ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className={`pointer-events-none fixed bottom-[104px] left-4 right-4 z-20 sm:bottom-[46px] sm:left-[calc(var(--pl,376px)+20px)] sm:right-12 transition-all [transition-duration:1200ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        <div className={`mb-3 text-[13px] font-medium sm:text-[15px] ${ui.night ? "text-white/80" : "text-neutral-800"}`}>Autonomous navigation & multi-agent robotics · SIT Lonavala</div>
        <h1 className={`font-display text-[clamp(46px,8.6vw,168px)] font-semibold leading-[0.86] tracking-[-0.03em] transition-colors duration-1000 ${ui.night ? "text-white" : "text-[#121417]"}`}>
          A portfolio
          <br />
          you can <span className={`font-serif font-normal italic tracking-[-0.03em] ${ui.night ? "text-[#2ee0ff]" : "text-[#2d5bff]"}`}>fly</span> through.
        </h1>
        <p className={`mt-4 max-w-[620px] text-[15px] leading-snug sm:mt-6 sm:text-[18px] ${ui.night ? "text-white/70" : "text-neutral-700"}`}>
          I build drones that navigate without GPS, robot swarms that cover ground safely, and research that reports what didn&rsquo;t work.
        </p>
      </div>
    </>
  );
}

/* ---------------- explore HUD ---------------- */
function Prompt() {
  const ui = useUI();
  const { phone, touch } = useDevice();
  if (ui.mode !== "explore" || ui.open) return null;
  const z = ui.near ? zoneById[ui.near] : null;
  return (
    <div className={`fixed z-20 -translate-x-1/2 ${phone ? "left-1/2 top-[136px]" : "pointer-events-none bottom-8 left-[calc(50%+170px)]"}`}>
      <button
        onClick={() => z && setUI({ open: z.id })}
        tabIndex={z ? 0 : -1}
        className={`flex items-center gap-3 whitespace-nowrap rounded-full bg-[#1e2126]/90 py-2 pl-2 pr-5 text-white shadow-2xl backdrop-blur transition-all duration-500 ${z ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      >
        {touch ? (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-black">↗</span>
        ) : (
          <kbd className="grid h-8 w-8 place-items-center rounded-full bg-white font-mono text-sm font-bold text-black">E</kbd>
        )}
        <span className="text-[14px]">
          <b className="font-semibold">{touch ? `Open ${z?.name ?? ""}` : z?.name}</b> <span className="hidden text-white/55 sm:inline">· {z?.team}</span>
        </span>
      </button>
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
      className={`fixed inset-x-2 bottom-2 z-20 rounded-[24px] border border-white/60 bg-white/85 p-5 sm:inset-x-auto sm:bottom-[18px] sm:left-[var(--pl,376px)] sm:w-[min(520px,calc(100vw-var(--pl,376px)-18px))] sm:rounded-[28px] sm:p-6 text-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${
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
      <h2 className="mt-3 font-display text-[30px] font-semibold leading-[0.95] tracking-[-0.035em] sm:text-[40px]">{z.name}</h2>
      <p className="mt-2 text-[16px] font-medium leading-snug tracking-[-0.02em] text-neutral-800 sm:text-[18px]">{z.headline}</p>
      <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-neutral-600 sm:line-clamp-none">{z.blurb}</p>
      <div className="mt-5 flex items-center gap-2">
        <button onClick={() => setUI({ tour: (ui.tour - 1 + TOUR.length) % TOUR.length })} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] font-medium hover:bg-neutral-100">
          ← Prev
        </button>
        <button onClick={() => setUI({ tour: (ui.tour + 1) % TOUR.length })} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] font-medium hover:bg-neutral-100">
          Next →
        </button>
        <button onClick={() => setUI({ open: z.id })} className="ml-auto rounded-full bg-[#121417] px-5 py-2 text-[13px] font-semibold text-white hover:bg-black">
          Open<span className="hidden sm:inline"> {z.name}</span> ↗
        </button>
        <button onClick={() => setUI({ mode: "intro" })} aria-label="End the tour" className="rounded-full border border-neutral-300 px-3 py-2 text-[13px] hover:bg-neutral-100 sm:hidden">
          ✕
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

/* ---------------- top-right: contact pill ---------------- */
function Corner() {
  const ui = useUI();
  const w = ui.weather;
  const hide = ui.open || ui.story !== null || ui.gala !== null;
  return (
    <div className={`fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-20 flex items-center gap-2 sm:right-[18px] sm:top-[18px] transition-opacity duration-500 ${hide ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <button
        onClick={() => setUI({ settings: true })}
        title="Live weather in Navi Mumbai"
        className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[13px] font-medium text-neutral-900 shadow-lg backdrop-blur hover:bg-white sm:px-4"
      >
        <span>{w ? w.icon : "📍"}</span>
        <span className="hidden sm:inline">Navi Mumbai{w ? ` · ${w.temp}°C ${w.label}` : ""}</span>
        <span className="sm:hidden">{w ? `${w.temp}°` : "NMB"}</span>
        <span className="hidden font-mono text-[11px] text-neutral-500 md:inline">
          <Clock />
        </span>
      </button>
      <button
        onClick={() => setUI({ sound: !ui.sound })}
        aria-label={ui.sound ? "Mute sound" : "Turn sound on"}
        className={`grid h-9 w-9 place-items-center rounded-full shadow-lg backdrop-blur transition ${ui.sound ? "bg-[#121417] text-white" : "bg-white/80 text-neutral-900 hover:bg-white"}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {ui.sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
        </svg>
      </button>
      <a href={`mailto:${profile.email}`} className="rounded-full bg-[#121417] px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:bg-black">
        Say hello
      </a>
    </div>
  );
}

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()) + " IST");
    f();
    const i = setInterval(f, 30000);
    return () => clearInterval(i);
  }, []);
  return <>{t}</>;
}

/* ---------------- root ---------------- */
export default function Island() {
  // no WebGL: send visitors to the plain reading page instead of a blank canvas
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) window.location.replace("/read");
    } catch {
      window.location.replace("/read");
    }
  }, []);
  // dev only: a handle for driving the island from the console
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __island: { world, travel, setUI, getUI } });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const ui = getUI();
      const k = e.key.toLowerCase();
      if (k === "?" || (k === "/" && e.shiftKey)) setUI({ help: !ui.help });
      else if (k === "escape") {
        if (ui.settings) setUI({ settings: false });
        else if (ui.story !== null) setUI({ story: null });
        else if (ui.gala !== null) endGala();
        else if (ui.help) setUI({ help: false });
        else if (ui.open) setUI({ open: null });
        else if (ui.mode !== "intro") setUI({ mode: "intro" });
      } else if (k === "e" && ui.mode === "explore" && ui.near) setUI({ open: ui.open ? null : ui.near });
      else if (ui.story !== null || ui.gala !== null) return; // cinema: only Esc and the on-screen buttons
      else if (k === "[") setUI({ panel: !ui.panel });
      else if (k === "l") setUI({ night: !ui.night, timeMode: "manual" });
      else if (k === "m") startStory();
      else if (k === "g") startGala();
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
      <PanelToggle />
      <MobileDock />
      <TouchControls />
      <Prompt />
      <TourCard />
      <Corner />
      <CaseStudy />
      <Minimap />
      <Toast />
      <Help />
      <StoryOverlay />
      <GalaOverlay />
      <Settings />
      <WeatherController />
      <SoundEffects />
      <Loader />
    </div>
  );
}
