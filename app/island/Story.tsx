"use client";

import { useEffect, useRef, useState } from "react";
import { getUI, setUI, toast, useUI, world } from "./store";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { heightAt } from "./terrain";
import { GALA_CAM, GALA_STEPS } from "./Show";
import { sfx } from "./audio";

type Chapter = { zone: ZoneId | null; kicker: string; title: string; lines: string[]; dist?: number; height?: number; swing?: number };

// The story, in order. Every line is drawn from research/ and lib/achievements.ts.
export const CHAPTERS: Chapter[] = [
  {
    zone: null,
    kicker: "Prologue",
    title: "Mission Island",
    lines: ["Navi Mumbai, 2026.", "Every building on this island is something one engineer built, won or wrote down."],
  },
  {
    zone: "hq",
    kicker: "Chapter 1",
    title: "Solapur to Lonavala",
    lines: ["It starts with a diploma in Computer Engineering in Solapur — and a General Secretary's badge.", "Then a B.Tech at SIT Lonavala, and a first paper on real-time collaborative code."],
    dist: 24,
    height: 12,
  },
  {
    zone: "arena",
    kicker: "Chapter 2",
    title: "Zero hopes",
    lines: ["A hardware idea gets rejected. Over Diwali, a software problem called Telhan Sathi turns up instead.", "December 2025: 10,000+ teams. Team Algo Sapiens wins the Smart India Hackathon."],
    swing: 0.5,
  },
  {
    zone: "morpheus",
    kicker: "Chapter 3",
    title: "Running the show",
    lines: ["Head of Web, Cybersecurity & Blockchain at IIC-SIT.", "He builds Project Morpheus — a national hackathon, its platform and its hostel allocator — from scratch."],
  },
  {
    zone: "swarm",
    kicker: "Chapter 4",
    title: "Robots",
    lines: ["A maze-solving neural net on a 600 MHz Teensy: 1st Runner-Up at RoboRashtra.", "Then swarms: robots that cover ground, with a safety filter that keeps them apart."],
    swing: -0.4,
  },
  {
    zone: "marsyard",
    kicker: "Chapter 5",
    title: "No GPS on Mars",
    lines: ["ISRO's robotics challenge: a drone that has to know where it is without satellites.", "LiDAR, an IMU, careful frame maths — and a finalist's place in IRoC-U 2026."],
    height: 9,
  },
  {
    zone: "ropeway",
    kicker: "Chapter 6",
    title: "On the ropes",
    lines: ["Six months at Doppelmayr, the Austrian ropeway company.", "RopeIQ: two coordinates in, a permit-grade alignment out — checked against 12 real installations."],
    dist: 32,
  },
  {
    zone: "trading",
    kicker: "Chapter 7",
    title: "Being wrong, honestly",
    lines: ["A trading system built to falsify its own ideas: ten upgrades tested, ten rejected.", "Six SSRN papers — and half of them are about what didn't work."],
  },
  {
    zone: "home",
    kicker: "Epilogue",
    title: "Next stop: Singapore",
    lines: ["Selected for the Singapore–India Hackathon Grand Finale, 15–17 November 2026.", "But first, the island throws a party."],
  },
];

const CH_SECONDS = 9;

function shotFor(c: Chapter, t: number): { pos: [number, number, number]; look: [number, number, number] } {
  if (!c.zone) {
    const a = 0.9 + t * 0.05;
    return { pos: [Math.sin(a) * 120, 92, Math.cos(a) * 120], look: [0, -8, 0] };
  }
  const z = zoneById[c.zone];
  const [x, zz] = zonePos(z);
  const out = z.radius ? { x: x / z.radius, z: zz / z.radius } : { x: 0.35, z: 0.94 };
  const swing = (c.swing ?? 0.25) + t * 0.035; // a slow dolly around the subject
  const ox = out.x * Math.cos(swing) - out.z * Math.sin(swing);
  const oz = out.x * Math.sin(swing) + out.z * Math.cos(swing);
  const d = c.dist ?? 21;
  const y = heightAt(x, zz);
  return { pos: [x - ox * d, y + (c.height ?? 8), zz - oz * d], look: [x, y + 2.5, zz] };
}

/** Typewriter for subtitle lines. */
function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    let iv: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      iv = setInterval(() => {
        i += 2;
        setN(i);
        if (i >= text.length && iv) clearInterval(iv);
      }, 22);
    }, delay);
    return () => {
      clearTimeout(start);
      if (iv) clearInterval(iv);
    };
  }, [text, delay]);
  return (
    <span>
      {text.slice(0, n)}
      <span className="opacity-0">{text.slice(n)}</span>
    </span>
  );
}

export function startStory() {
  sfx("chapter");
  world.target = null;
  setUI({ story: 0, open: null, mode: "intro", night: false, gala: null });
}

export function startGala() {
  world.gala = 1;
  world.shot = GALA_CAM;
  setUI({ story: null, gala: 0, open: null, night: true, mode: "intro" });
}

function endGala() {
  world.gala = 0;
  world.shot = null;
  setUI({ gala: null });
  toast("Thanks for watching the show", "Press Enter to walk the island, or T for the tour.");
}

/** Letterboxed, subtitled chapters with slow camera moves. Ends in the gala. */
export function StoryOverlay() {
  const ui = useUI();
  const idx = ui.story;
  const t0 = useRef(performance.now());
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (idx === null) return;
    t0.current = performance.now();
    if (idx > 0) sfx("chapter");
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - t0.current) / 1000;
      world.shot = shotFor(CHAPTERS[idx], t);
      setProgress(Math.min(t / CH_SECONDS, 1));
      if (t >= CH_SECONDS) {
        if (idx < CHAPTERS.length - 1) setUI({ story: idx + 1 });
        else startGala();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx]);
  useEffect(() => {
    if (idx === null && getUI().gala === null) world.shot = null;
  }, [idx]);
  const on = idx !== null;
  const c = CHAPTERS[idx ?? 0];
  return (
    <div className={`pointer-events-none fixed inset-0 z-[45] transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`}>
      {/* letterbox */}
      <div className={`absolute inset-x-0 top-0 bg-black transition-[height] duration-1000 ${on ? "h-[11vh]" : "h-0"}`} />
      <div className={`absolute inset-x-0 bottom-0 bg-black transition-[height] duration-1000 ${on ? "h-[17vh]" : "h-0"}`} />
      {on && (
        <>
          <div key={`t${idx}`} className="absolute left-16 top-[16vh] animate-[rise_1s_cubic-bezier(.16,1,.3,1)_both] text-white [text-shadow:0_4px_30px_rgba(0,0,0,.45)]">
            <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-white/75">{c.kicker}</div>
            <div className="mt-2 text-[clamp(48px,6vw,96px)] font-semibold leading-[0.9] tracking-[-0.055em]">{c.title}</div>
          </div>
          <div key={`s${idx}`} className="absolute inset-x-0 bottom-[3.5vh] mx-auto max-w-[920px] px-8 text-center text-[19px] leading-relaxed text-white/90">
            {c.lines.map((l, i) => (
              <p key={i}>
                <Typed text={l} delay={400 + i * 2600} />
              </p>
            ))}
          </div>
          <div className="pointer-events-auto absolute right-8 top-[3.2vh] flex items-center gap-2">
            <span className="mr-2 font-mono text-[11px] uppercase tracking-wider text-white/60">
              {String((idx ?? 0) + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
            </span>
            <button onClick={() => setUI({ story: Math.max(0, (idx ?? 0) - 1) })} className="rounded-full border border-white/30 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">
              ←
            </button>
            <button onClick={() => ((idx ?? 0) < CHAPTERS.length - 1 ? setUI({ story: (idx ?? 0) + 1 }) : startGala())} className="rounded-full border border-white/30 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">
              →
            </button>
            <button onClick={() => startGala()} className="rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black hover:bg-white/85">
              Skip to the gala
            </button>
            <button onClick={() => setUI({ story: null })} className="rounded-full border border-white/30 px-3 py-1 font-mono text-[11px] uppercase text-white/70 hover:bg-white/10">
              Esc
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
            <div className="h-full bg-gradient-to-r from-[#2d5bff] via-[#00d2ff] to-[#12f0c0]" style={{ width: `${(((idx ?? 0) + progress) / CHAPTERS.length) * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

const STEP_SECONDS = 8.5;

/** Captions and pacing for the gala drone show. */
export function GalaOverlay() {
  const ui = useUI();
  const idx = ui.gala;
  useEffect(() => {
    if (idx === null) return;
    const t = setTimeout(() => {
      if (idx < GALA_STEPS.length - 1) setUI({ gala: idx + 1 });
      else endGala();
    }, (idx === 0 ? STEP_SECONDS + 3 : STEP_SECONDS) * 1000);
    return () => clearTimeout(t);
  }, [idx]);
  const on = idx !== null;
  const s = GALA_STEPS[idx ?? 0];
  return (
    <div className={`pointer-events-none fixed inset-0 z-[45] transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-x-0 bottom-0 h-[34vh] bg-gradient-to-t from-black/75 to-transparent" />
      {on && (
        <>
          <div key={idx} className="absolute inset-x-0 bottom-[7vh] animate-[rise_1.2s_cubic-bezier(.16,1,.3,1)_both] text-center text-white">
            <div className="font-mono text-[12px] uppercase tracking-[0.35em] text-white/60">Gala night · formation {String((idx ?? 0) + 1).padStart(2, "0")}</div>
            <div className="mt-3 text-[clamp(40px,5vw,84px)] font-semibold leading-none tracking-[-0.05em]" style={{ textShadow: `0 0 40px ${s.color}88` }}>
              {s.caption}
            </div>
            <div className="mt-3 text-[17px] text-white/75">{s.sub}</div>
          </div>
          <div className="pointer-events-auto absolute right-8 top-8 flex gap-2">
            <button onClick={endGala} className="rounded-full border border-white/30 bg-black/30 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/80 backdrop-blur hover:bg-white/10">
              End show · Esc
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export { endGala };
