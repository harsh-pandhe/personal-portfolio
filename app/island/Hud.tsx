"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { setUI, useUI, world } from "./store";
import { useDevice } from "./device";
import { setMusic, setSound, sfx } from "./audio";
import { zonePos, ZONES } from "./zones";
import { MEDALS } from "./Actors";
import { ISLAND_EDGE, ROAD_R } from "./terrain";

const S = 188; // minimap size in px
const K = (S / 2 - 10) / (ISLAND_EDGE + 4); // world units → px

/** Top-right minimap while exploring. The player arrow moves without React re-renders. */
export function Minimap() {
  const ui = useUI();
  const arrow = useRef<SVGGElement>(null);
  const on = ui.mode === "explore" && !ui.open;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = world.player;
      // north-up map; the arrow points where the robot faces
      if (arrow.current) arrow.current.setAttribute("transform", `translate(${S / 2 + p.x * K} ${S / 2 + p.z * K}) rotate(${(-p.yaw * 180) / Math.PI + 180})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      className={`fixed left-1 top-[6px] z-20 origin-top-left scale-[0.6] rounded-full sm:left-auto sm:right-[18px] sm:top-[72px] sm:origin-top-right sm:scale-100 border border-white/50 bg-white/70 p-1 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 ${
        on ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="block">
        <defs>
          <radialGradient id="mm-sea" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#7fd6ea" />
            <stop offset="100%" stopColor="#3f9fd6" />
          </radialGradient>
        </defs>
        <circle cx={S / 2} cy={S / 2} r={S / 2} fill="url(#mm-sea)" />
        <circle cx={S / 2} cy={S / 2} r={ISLAND_EDGE * K + 3} fill="#efe1b8" />
        <circle cx={S / 2} cy={S / 2} r={ISLAND_EDGE * K - 2} fill="#8fd16b" />
        <circle cx={S / 2} cy={S / 2} r={ROAD_R * K} fill="none" stroke="#f3f5f7" strokeWidth={2.2} />
        {ZONES.filter((z) => z.radius).map((z) => {
          const [x, zz] = zonePos(z);
          return <line key={`r${z.id}`} x1={S / 2} y1={S / 2} x2={S / 2 + x * 0.82 * K} y2={S / 2 + zz * 0.82 * K} stroke="#f3f5f7" strokeWidth={1.6} />;
        })}
        {ZONES.map((z) => {
          const [x, zz] = zonePos(z);
          const near = ui.near === z.id;
          return (
            <g key={z.id} transform={`translate(${S / 2 + x * K} ${S / 2 + zz * K})`}>
              <circle r={near ? 7 : 5} fill={z.accent} stroke="#fff" strokeWidth={2} />
              <text y={-9} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="#121417" opacity={near ? 1 : 0}>
                {z.name}
              </text>
            </g>
          );
        })}
        {MEDALS.map((m, i) => {
          if (ui.medals.includes(i)) return null;
          const [x, z] = m.at();
          return <circle key={m.name} cx={S / 2 + x * K} cy={S / 2 + z * K} r={2.2} fill="#f5b301" opacity={0.35} />;
        })}
        <g ref={arrow}>
          <circle r={7.5} fill="#121417" opacity={0.18} />
          <path d="M0 -7 L5 5 L0 2.5 L-5 5 Z" fill="#121417" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

/** Small notification that slides up from the bottom and leaves on its own. */
export function Toast() {
  const ui = useUI();
  const t = ui.toast;
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => setUI({ toast: null }), 5200);
    return () => clearTimeout(h);
  }, [t]);
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-[64px] z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 transition-all duration-500 sm:left-[calc(50%+170px)] sm:top-[26px] ${
        t ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-[22px] bg-[#121417]/95 py-2 pl-2 pr-5 text-white shadow-2xl backdrop-blur sm:rounded-full sm:pr-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5b301] text-[18px]">★</span>
        <span>
          <span className="block text-[14px] font-semibold tracking-[-0.01em]">{t?.title}</span>
          {t?.body && <span className="block text-[12.5px] text-white/60">{t.body}</span>}
        </span>
      </div>
    </div>
  );
}

const TOUCH: [string, string][] = [
  ["Left thumb", "Walk with the joystick"],
  ["Drag", "Look around"],
  ["Pinch", "Zoom"],
  ["Tap the ground", "Walk to that spot"],
  ["Tap a billboard", "Open that place"],
  ["Menu", "Tour, story, gala, fast travel"],
];
const KEYS: [string, string][] = [
  ["W A S D", "Walk (arrow keys work too)"],
  ["Shift", "Run"],
  ["Space", "Jump"],
  ["F", "Wave"],
  ["Click", "Walk to a spot · open a billboard"],
  ["Drag · Scroll", "Look around · zoom"],
  ["E", "Open the place you're standing at"],
  ["0 – 9", "Fast travel"],
  ["T", "Guided tour (← → to step)"],
  ["M", "Watch the story"],
  ["G", "Gala night: the drone show"],
  ["L", "Day / night"],
  ["O", "Overview"],
  ["Esc", "Close / back"],
];

export function Help() {
  const ui = useUI();
  const { touch } = useDevice();
  return (
    <div
      onClick={() => setUI({ help: false })}
      className={`fixed inset-0 z-[60] grid place-items-center bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${ui.help ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div onClick={(e) => e.stopPropagation()} className={`mx-3 max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-[30px] bg-white p-6 sm:p-8 text-neutral-900 shadow-2xl transition-transform duration-500 ${ui.help ? "scale-100" : "scale-95"}`}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[28px] font-semibold tracking-[-0.05em] sm:text-[36px]">How to get around</h2>
          <button onClick={() => setUI({ help: false })} className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-black">
            Esc
          </button>
        </div>
        <p className="mt-1 text-[14px] text-neutral-500">
          Five gold medals are hidden around the island. Walk into one to collect it. One is on top of the ridge.
        </p>
        <ul className="mt-6 grid grid-cols-1 divide-y divide-neutral-200 border-y border-neutral-200">
          {(touch ? TOUCH : KEYS).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-2.5 text-[14px]">
              <span className="text-neutral-600">{v}</span>
              <kbd className="rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-0.5 font-mono text-[12px]">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- settings sheet ---------------- */
type Saved = { sound: boolean; music: boolean; weatherMode: "live" | "clear" | "monsoon"; timeMode: "manual" | "live" };

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full bg-neutral-100 p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${value === v ? "bg-white text-neutral-900 shadow" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const ui = useUI();
  // restore saved preferences once (sound always starts off: browsers need a click first)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("hp-settings") || "{}") as Partial<Saved>;
      setUI({ music: !!s.music, weatherMode: s.weatherMode ?? "live", timeMode: s.timeMode ?? "manual" });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("hp-settings", JSON.stringify({ music: ui.music, weatherMode: ui.weatherMode, timeMode: ui.timeMode }));
    } catch {}
  }, [ui.music, ui.weatherMode, ui.timeMode]);
  const lite = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("lite");
  const w = ui.weather;
  return (
    <div
      onClick={() => setUI({ settings: false })}
      className={`fixed inset-0 z-[60] grid place-items-center bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${ui.settings ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div onClick={(e) => e.stopPropagation()} className={`mx-3 max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-[30px] bg-white p-6 text-neutral-900 shadow-2xl transition-transform duration-500 sm:p-8 ${ui.settings ? "scale-100" : "scale-95"}`}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[36px] font-semibold tracking-[-0.05em]">Settings</h2>
          <button onClick={() => setUI({ settings: false })} className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-black">
            Esc
          </button>
        </div>
        <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
          <Row label="Sound" hint="Waves, birds, rain and interface sounds">
            <Seg value={ui.sound ? "on" : "off"} options={[["off", "Off"], ["on", "On"]]} onChange={(v) => setUI({ sound: v === "on" })} />
          </Row>
          <Row label="Music" hint="A lo-fi loop; brighter during the gala">
            <Seg value={ui.music ? "on" : "off"} options={[["off", "Off"], ["on", "On"]]} onChange={(v) => setUI({ music: v === "on", sound: v === "on" ? true : ui.sound })} />
          </Row>
          <Row label="Weather" hint={w ? `Navi Mumbai now: ${w.icon} ${w.label}, ${w.temp}°C` : "Live data from Open-Meteo, when it loads"}>
            <Seg value={ui.weatherMode} options={[["live", "Live"], ["clear", "Clear"], ["monsoon", "Monsoon"]]} onChange={(v) => setUI({ weatherMode: v })} />
          </Row>
          <Row label="Time of day" hint="Follow the clock in Navi Mumbai (IST)">
            <Seg value={ui.timeMode} options={[["manual", "Manual"], ["live", "Live IST"]]} onChange={(v) => setUI({ timeMode: v })} />
          </Row>
          <Row label="Quality" hint="Lite drops shadows, grass and resolution">
            <Seg
              value={lite ? "lite" : "high"}
              options={[["high", "High"], ["lite", "Lite"]]}
              onChange={(v) => {
                const u = new URL(window.location.href);
                if (v === "lite") u.searchParams.set("lite", "");
                else u.searchParams.delete("lite");
                window.location.href = u.toString();
              }}
            />
          </Row>
        </div>
        <Link href="/read" className="mt-6 flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3 text-[14px] font-medium hover:bg-neutral-200">
          Read everything as a plain page <span>→</span>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <div className="text-[15px] font-semibold tracking-[-0.01em]">{label}</div>
        <div className="text-[13px] text-neutral-500">{hint}</div>
      </div>
      {children}
    </div>
  );
}

/** Bridges UI state to the audio engine, and plays interface sounds on state changes. */
export function SoundEffects() {
  const ui = useUI();
  const prevOpen = useRef(ui.open);
  const prevMedals = useRef(ui.medals.length);
  useEffect(() => setSound(ui.sound), [ui.sound]);
  useEffect(() => setMusic(ui.music), [ui.music]);
  useEffect(() => {
    if (ui.open && !prevOpen.current) sfx("open");
    else if (!ui.open && prevOpen.current) sfx("close");
    else if (ui.open !== prevOpen.current) sfx("click");
    prevOpen.current = ui.open;
  }, [ui.open]);
  useEffect(() => {
    if (ui.medals.length > prevMedals.current) sfx("medal");
    prevMedals.current = ui.medals.length;
  }, [ui.medals.length]);
  useEffect(() => {
    if (ui.mode === "tour") sfx("click");
  }, [ui.tour, ui.mode]);
  return null;
}
