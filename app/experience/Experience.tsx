"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import {
  about,
  archive,
  certifications,
  education,
  experience,
  fieldNotes,
  missions,
  now,
  openSource,
  papers,
  profile,
  projects,
  recognition,
  skills,
  stats,
  timeline,
  type ArchiveItem,
} from "@/lib/achievements";
import { Clock, CountUp, Cursor, Magnetic, Marquee, Reveal, SplitHeading, Tag, TiltCard, glass } from "./ui";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

// Must stay in step with SECTION_COUNT and the shape list in Scene.tsx.
const SECTIONS = ["Origin", "Profile", "Missions", "Research", "Systems", "Archive", "Markets", "Journey", "Contact"];

const KINDS: ("All" | ArchiveItem["kind"])[] = ["All", "Robotics", "AI / ML", "Hardware", "Quant", "Civic", "Full-stack"];

function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return <h2 className={`mb-2 font-mono text-xs uppercase tracking-[0.3em] ${color}`}>{children}</h2>;
}

export default function Experience() {
  const progress = useRef(0);
  const target = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
  const sectionEls = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [boot, setBoot] = useState(0);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("All");

  const shown = useMemo(() => (kind === "All" ? archive : archive.filter((a) => a.kind === kind)), [kind]);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min((t - t0) / 1600, 1);
      setBoot(Math.round(100 * (1 - Math.pow(1 - k, 2))));
      if (k < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setReady(true), 150);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Progress is measured per section (not as a fraction of the whole page),
  // so a long section doesn't drag the swarm's shape out of step with its copy.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    let raf = 0;
    let last = performance.now();
    const loop = (time: number) => {
      lenis?.raf(time);
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;
      // Section i's shape forms while its top edge travels from the bottom of the
      // screen to 35% from the top, so the swarm arrives with the section's copy.
      const vh = window.innerHeight;
      const els = sectionEls.current;
      let p = 0;
      for (let i = 1; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const rel = el.getBoundingClientRect().top;
        p += Math.min(Math.max((vh - rel) / (vh * 0.65), 0), 1);
      }
      target.current = Math.min(Math.max(p, 0), SECTIONS.length - 1);
      // frame-rate independent easing (≈0.08 per frame at 60 fps)
      progress.current += (target.current - progress.current) * (1 - Math.pow(0.92, dt * 60));
      const idx = Math.round(progress.current);
      setActive((a) => (a === idx ? a : idx));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  const go = (i: number) => {
    const el = sectionEls.current[i];
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  // j / k or arrow keys jump between sections
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        go(Math.min(active + 1, SECTIONS.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        go(Math.max(active - 1, 0));
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active]);

  const reg = (i: number) => (el: HTMLElement | null) => {
    sectionEls.current[i] = el;
  };

  return (
    <div className="relative bg-[#05060a] text-white">
      {webgl ? (
        <Scene progress={progress} />
      ) : (
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,#1e293b,#05060a_70%)]" />
      )}
      {/* film grain */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[5] opacity-[0.07] mix-blend-overlay" />
      <Cursor />

      {/* boot overlay */}
      <div
        aria-hidden={ready}
        className={`fixed inset-0 z-50 grid place-items-center bg-[#05060a] font-mono text-xs uppercase tracking-[0.3em] text-sky-200/80 transition-all duration-1000 ${
          ready ? "pointer-events-none opacity-0 [clip-path:inset(0_0_100%_0)]" : "opacity-100 [clip-path:inset(0_0_0_0)]"
        }`}
      >
        <div className="text-center">
          <div className="mb-6 text-6xl font-semibold tabular-nums tracking-tight text-white md:text-8xl">
            {String(boot).padStart(3, "0")}
          </div>
          <div className="mx-auto mb-4 h-px w-48 overflow-hidden bg-white/10">
            <div className="h-full origin-left bg-sky-300" style={{ transform: `scaleX(${boot / 100})` }} />
          </div>
          Initialising swarm · 4,200 units
        </div>
      </div>

      {/* scroll progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-white/5">
        <div ref={bar} className="h-full origin-left bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300" style={{ transform: "scaleX(0)" }} />
      </div>

      {/* HUD */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-[#05060a] via-[#05060a]/80 to-transparent p-5 pb-10 font-mono text-[11px] uppercase tracking-[0.25em] text-white/70 md:p-8">
        <div>
          <button onClick={() => go(0)} className="pointer-events-auto text-white">
            Harsh Pandhe
          </button>
          <div className="text-white/40">
            {profile.location}
            <span className="hidden md:inline"> · <Clock /></span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white">
            {String(active + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
          </div>
          <div className="text-sky-200/70">{SECTIONS[active]}</div>
          <a
            href={`mailto:${profile.email}`}
            className="pointer-events-auto mt-2 hidden items-center gap-2 text-emerald-200/80 hover:text-emerald-100 md:inline-flex"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Open to opportunities
          </a>
        </div>
      </header>

      <nav aria-label="Sections" className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => go(i)} aria-label={`Go to ${s}`} className="group flex items-center gap-3">
            <span className={`block h-px transition-all ${active === i ? "w-8 bg-sky-300" : "w-4 bg-white/30 group-hover:w-6"}`} />
            <span
              className={`font-mono text-[10px] uppercase tracking-widest transition-opacity ${
                active === i ? "text-sky-200 opacity-100" : "opacity-0 group-hover:opacity-70"
              }`}
            >
              {s}
            </span>
          </button>
        ))}
        <span className="mt-4 font-mono text-[9px] uppercase tracking-widest text-white/25">j / k to move</span>
      </nav>

      <main className="relative z-10">
        {/* 0 — ORIGIN */}
        <section ref={reg(0)} className="relative flex min-h-screen flex-col justify-end px-6 pb-16 md:px-24">
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-sky-200/80">
              Pandhe · Autonomous systems · Research
            </p>
            <h1 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">{profile.tagline}</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag>SIH 2025 National Winner</Tag>
              <Tag>ISRO IRoC-U 2026 Finalist</Tag>
              <Tag>Singapore–India Hackathon 2026</Tag>
              <Tag>6 SSRN papers</Tag>
              <Tag>ex-Doppelmayr</Tag>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <button
                  onClick={() => go(4)}
                  className="rounded-full bg-sky-300 px-6 py-3 font-mono text-xs uppercase tracking-widest text-black transition hover:bg-white"
                >
                  See the work
                </button>
              </Magnetic>
              <Magnetic>
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-block rounded-full border border-white/25 px-6 py-3 font-mono text-xs uppercase tracking-widest text-white transition hover:bg-white/10"
                >
                  Get in touch
                </a>
              </Magnetic>
            </div>
            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
              Scroll — the swarm will show you around ↓
            </p>
          </div>
        </section>

        {/* 1 — PROFILE (drone left, copy right) */}
        <section ref={reg(1)} className="flex min-h-[160vh] items-center px-6 py-24 md:justify-end md:px-24">
          <div className="w-full max-w-xl">
            <Eyebrow color="text-cyan-200/80">Profile</Eyebrow>
            <SplitHeading text="Engineer of things that move on their own." className="mb-6 text-2xl font-semibold md:text-4xl" />
            <Reveal>
              <p className="text-lg leading-relaxed text-white/85">{about.intro}</p>
            </Reveal>
            {about.body.map((b, i) => (
              <Reveal key={i} delay={80 * (i + 1)}>
                <p className="mt-4 leading-relaxed text-white/65">{b}</p>
              </Reveal>
            ))}
            <div className="mt-8 grid gap-3">
              {about.principles.map((p, i) => (
                <Reveal key={p.k} delay={60 * i}>
                  <div className={`${glass} flex gap-4 p-4`}>
                    <span className="font-mono text-xs text-cyan-200">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="font-semibold">{p.k}</div>
                      <div className="text-sm text-white/60">{p.v}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <h3 className="mb-4 mt-14 font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/80">Experience</h3>
            <ol className="space-y-4">
              {experience.map((r, i) => (
                <Reveal as="li" key={r.org} delay={50 * i} className={`${glass} p-5`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-lg font-semibold">{r.role}</h4>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">{r.period}</span>
                  </div>
                  <p className="text-sm text-cyan-200">
                    {r.org} <span className="text-white/40">· {r.where}</span>
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-white/65">
                    {r.points.map((pt) => (
                      <li key={pt} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </ol>

            <h3 className="mb-4 mt-14 font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/80">Education</h3>
            <div className="space-y-3">
              {education.map((e) => (
                <Reveal key={e.school} className={`${glass} p-5`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-semibold">{e.school}</h4>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">{e.period}</span>
                  </div>
                  <p className="text-sm text-white/80">{e.degree}</p>
                  <p className="mt-1 text-sm text-white/50">{e.note}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 2 — MISSIONS (globe left, copy right) */}
        <section ref={reg(2)} className="flex min-h-[150vh] items-center px-6 py-24 md:justify-end md:px-24">
          <div className="w-full max-w-xl">
            <Eyebrow color="text-indigo-200/80">Mission log</Eyebrow>
            <SplitHeading text="Wins, selections and finals." className="mb-8 text-2xl font-semibold md:text-4xl" />
            <ol className="space-y-4">
              {missions.map((m, i) => (
                <Reveal as="li" key={m.title} delay={40 * i} className={`${glass} p-5`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-white/50">{m.date}</span>
                    <Tag>{m.tag}</Tag>
                  </div>
                  <h3 className="text-lg font-semibold">{m.title}</h3>
                  <p className="text-sm font-medium text-amber-200">{m.result}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{m.detail}</p>
                </Reveal>
              ))}
            </ol>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className={`${glass} p-4 text-center`}>
                  <div className="text-2xl font-semibold text-sky-200">
                    <CountUp to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-[10px] uppercase leading-tight tracking-wide text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
            <ul className="mt-8 space-y-2 text-sm text-white/55">
              {recognition.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-amber-200">✦</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 — RESEARCH (helix right, copy left) */}
        <section ref={reg(3)} className="flex min-h-[140vh] items-center px-6 py-24 md:px-24">
          <div className="w-full max-w-xl">
            <Eyebrow color="text-violet-200/80">Research · SSRN</Eyebrow>
            <SplitHeading text="Six papers. Half of them are about being wrong, honestly." className="mb-8 text-2xl font-semibold md:text-4xl" />
            <ul className="space-y-3">
              {papers.map((p, i) => (
                <Reveal as="li" key={p.id} delay={40 * i}>
                  <a
                    href={`https://ssrn.com/abstract=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${glass} block p-4 transition hover:border-violet-300/40`}
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/45">
                      <span>
                        {p.date} · {p.area}
                      </span>
                      <span>
                        {p.views} views · {p.downloads} downloads
                      </span>
                    </div>
                    <span className="text-sm font-medium leading-snug hover:text-violet-200">{p.title} ↗</span>
                  </a>
                </Reveal>
              ))}
            </ul>
            <Reveal className={`${glass} mt-6 p-4 text-sm text-white/60`}>
              Also: <span className="text-white/85">“Collaborative Real-Time Code”</span>, IRJMETS (Jan 2024), and the MARS
              conference paper on safe, scalable multi-agent RL for cooperative coverage with control barrier functions.
            </Reveal>
          </div>
        </section>

        {/* 4 — SYSTEMS (ropeway above, copy below) */}
        <section ref={reg(4)} className="flex min-h-[150vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full">
            <Eyebrow color="text-amber-200/80">Flagship systems</Eyebrow>
            <SplitHeading text="Built to be validated, not just demoed." className="mb-8 max-w-2xl text-2xl font-semibold md:text-4xl" />
            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((p, i) => {
                const body = (
                  <div className="relative p-6">
                    <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {p.href && <span className="text-amber-200/80">Open ↗</span>}
                    </div>
                    <h3 className="text-2xl font-semibold">{p.name}</h3>
                    <p className="mt-2 text-sm text-white/80">{p.line}</p>
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-amber-200/80">{p.stack}</p>
                    <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/55">{p.proof}</p>
                  </div>
                );
                return (
                  <Reveal key={p.name} delay={60 * (i % 3)}>
                    <TiltCard className={`${glass} hover:border-amber-200/40`}>
                      {p.href ? (
                        <a href={p.href} target="_blank" rel="noreferrer" className="block h-full">
                          {body}
                        </a>
                      ) : (
                        body
                      )}
                    </TiltCard>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5 — ARCHIVE (lattice above, filterable list below) */}
        <section ref={reg(5)} className="flex min-h-[170vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full">
            <Eyebrow color="text-rose-200/80">Archive · {archive.length} builds</Eyebrow>
            <SplitHeading text="Everything else I've shipped." className="mb-6 text-2xl font-semibold md:text-4xl" />
            <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter projects">
              {KINDS.map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                    kind === k ? "border-rose-200 bg-rose-200 text-black" : "border-white/15 text-white/60 hover:border-white/40"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <ul className={`${glass} divide-y divide-white/10 overflow-hidden`}>
              {shown.map((a) => {
                const row = (
                  <div className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 gap-y-1 px-5 py-4 transition group-hover:bg-white/[0.04] md:grid-cols-[3.5rem_14rem_1fr_7rem]">
                    <span className="font-mono text-[11px] text-white/40">{a.year}</span>
                    <span className="font-semibold group-hover:text-rose-200">
                      {a.name} {a.href && <span className="text-rose-200/70">↗</span>}
                    </span>
                    <span className="col-start-2 text-sm text-white/60 md:col-start-auto">{a.line}</span>
                    <span className="col-start-2 font-mono text-[10px] uppercase tracking-widest text-white/35 md:col-start-auto md:text-right">
                      {a.kind}
                    </span>
                  </div>
                );
                return (
                  <li key={a.name} className="group">
                    {a.href ? (
                      <a href={a.href} target="_blank" rel="noreferrer">
                        {row}
                      </a>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/35">
              100+ public repositories at{" "}
              <a className="text-white/70 hover:text-white" href={profile.links.github} target="_blank" rel="noreferrer">
                github.com/harsh-pandhe ↗
              </a>{" "}
              · Open-source PRs:{" "}
              {openSource.map((o, i) => (
                <span key={o.repo}>
                  <a className="text-white/70 hover:text-white" href={o.href} target="_blank" rel="noreferrer">
                    {o.repo} {o.pr}
                  </a>
                  {i < openSource.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* 6 — MARKETS (chart above) */}
        <section ref={reg(6)} className="flex min-h-[130vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full max-w-4xl">
            <Eyebrow color="text-emerald-200/80">Markets</Eyebrow>
            <SplitHeading text="The strategy that survived ten attempts to kill it." className="mb-4 text-2xl font-semibold md:text-4xl" />
            <Reveal>
              <p className="max-w-2xl text-white/70">
                AlgoTrade is a research OS for NSE equities. Ten popular upgrades — HRP, sector caps, XGBoost, smallcaps,
                GDELT sentiment — were tested walk-forward and rejected. What shipped is plain 12-1 volatility-adjusted
                momentum, then 60 unattended paper-trading sessions before any capital.
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { v: "40.2%", k: "CAGR, 2018–2026 walk-forward" },
                { v: "1.68", k: "Sharpe ratio" },
                { v: "−26.4%", k: "Max drawdown" },
                { v: "10", k: "Hypotheses rejected" },
              ].map((m, i) => (
                <Reveal key={m.k} delay={60 * i} className={`${glass} p-4`}>
                  <div className="text-2xl font-semibold text-emerald-200">{m.v}</div>
                  <div className="mt-1 text-[10px] uppercase leading-tight tracking-wide text-white/50">{m.k}</div>
                </Reveal>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/30">
              Backtested after statutory costs and 10 bps slippage. Past performance is not a promise.
            </p>
          </div>
        </section>

        {/* 7 — JOURNEY (terrain above): timeline, field notes, skills */}
        <section ref={reg(7)} className="flex min-h-[200vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <Eyebrow color="text-orange-200/80">Journey</Eyebrow>
                <SplitHeading text="From a diploma in Solapur to a Grand Finale in Singapore." className="mb-8 text-2xl font-semibold md:text-3xl" />
                <ol className="space-y-5 border-l border-white/15 pl-6">
                  {timeline.map((t, i) => (
                    <Reveal as="li" key={t.year} delay={50 * i} className="relative">
                      <span className="absolute -left-[29px] top-2 h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_12px_2px_rgba(253,186,116,0.6)]" />
                      <span className="font-mono text-xs uppercase tracking-widest text-orange-200">{t.year}</span>
                      <p className="text-white/75">{t.text}</p>
                    </Reveal>
                  ))}
                </ol>
                <Reveal className={`${glass} mt-8 p-5`}>
                  <span className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                    {now.label}
                  </span>
                  <p className="text-sm text-white/75">{now.text}</p>
                </Reveal>
              </div>

              <div>
                <Eyebrow color="text-orange-200/80">Field notes</Eyebrow>
                <SplitHeading text="Things I learned by breaking them." className="mb-8 text-2xl font-semibold md:text-3xl" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {fieldNotes.map((n, i) => (
                    <Reveal key={n.title} delay={40 * (i % 2)} className={`${glass} p-4`}>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-orange-200/80">{n.tag}</span>
                      <h4 className="mt-1 font-semibold">{n.title}</h4>
                      <p className="mt-1 text-sm text-white/55">{n.body}</p>
                    </Reveal>
                  ))}
                </div>
                <a
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
                >
                  More in 161 posts on LinkedIn ↗
                </a>
              </div>
            </div>

            <div className="mt-20">
              <Eyebrow color="text-orange-200/80">Toolbox</Eyebrow>
              <div className="grid gap-4 md:grid-cols-5">
                {skills.map((s, i) => (
                  <Reveal key={s.group} delay={50 * i} className={`${glass} p-4`}>
                    <h4 className="mb-3 text-sm font-semibold">{s.group}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {s.items.map((it) => (
                        <span key={it} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/65">
                          {it}
                        </span>
                      ))}
                    </div>
                  </Reveal>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">Certifications</h4>
                <p className="text-sm text-white/55">{certifications.join(" · ")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 8 — CONTACT (rings left) */}
        <section ref={reg(8)} className="flex min-h-screen flex-col justify-center px-6 py-24 md:px-24">
          <Marquee
            items={["ROS 2", "PX4", "FAST-LIO", "MAPPO", "CBF", "Next.js", "FastAPI", "Teensy 4.1", "STM32H7", "Walk-forward", "KiCad", "TypeScript"]}
          />
          <div className="mt-10 flex md:justify-end">
            <div className="max-w-lg">
              <Eyebrow color="text-fuchsia-200/80">Contact</Eyebrow>
              <SplitHeading text="Let's build something that flies." className="mb-4 text-4xl font-semibold md:text-6xl" />
              <p className="mb-8 text-white/60">
                Open to robotics, autonomy and research-engineering roles, collaborations and hard problems. I reply to every
                email.
              </p>
              <Magnetic>
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-block rounded-full border border-fuchsia-200/40 px-7 py-4 font-mono text-xs uppercase tracking-widest text-fuchsia-100 transition hover:bg-fuchsia-200 hover:text-black"
                >
                  {profile.email}
                </a>
              </Magnetic>
              <div className="mt-8 grid grid-cols-2 gap-3 font-mono text-[11px] uppercase tracking-widest sm:grid-cols-4">
                {[
                  ["GitHub", profile.links.github],
                  ["LinkedIn", profile.links.linkedin],
                  ["SSRN", profile.links.ssrn],
                  ["X", profile.links.x],
                ].map(([k, href]) => (
                  <a
                    key={k}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${glass} px-4 py-3 text-center text-white/70 transition hover:border-fuchsia-200/40 hover:text-white`}
                  >
                    {k} ↗
                  </a>
                ))}
              </div>
              <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                © 2026 Harsh Pandhe · Built with Next.js, React Three Fiber and 4,200 particles
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
