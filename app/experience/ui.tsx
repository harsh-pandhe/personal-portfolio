"use client";

import { useEffect, useRef, useState } from "react";

export const glass =
  "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_60px_-20px_rgba(125,211,252,0.25)]";

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-200/80">
      {children}
    </span>
  );
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
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

/** Fades + lifts children in once they enter the viewport. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <As
      ref={ref as React.Ref<never>}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] ${
        shown ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[2px]"
      } ${className}`}
    >
      {children}
    </As>
  );
}

/** Heading whose words rise in one after another. */
export function SplitHeading({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <p ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-1 align-bottom">
          <span
            className="inline-block transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ transform: shown ? "translateY(0)" : "translateY(110%)", transitionDelay: `${i * 45}ms` }}
          >
            {w}&nbsp;
          </span>
        </span>
      ))}
    </p>
  );
}

/** Ring cursor that trails the pointer and grows over links (fine pointers only). */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      hover = false,
      raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      hover = !!(e.target as HTMLElement)?.closest?.("a,button,[data-cursor]");
    };
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) scale(${hover ? 1.8 : 1})`;
        ring.current.style.borderColor = hover ? "rgba(125,211,252,0.9)" : "rgba(255,255,255,0.35)";
      }
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move);
    raf = requestAnimationFrame(loop);
    document.documentElement.classList.add("custom-cursor");
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, []);
  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className="pointer-events-none fixed left-0 top-0 z-[60] h-9 w-9 rounded-full border transition-[border-color] duration-200 will-change-transform" />
      <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-sky-200 will-change-transform" />
    </>
  );
}

/** Element that leans toward the pointer. */
export function Magnetic({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

/** 3D tilt card that follows the pointer, with a moving glare. */
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ perspective: "900px" }} className="h-full">
      <div
        ref={ref}
        data-cursor
        className={`group relative h-full overflow-hidden transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el || e.pointerType !== "mouse") return;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.transform = `rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateZ(0)`;
          el.style.setProperty("--gx", `${px * 100}%`);
          el.style.setProperty("--gy", `${py * 100}%`);
        }}
        onPointerLeave={() => {
          if (ref.current) ref.current.style.transform = "";
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(400px_circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,255,255,0.08),transparent_40%)]" />
        {children}
      </div>
    </div>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10 motion-reduce:animate-none">
        {row.map((t, i) => (
          <span key={i} className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.3em] text-white/45">
            {t} <span className="ml-10 text-sky-300/60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = () =>
      setT(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }).format(new Date())
      );
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{t ? `${t} IST` : ""}</span>;
}
