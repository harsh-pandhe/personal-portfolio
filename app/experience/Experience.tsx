"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { missions, papers, profile, projects, stats, timeline } from "@/lib/achievements";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const SECTIONS = ["Origin", "Missions", "Research", "Systems", "Markets", "Mars", "Contact"];

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setV(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min((t - t0) / 1400, 1);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {v.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

const glass =
  "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_60px_-20px_rgba(125,211,252,0.25)]";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-200/80">
      {children}
    </span>
  );
}

export default function Experience() {
  const progress = useRef(0);
  const target = useRef(0);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    const t = setTimeout(() => setReady(true), 1700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target.current = max > 0 ? (window.scrollY / max) * (SECTIONS.length - 1) : 0;
      progress.current += (target.current - progress.current) * 0.08;
      const idx = Math.round(progress.current);
      setActive((a) => (a === idx ? a : idx));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  const go = (i: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (i / (SECTIONS.length - 1)) * max, behavior: "smooth" });
  };

  return (
    <div className="relative bg-[#05060a] text-white">
      {webgl ? (
        <Scene progress={progress} />
      ) : (
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,#1e293b,#05060a_70%)]" />
      )}

      {/* boot overlay */}
      <div
        aria-hidden={ready}
        className={`fixed inset-0 z-50 grid place-items-center bg-[#05060a] font-mono text-xs uppercase tracking-[0.3em] text-sky-200/80 transition-opacity duration-1000 ${
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="text-center">
          <div className="mb-4 h-px w-48 overflow-hidden bg-white/10">
            <div className="h-full w-full origin-left animate-[boot_1.6s_ease-out_forwards] bg-sky-300" />
          </div>
          Initialising swarm · 4,200 units
        </div>
      </div>

      {/* HUD */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between p-5 font-mono text-[11px] uppercase tracking-[0.25em] text-white/70 md:p-8">
        <div>
          <div className="text-white">Harsh Pandhe</div>
          <div className="text-white/40">{profile.location}</div>
        </div>
        <div className="text-right">
          <div className="text-white">
            {String(active + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
          </div>
          <div className="text-sky-200/70">{SECTIONS[active]}</div>
        </div>
      </header>

      <nav
        aria-label="Sections"
        className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 md:flex"
      >
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => go(i)}
            aria-label={`Go to ${s}`}
            className="group flex items-center gap-3"
          >
            <span
              className={`block h-px transition-all ${
                active === i ? "w-8 bg-sky-300" : "w-4 bg-white/30 group-hover:w-6"
              }`}
            />
            <span
              className={`font-mono text-[10px] uppercase tracking-widest transition-opacity ${
                active === i ? "opacity-100 text-sky-200" : "opacity-0 group-hover:opacity-70"
              }`}
            >
              {s}
            </span>
          </button>
        ))}
      </nav>

      <main className="relative z-10">
        {/* 0 — ORIGIN */}
        <section className="relative flex min-h-screen flex-col justify-end px-6 pb-16 md:px-24">
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-sky-200/80">
              Pandhe · Autonomous systems · Research
            </p>
            <h1 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">{profile.tagline}</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag>SIH 2025 National Winner</Tag>
              <Tag>IRoC-U 2026 Finalist</Tag>
              <Tag>Singapore–India Hackathon</Tag>
              <Tag>6 SSRN papers</Tag>
            </div>
            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
              Scroll — the swarm will show you around ↓
            </p>
          </div>
        </section>

        {/* 1 — MISSIONS (swarm left, copy right) */}
        <section className="flex min-h-[140vh] items-center px-6 py-24 md:justify-end md:px-24">
          <div className="w-full max-w-xl">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-sky-200/80">Mission log</h2>
            <p className="mb-8 text-2xl font-semibold md:text-3xl">Wins, selections and finals.</p>
            <ol className="space-y-4">
              {missions.map((m) => (
                <li key={m.title} className={`${glass} p-5`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-white/50">{m.date}</span>
                    <Tag>{m.tag}</Tag>
                  </div>
                  <h3 className="text-lg font-semibold">{m.title}</h3>
                  <p className="text-sm font-medium text-amber-200">{m.result}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{m.detail}</p>
                </li>
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
          </div>
        </section>

        {/* 2 — RESEARCH (swarm right, copy left) */}
        <section className="flex min-h-[130vh] items-center px-6 py-24 md:px-24">
          <div className="w-full max-w-xl">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-violet-200/80">Research · SSRN</h2>
            <p className="mb-8 text-2xl font-semibold md:text-3xl">
              Six papers. Half of them are about being wrong, honestly.
            </p>
            <ul className="space-y-3">
              {papers.map((p) => (
                <li key={p.id} className={`${glass} p-4`}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/45">
                    <span>
                      {p.date} · {p.area}
                    </span>
                    <span>
                      {p.views} views · {p.downloads} downloads
                    </span>
                  </div>
                  <a
                    href={`https://ssrn.com/abstract=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium leading-snug hover:text-violet-200"
                  >
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 — SYSTEMS (swarm above, copy below) */}
        <section className="flex min-h-[150vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-amber-200/80">Systems</h2>
            <p className="mb-8 max-w-2xl text-2xl font-semibold md:text-3xl">
              Built to be validated, not just demoed.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((p) => {
                const body = (
                  <>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-white/80">{p.line}</p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-200/80">{p.stack}</p>
                    <p className="mt-2 text-sm text-white/55">{p.proof}</p>
                  </>
                );
                return p.href ? (
                  <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className={`${glass} block p-5 transition hover:border-amber-200/40`}>
                    {body}
                  </a>
                ) : (
                  <div key={p.name} className={`${glass} p-5`}>
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4 — MARKETS */}
        <section className="flex min-h-[120vh] items-end px-6 pb-24 md:px-24">
          <div className="max-w-2xl">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">Markets</h2>
            <p className="mb-4 text-2xl font-semibold md:text-3xl">The strategy that survived ten attempts to kill it.</p>
            <p className="text-white/70">
              AlgoTrade is a research OS for NSE equities. Ten popular upgrades — HRP, sector caps, XGBoost, smallcaps,
              GDELT sentiment — were tested walk-forward and rejected. What shipped is plain 12-1 volatility-adjusted
              momentum: 40.2% CAGR, Sharpe 1.68, max drawdown −26.4% after statutory costs and 10 bps slippage, then 60
              unattended paper-trading sessions before any capital.
            </p>
          </div>
        </section>

        {/* 5 — MARS / TIMELINE */}
        <section className="flex min-h-[120vh] items-end px-6 pb-24 md:px-24">
          <div className="w-full max-w-4xl">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-orange-200/80">Timeline</h2>
            <p className="mb-8 text-2xl font-semibold md:text-3xl">From diploma to the Grand Finale.</p>
            <ol className="space-y-3 border-l border-white/15 pl-6">
              {timeline.map((t) => (
                <li key={t.year} className="relative">
                  <span className="absolute -left-[29px] top-2 h-2 w-2 rounded-full bg-orange-300" />
                  <span className="font-mono text-xs uppercase tracking-widest text-orange-200">{t.year}</span>
                  <p className="text-white/75">{t.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6 — CONTACT */}
        <section className="flex min-h-screen items-center px-6 py-24 md:justify-end md:px-24">
          <div className="max-w-md">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">Contact</h2>
            <p className="mb-6 text-3xl font-semibold md:text-4xl">Let&rsquo;s build something that flies.</p>
            <a
              href={`mailto:${profile.email}`}
              className="inline-block rounded-full border border-fuchsia-200/40 px-6 py-3 font-mono text-xs uppercase tracking-widest text-fuchsia-100 transition hover:bg-fuchsia-200/10"
            >
              {profile.email}
            </a>
            <div className="mt-6 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-widest text-white/60">
              <a className="hover:text-white" href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a>
              <a className="hover:text-white" href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="hover:text-white" href={profile.links.ssrn} target="_blank" rel="noreferrer">SSRN</a>
              <a className="hover:text-white" href={profile.links.x} target="_blank" rel="noreferrer">X</a>
            </div>
            <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
              © 2026 Harsh Pandhe
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
