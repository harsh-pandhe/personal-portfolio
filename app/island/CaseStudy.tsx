"use client";

import { useEffect, useRef, useState } from "react";
import { papers, profile } from "@/lib/achievements";
import { CASES, PAPER_NOTES, type Section } from "./cases";
import { setUI, travel, useUI } from "./store";
import { zoneById, ZONES, type ZoneId } from "./zones";
import { Gallery, MediaHero } from "./CaseMedia";
import ProjectBoard from "./ProjectBoard";

/* Reveal children as they scroll into the case-study panel. */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { root: el.closest("[data-case-scroll]"), rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] [transition-duration:900ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] ${on ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

/* Big number that counts up when it scrolls into view; keeps any prefix/suffix (₹, %, +, °). */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const m = value.match(/^([^\d−-]*)([−-]?)([\d,]*\.?\d+)(.*)$/);
  const [shown, setShown] = useState(m ? value.replace(m[3], "0") : value);
  useEffect(() => {
    if (!m) return;
    const el = ref.current;
    if (!el) return;
    const target = parseFloat(m[3].replace(/,/g, ""));
    const decimals = (m[3].split(".")[1] || "").length;
    const commas = m[3].includes(",");
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min((t - t0) / 1300, 1);
          const v = target * (1 - Math.pow(1 - k, 3));
          const s = commas ? Math.round(v).toLocaleString("en-IN") : v.toFixed(decimals);
          setShown(`${m[1]}${m[2]}${s}${m[4]}`);
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { root: el.closest("[data-case-scroll]") }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref}>{shown}</span>;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-mono text-[12px] font-normal uppercase tracking-wide text-white/45">{children}</h4>
);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[0.7fr_1.3fr] gap-8 border-t border-white/12 pt-5">
      <Label>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function ContactForm() {
  const intents = ["A full-time role", "An internship", "A research collaboration", "A project or hackathon", "Just saying hi"];
  const [intent, setIntent] = useState(intents[0]);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const href = `mailto:${profile.email}?subject=${encodeURIComponent(`${intent} — from ${name || "your portfolio"}`)}&body=${encodeURIComponent(msg)}`;
  return (
    <div className="rounded-[26px] border border-white/15 bg-[linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]">
      <Label>What brings you here?</Label>
      <div className="mt-3 flex flex-wrap gap-2">
        {intents.map((i) => (
          <button
            key={i}
            onClick={() => setIntent(i)}
            className={`rounded-full border px-4 py-2 text-[14px] transition ${intent === i ? "border-white bg-white text-[#0b1020]" : "border-white/25 text-white/75 hover:border-white/60"}`}
          >
            {i}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="mt-5 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none focus:border-white/50"
      />
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={4}
        placeholder="A line or two about it…"
        className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none focus:border-white/50"
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-[13px] text-white/45">Opens your email app with this filled in.</span>
        <a href={href} className="rounded-full bg-[#22d36b] px-6 py-3 text-[14px] font-semibold text-[#06240f] transition hover:bg-[#2be277]">
          Write to {profile.email} ↗
        </a>
      </div>
    </div>
  );
}

function PaperCards({ area, accent }: { area?: "Quant" | "Robotics"; accent: string }) {
  const list = papers.filter((p) => !area || p.area === area);
  return (
    <div className="grid grid-cols-2 gap-4">
      {list.map((p, i) => {
        const n = PAPER_NOTES[p.id];
        return (
          <Reveal key={p.id} delay={(i % 2) * 90}>
            <a
              href={`https://ssrn.com/abstract=${p.id}`}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col rounded-[22px] border border-white/12 bg-[linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.015))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] transition-transform duration-500 hover:-translate-y-1.5 hover:border-white/30"
            >
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wide">
                <span style={{ color: accent }}>
                  SSRN {p.id} · {p.area}
                </span>
                <span className="text-white/40">{p.date}</span>
              </div>
              <h5 className="mt-4 text-[20px] font-semibold leading-[1.15] tracking-[-0.025em] text-white">{p.title}</h5>
              {n && <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">{n.finding}</p>}
              <div className="mt-auto pt-5">
                {n && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {n.stats.map((s) => (
                      <span key={s} className="rounded-full bg-white/[0.07] px-2.5 py-1 font-mono text-[11px] text-white/80">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[11px] uppercase text-white/45">
                  <span>
                    {p.views} views · {p.downloads} downloads
                  </span>
                  <span className="text-white/70 transition group-hover:translate-x-1 group-hover:text-white">Read ↗</span>
                </div>
              </div>
            </a>
          </Reveal>
        );
      })}
    </div>
  );
}

function SectionView({ s, accent }: { s: Section; accent: string }) {
  switch (s.type) {
    case "board":
      return <ProjectBoard />;
    case "statement":
      return <p className="max-w-[19ch] text-[clamp(40px,5vw,84px)] font-semibold leading-[1.02] tracking-[-0.045em]">{s.text}</p>;
    case "quote":
      return (
        <figure>
          <blockquote className="font-serif text-[clamp(40px,4.6vw,76px)] italic leading-[1.05] tracking-[-0.02em]" style={{ color: accent }}>
            “{s.text}”
          </blockquote>
          <figcaption className="mt-4 font-mono text-[12px] uppercase tracking-wide text-white/45">— {s.who}</figcaption>
        </figure>
      );
    case "text":
      return (
        <Row label={s.label}>
          {s.title && <h3 className="mb-5 max-w-[24ch] text-[clamp(26px,2.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.04em]">{s.title}</h3>}
          <p className="max-w-[60ch] text-[17px] leading-relaxed text-white/80">{s.body}</p>
        </Row>
      );
    case "chips":
      return (
        <Row label={s.label}>
          <div className="flex flex-wrap gap-2">
            {s.items.map((c) => (
              <span key={c} className="rounded-full border border-white/18 bg-white/[0.04] px-3.5 py-1.5 text-[14px] text-white/80">
                {c}
              </span>
            ))}
          </div>
        </Row>
      );
    case "steps":
      return (
        <div>
          <Row label={s.label}>{s.title && <h3 className="max-w-[24ch] text-[clamp(26px,2.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.04em]">{s.title}</h3>}</Row>
          <div className="mt-8 grid grid-cols-1">
            {s.items.map((it, i) => (
              <Reveal key={it.title} delay={i * 50}>
                <div className="group grid grid-cols-[0.7fr_1.3fr] gap-8 border-t border-white/10 py-6 transition-colors hover:bg-white/[0.025]">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[12px]" style={{ color: accent }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h5 className="text-[21px] font-semibold leading-tight tracking-[-0.025em] transition-transform duration-500 group-hover:translate-x-1">{it.title}</h5>
                  </div>
                  <div>
                    {it.body && <p className="max-w-[56ch] text-[16px] leading-relaxed text-white/70">{it.body}</p>}
                    {it.meta && <p className="mt-2 font-mono text-[11.5px] uppercase text-white/40">{it.meta}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      );
    case "links":
      return (
        <Row label={s.label}>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {s.items.map((it) => {
              const body = (
                <div className="group flex items-start justify-between gap-6 py-4">
                  <div>
                    <div className="text-[18px] font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-white" style={{}}>
                      {it.t}
                    </div>
                    {it.s && <div className="mt-1 max-w-[62ch] text-[14.5px] leading-relaxed text-white/60">{it.s}</div>}
                    {it.meta && <div className="mt-1.5 font-mono text-[11px] uppercase text-white/38">{it.meta}</div>}
                  </div>
                  {it.href && <span className="mt-1 text-white/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white">↗</span>}
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
        </Row>
      );
    case "papers":
      return (
        <div>
          <Row label={s.label}>
            <h3 className="max-w-[24ch] text-[clamp(26px,2.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.04em]">What each paper found.</h3>
          </Row>
          <div className="mt-8">
            <PaperCards area={s.area} accent={accent} />
          </div>
        </div>
      );
    case "contact":
      return <ContactForm />;
  }
}

/** The long-form case study for one place; used by the island overlay and by /read. */
export function CaseBody({ id, onNext }: { id: ZoneId; onNext?: (next: ZoneId) => void }) {
  const z = zoneById[id];
  const c = CASES[id];
  const idx = ZONES.findIndex((q) => q.id === id);
  const next = ZONES[(idx + 1) % ZONES.length];
  return (
    <article className="pb-10">
          {/* hero */}
          <section className="px-10 pt-14">
            <h1 className="text-[clamp(64px,9vw,160px)] font-bold uppercase leading-[0.84] tracking-[-0.065em]">
              {c.titleLines.map((l, i) => (
                <span
                  key={l}
                  className="block animate-[rise_.9s_cubic-bezier(.16,1,.3,1)_both] bg-clip-text pb-[0.04em] text-transparent"
                  style={{ animationDelay: `${i * 90}ms`, backgroundImage: `linear-gradient(180deg,#fff 40%, color-mix(in srgb, ${z.accent} 55%, #fff))` }}
                >
                  {l}
                </span>
              ))}
            </h1>
            <div className="mb-10 mt-12 grid grid-cols-4 gap-2.5 font-mono text-[12.5px] uppercase leading-snug">
              {c.meta.map(([k, v], i) => (
                <div
                  key={k}
                  className="animate-[rise_.9s_cubic-bezier(.16,1,.3,1)_both] rounded-2xl border border-white/14 bg-[linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.25)]"
                  style={{ animationDelay: `${200 + i * 70}ms` }}
                >
                  <span className="mb-1.5 block text-white/45">{k}</span>
                  {v}
                </div>
              ))}
            </div>
          </section>

          {/* animated cover */}
          <div className="mx-10 overflow-hidden rounded-[22px] shadow-[0_60px_120px_-40px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.12)] transition-transform duration-700 [transform:perspective(1800px)_rotateX(7deg)] [transform-origin:50%_0] hover:[transform:perspective(1800px)_rotateX(0deg)]">
            <MediaHero id={id} accent={z.accent} />
          </div>

          <Reveal>
            <p className="max-w-[22ch] px-10 pb-16 pt-28 text-[clamp(36px,4.4vw,76px)] font-semibold leading-[1.02] tracking-[-0.045em]">{c.hook}</p>
          </Reveal>

          <Gallery id={id} accent={z.accent} />

          {c.cracked && (
            <Reveal className="mx-10">
              <section className="rounded-[26px] border border-white/12 bg-[linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.01))] p-8">
                <div className="flex items-center justify-between">
                  <Label>{c.cracked.label ?? "How it came together"}</Label>
                  <span className="h-2 w-2 rounded-full" style={{ background: z.accent, boxShadow: `0 0 14px ${z.accent}` }} />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-6">
                  {c.cracked.parts.map(([k, v], i) => (
                    <div key={k} className="relative pl-5">
                      <span className="absolute left-0 top-1 h-[calc(100%-4px)] w-[2px] rounded-full" style={{ background: `linear-gradient(${z.accent}, transparent)` }} />
                      <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: z.accent }}>
                        {String(i + 1).padStart(2, "0")} · {k}
                      </span>
                      <p className="mt-2 text-[16px] leading-relaxed text-white/80">{v}</p>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {c.metrics && (
            <div className="mx-10 mt-6 grid grid-cols-4 gap-3">
              {c.metrics.map((m, i) => (
                <Reveal key={m.label} delay={i * 70}>
                  <div className="h-full rounded-[20px] border border-white/14 bg-[linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.02))] px-5 pb-6 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_30px_50px_-30px_rgba(0,0,0,.8)] transition-transform duration-500 hover:[transform:perspective(800px)_translateY(-6px)_rotateX(8deg)]">
                    <b
                      className="block bg-clip-text text-[clamp(40px,4.4vw,72px)] font-semibold leading-[0.92] tracking-[-0.06em] text-transparent"
                      style={{ backgroundImage: `linear-gradient(180deg,#fff, color-mix(in srgb, ${z.accent} 70%, #fff))` }}
                    >
                      <CountUp value={m.value} />
                    </b>
                    <span className="mt-3 block max-w-[26ch] font-mono text-[11.5px] uppercase text-white/50">{m.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <div className="mt-24 flex flex-col gap-24 px-10">
            {c.sections.map((s, i) => (
              <Reveal key={i}>
                <SectionView s={s} accent={z.accent} />
              </Reveal>
            ))}
          </div>

          {c.end && (
            <section className="mx-10 mt-24 grid grid-cols-3 gap-8 border-t border-white/12 pt-6">
              {c.end.map((g) => (
                <div key={g.title}>
                  <Label>{g.title}</Label>
                  <ul className="mt-3">
                    {g.items.map(([t, href]) => (
                      <li key={t} className="border-b border-white/10 py-2.5 text-[15px]">
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" className="flex justify-between text-white/85 hover:text-white">
                            <span>{t}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-white/55">{t}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {/* next place */}
          <button
            onClick={() => onNext?.(next.id)}
            className="group mx-10 mt-24 flex w-[calc(100%-80px)] items-end justify-between border-t border-white/15 pt-8 text-left"
          >
            <span>
              <span className="block font-mono text-[12px] uppercase text-white/45">Next place</span>
              <b className="mt-2 block text-[clamp(48px,6vw,104px)] font-semibold leading-[0.9] tracking-[-0.06em] transition-colors duration-500 group-hover:text-[var(--accent)]" style={{ ["--accent" as string]: next.accent }}>
                {next.name}
              </b>
            </span>
            <span className="mb-3 text-[48px] transition-transform duration-500 group-hover:translate-x-3">→</span>
          </button>
        </article>
  );
}

export default function CaseStudy() {
  const ui = useUI();
  const [id, setId] = useState<ZoneId>("hq");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ui.open) {
      setId(ui.open);
      scroller.current?.scrollTo({ top: 0 });
    }
  }, [ui.open]);
  const on = !!ui.open;
  const z = zoneById[id];
  // only mount the page while it's open (plus the close animation), so its videos and
  // live demos don't load behind the first screen
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (on) return setMounted(true);
    const t = setTimeout(() => setMounted(false), 750);
    return () => clearTimeout(t);
  }, [on]);

  return (
    <>
      <div
        onClick={() => setUI({ open: null })}
        className={`fixed inset-0 z-[39] bg-[#070b17]/40 backdrop-blur-[3px] transition-opacity duration-500 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        ref={scroller}
        data-case-scroll
        style={{ ["--accent" as string]: z.accent }}
        className={`fixed bottom-[18px] left-[376px] right-[18px] top-[18px] z-40 overflow-y-auto overflow-x-hidden rounded-[30px] border border-white/10 bg-[#0a0f1d]/[0.94] text-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all [transition-duration:700ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] [scrollbar-width:thin] ${
          on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[6%] opacity-0"
        }`}
      >
        {/* sticky bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#070b17]/60 px-10 py-3.5 font-mono text-[12px] uppercase backdrop-blur-xl">
          <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(100deg, ${z.accent}, #00d2ff 60%, #12f0c0)` }} />
          <span className="flex items-center gap-2.5 text-white/55">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: z.accent }} />
            {z.name} · {z.team}
          </span>
          <span className="flex items-center gap-2">
          <button onClick={() => travel(id)} className="rounded-full bg-[#22d36b] px-3.5 py-1.5 font-semibold text-[#06240f] transition hover:bg-[#2be277]">
            Walk there →
          </button>
          <button onClick={() => setUI({ open: null })} className="flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.08] px-3.5 py-1.5 text-white transition hover:bg-white hover:text-[#0b1020]">
            Close <kbd className="rounded border border-current px-1 text-[10px]">Esc</kbd>
          </button>
          </span>
        </div>

        {mounted && <CaseBody key={id} id={id} onNext={(n) => setUI({ open: n })} />}
      </div>
    </>
  );
}
