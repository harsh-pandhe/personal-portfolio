"use client";

import { useEffect, useRef, useState } from "react";
import { getUI, setUI, toast, useUI, world } from "./store";
import { zoneById, zonePos, type ZoneId } from "./zones";
import { heightAt, MARS_C } from "./terrain";
import { GALA_CAM, GALA_STEPS } from "./Show";
import { sfx } from "./audio";

type Chapter = { zone: ZoneId | null; kicker: string; title: string; lines: string[]; dist?: number; height?: number; swing?: number; clip?: string; singapore?: boolean };

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
    lines: ["Thirteen years at Presentation Convent, Nerul. Then a diploma in Computer Engineering in Solapur — and a Head Boy's badge.", "Then a B.Tech at SIT Lonavala, on the edge of the Sahyadris."],
    clip: "story-1-campus",
    dist: 34,
    height: 15,
  },
  {
    zone: "arena",
    kicker: "Chapter 2",
    title: "Zero hopes",
    lines: ["A hardware idea gets rejected. Over Diwali, a software problem called Telhan Sathi turns up instead.", "December 2025: 10,000+ teams. Team Algo Sapiens wins the Smart India Hackathon."],
    clip: "arena-trophy",
    swing: 0.5,
    dist: 30,
    height: 10,
  },
  {
    zone: "morpheus",
    kicker: "Chapter 3",
    title: "Running the show",
    lines: ["Head of Web, Cybersecurity & Blockchain at IIC-SIT.", "He builds Project Morpheus — a national hackathon, its platform and its hostel allocator — from scratch."],
    dist: 27,
    height: 9,
  },
  {
    zone: "swarm",
    kicker: "Chapter 4",
    title: "Robots",
    lines: ["A maze-solving neural net on a 600 MHz Teensy: 1st Runner-Up at RoboRashtra.", "Then swarms: robots that cover ground, with a safety filter that keeps them apart."],
    clip: "story-4-builds",
    swing: -0.4,
    dist: 24,
  },
  {
    zone: "marsyard",
    kicker: "Chapter 5",
    title: "No GPS on Mars",
    lines: ["ISRO's robotics challenge: a drone that has to know where it is without satellites.", "LiDAR, an IMU, careful frame maths — and a finalist's place in IRoC-U 2026."],
    clip: "mars-drone",
    height: 10,
    dist: 34,
  },
  {
    zone: "ropeway",
    kicker: "Chapter 6",
    title: "On the ropes",
    lines: ["Six months at Doppelmayr, the Austrian ropeway company.", "RopeIQ: two coordinates in, a permit-grade alignment out — checked against 19 real installations."],
    clip: "ropeway-aerial",
    dist: 42,
    height: 12,
  },
  {
    zone: "trading",
    kicker: "Chapter 7",
    title: "Being wrong, honestly",
    lines: ["A trading system built to falsify its own ideas: ten upgrades tested, ten rejected.", "Six SSRN papers — and half of them are about what didn't work."],
    clip: "story-3-markets",
    dist: 28,
    height: 9,
  },
  {
    zone: "home",
    kicker: "Epilogue",
    title: "Next stop: Singapore",
    lines: ["Selected for the Singapore–India Hackathon Grand Finale, 15–17 November 2026.", "But first, the island throws a party."],
    clip: "story-6-singapore",
    singapore: true,
    dist: 26,
  },
];

const CH_SECONDS = 12;
const SHOT_SECONDS = 3;
const SHOT_NAMES = ["Wide", "Tracking", "Close", "Drone"] as const;

type Shot = { pos: [number, number, number]; look: [number, number, number] };

/** Four cuts per chapter: an establishing wide, a low tracking dolly, a close-up and a drone's-eye descent. */
/** The epilogue looks across the water from the Merlion's quay to Singapore. */
const SG = (() => {
  const q = (95 * Math.PI) / 180,
    s = (128 * Math.PI) / 180;
  return { qx: Math.cos(q) * 105, qz: Math.sin(q) * 105, sx: Math.cos(s) * 200, sz: Math.sin(s) * 200 };
})();
function singaporeShot(k: number, u: number): Shot {
  const { qx, qz, sx, sz } = SG;
  const toward = (f: number, y: number): Shot["pos"] => [qx + (sx - qx) * f, y, qz + (sz - qz) * f];
  if (k === 0) return { pos: [qx - 14 + u * 4, 34 - u * 6, qz - 18], look: [sx, 18, sz] }; // high over the pier
  if (k === 1) return { pos: toward(0.08 + u * 0.22, 3.2), look: [sx, 16, sz] }; // skimming the water
  if (k === 2) return { pos: [qx + 13 - u * 4, 7.5, qz - 11], look: [qx + (sx - qx) * 0.5, 9, qz + (sz - qz) * 0.5] }; // past the Merlion
  return { pos: toward(0.45 + u * 0.12, 22 + u * 10), look: [sx, 10, sz] }; // a drone rising over the bay
}

function shotFor(c: Chapter, t: number): Shot {
  if (c.singapore) return singaporeShot(Math.floor(t / SHOT_SECONDS) % 4, (t % SHOT_SECONDS) / SHOT_SECONDS);
  if (!c.zone) {
    const a = 0.9 + t * 0.05;
    return { pos: [Math.sin(a) * 190, 132, Math.cos(a) * 190], look: [0, -10, 0] };
  }
  const z = zoneById[c.zone];
  // frame the Mars yard on its field, which sits out toward the coast from the zone point
  const [x, zz] = c.zone === "marsyard" ? MARS_C : zonePos(z);
  const y = heightAt(x, zz);
  // never put the camera inside a hill, a hedge or the tree line between zones
  const lift = (p: [number, number, number]): Shot["pos"] => [p[0], Math.max(p[1], heightAt(p[0], p[2]) + 3.5), p[2]];
  const out = z.radius ? { x: x / z.radius, z: zz / z.radius } : { x: 0.35, z: 0.94 };
  const k = Math.floor(t / SHOT_SECONDS) % 4;
  const u = (t % SHOT_SECONDS) / SHOT_SECONDS; // 0..1 inside the shot
  const rot = (a: number) => ({ x: out.x * Math.cos(a) - out.z * Math.sin(a), z: out.x * Math.sin(a) + out.z * Math.cos(a) });
  const d = c.dist ?? 21;
  const base = c.swing ?? 0.25;
  if (k === 0) {
    // wide: high and far, slow push in
    const o = rot(base);
    const dd = d * (1.9 - u * 0.25);
    return { pos: lift([x - o.x * dd, y + (c.height ?? 8) * 2.2, zz - o.z * dd]), look: [x, y + 1, zz] };
  }
  if (k === 1) {
    // tracking: low, sliding sideways across the subject, from inside the plot's open front
    const o = rot(base + 0.5 - u * 0.8);
    return { pos: lift([x - o.x * d * 0.6, y + 4.5, zz - o.z * d * 0.6]), look: [x, y + 3, zz] };
  }
  if (k === 2) {
    // close: tight on the landmark, a gentle arc
    const o = rot(base - 0.5 + u * 0.35);
    return { pos: lift([x - o.x * d * 0.45, y + 5.5, zz - o.z * d * 0.45]), look: [x, y + 3.5, zz] };
  }
  // drone POV: straight-down-ish, descending and turning
  const o = rot(base + u * 0.6);
  return { pos: [x - o.x * 3, y + d * 1.4 - u * 10, zz - o.z * 3], look: [x, y, zz] };
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

/** Letterboxed, subtitled chapters cut between four camera angles. Pause, scrub, speed, captions, film. Ends in the gala. */
export function StoryOverlay() {
  const ui = useUI();
  const idx = ui.story;
  const clock = useRef(0);
  const last = useRef(performance.now());
  const [progress, setProgress] = useState(0);
  const [shot, setShot] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [film, setFilm] = useState(true);
  const [list, setList] = useState(false);
  const [dip, setDip] = useState(0);
  const lastShot = useRef(-1);
  const live = useRef({ paused, speed });
  live.current = { paused, speed };
  const next = () => ((idx ?? 0) < CHAPTERS.length - 1 ? setUI({ story: (idx ?? 0) + 1 }) : startGala());
  const prev = () => setUI({ story: Math.max(0, (idx ?? 0) - 1) });

  useEffect(() => {
    if (idx === null) return;
    clock.current = 0;
    last.current = performance.now();
    if (idx > 0) sfx("chapter");
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      if (!live.current.paused) clock.current += dt * live.current.speed;
      const t = clock.current;
      world.shot = shotFor(CHAPTERS[idx], t);
      setProgress(Math.min(t / CH_SECONDS, 1));
      const sh = Math.floor(t / SHOT_SECONDS) % 4;
      if (sh !== lastShot.current) {
        // a hard cut, hidden by a quick dip to black, instead of the camera swooping between angles
        lastShot.current = sh;
        world.cut = true;
        setDip((d) => d + 1);
      }
      setShot(sh);
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
  useEffect(() => {
    if (idx === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === " ") (e.preventDefault(), setPaused((p) => !p));
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "c") setCaptions((v) => !v);
      else if (e.key.toLowerCase() === "f") setFilm((v) => !v);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);
  const on = idx !== null;
  const c = CHAPTERS[idx ?? 0];
  const btn = "rounded-full border border-white/30 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10";
  return (
    <div className={`pointer-events-none fixed inset-0 z-[45] transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`}>
      {/* the dip between shots, and a soft vignette over the frame */}
      {on && <div key={`dip${dip}`} className="absolute inset-0 animate-[dip_.45s_ease-out_both] bg-black" />}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.35))]" />
      {/* letterbox */}
      <div className={`absolute inset-x-0 top-0 bg-black transition-[height] duration-1000 ${on ? "h-[11vh]" : "h-0"}`} />
      <div className={`absolute inset-x-0 bottom-0 bg-black transition-[height] duration-1000 ${on ? "h-[17vh]" : "h-0"}`} />
      {on && (
        <>
          <div key={`t${idx}`} className="absolute left-4 right-4 top-[14vh] animate-[rise_1s_cubic-bezier(.16,1,.3,1)_both] text-white sm:left-16 sm:right-auto sm:top-[16vh] [text-shadow:0_4px_30px_rgba(0,0,0,.45)]">
            <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-white/75">
              {c.kicker} · <span className="text-white/50">{SHOT_NAMES[shot]} shot</span>
            </div>
            <div className="mt-2 font-display text-[clamp(34px,6vw,96px)] font-semibold leading-[0.9] tracking-[-0.038em]">{c.title}</div>
          </div>
          {/* the chapter's film: a Google Flow clip, picture-in-picture */}
          {film && c.clip && (
            <figure key={`f${idx}`} className="absolute bottom-[21vh] right-3 w-[46vw] animate-[rise_1s_cubic-bezier(.16,1,.3,1)_both] overflow-hidden sm:right-8 sm:w-[min(30vw,420px)] rounded-2xl border border-white/20 shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)]">
              <video src={`/media/video/${c.clip}.mp4`} poster={`/media/video/${c.clip}.jpg`} autoPlay muted loop playsInline className="block aspect-video w-full object-cover" />
              <figcaption className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-wide text-white/75">Animated with Google Flow</figcaption>
            </figure>
          )}
          {captions && (
            <div key={`s${idx}`} className="absolute inset-x-0 bottom-[3vh] mx-auto max-w-[920px] px-4 text-center text-[14px] leading-snug text-white/90 sm:bottom-[3.5vh] sm:px-8 sm:text-[19px] sm:leading-relaxed">
              {c.lines.map((l, i) => (
                <p key={i}>
                  <Typed text={l} delay={400 + i * 2600} />
                </p>
              ))}
            </div>
          )}
          <div className="pointer-events-auto absolute left-2 right-2 top-[max(10px,2.6vh)] flex flex-wrap items-center justify-end gap-1.5 sm:left-auto sm:right-8 sm:top-[3.2vh] sm:gap-2">
            <span className="mr-2 hidden font-mono text-[11px] uppercase tracking-wider text-white/60 sm:inline">
              {String((idx ?? 0) + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
            </span>
            <button onClick={prev} className={btn} title="Previous chapter (←)">
              ←
            </button>
            <button onClick={() => setPaused((p) => !p)} className={btn} title="Pause (Space)">
              {paused ? "▶" : "❚❚"}
            </button>
            <button onClick={next} className={btn} title="Next chapter (→)">
              →
            </button>
            <button onClick={() => setSpeed((s) => (s >= 2 ? 0.5 : s + 0.5))} className={`${btn} hidden font-mono sm:inline-block`} title="Speed">
              {speed}×
            </button>
            <button onClick={() => setCaptions((v) => !v)} className={`${btn} ${captions ? "bg-white/15" : ""}`} title="Captions (C)">
              CC
            </button>
            <button onClick={() => setFilm((v) => !v)} className={`${btn} hidden sm:inline-block ${film ? "bg-white/15" : ""}`} title="Film clips (F)">
              Film
            </button>
            <button onClick={() => setList((v) => !v)} className={btn}>
              Chapters
            </button>
            <button onClick={() => startGala()} className="rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black hover:bg-white/85">
              Skip to the gala
            </button>
            <button onClick={() => setUI({ story: null })} className="rounded-full border border-white/30 px-3 py-1 font-mono text-[11px] uppercase text-white/70 hover:bg-white/10">
              Esc
            </button>
          </div>
          {list && (
            <ol className="pointer-events-auto absolute right-2 top-[9.5vh] w-[min(18rem,calc(100vw-16px))] rounded-2xl sm:right-8 border border-white/15 bg-black/70 p-2 backdrop-blur-xl">
              {CHAPTERS.map((ch, i) => (
                <li key={ch.title}>
                  <button
                    onClick={() => (setUI({ story: i }), setList(false))}
                    className={`flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-white/10 ${i === idx ? "bg-white/10 text-white" : "text-white/70"}`}
                  >
                    <span className="font-mono text-[10px] uppercase text-white/40">{ch.kicker}</span>
                    {ch.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
          {/* chapter scrubber: click a segment to jump */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-[5px] gap-[2px] bg-black">
            {CHAPTERS.map((ch, i) => (
              <button key={ch.title} onClick={() => setUI({ story: i })} className="relative h-full flex-1 bg-white/15 hover:bg-white/30" title={ch.title}>
                <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2d5bff] via-[#00d2ff] to-[#12f0c0]" style={{ width: i < (idx ?? 0) ? "100%" : i === idx ? `${progress * 100}%` : "0%" }} />
              </button>
            ))}
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
            <div className="mt-3 px-4 font-display text-[clamp(32px,5vw,84px)] font-semibold leading-none tracking-[-0.035em]" style={{ textShadow: `0 0 40px ${s.color}88` }}>
              {s.caption}
            </div>
            <div className="mt-3 px-4 text-[14px] text-white/75 sm:text-[17px]">{s.sub}</div>
          </div>
          <div className="pointer-events-auto absolute right-3 top-[max(12px,env(safe-area-inset-top))] flex gap-2 sm:right-8 sm:top-8">
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
