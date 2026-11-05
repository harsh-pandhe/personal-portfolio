"use client";

import Link from "next/link";
import { CaseBody } from "../island/CaseStudy";
import { ZONES } from "../island/zones";
import { profile } from "@/lib/achievements";

/** Every case study on one page: no WebGL, readable anywhere, indexable by search engines. */
export default function ReadPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0f1d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f1d]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-10 sm:py-4">
          <Link href="/" className="font-display text-[18px] font-semibold tracking-[-0.02em]">
            {profile.name}
          </Link>
          <nav className="hidden flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] uppercase text-white/60 lg:flex">
            {ZONES.map((z) => (
              <a key={z.id} href={`#${z.id}`} className="hover:text-white">
                {z.name}
              </a>
            ))}
          </nav>
          <Link href="/" className="shrink-0 rounded-full bg-[#22d36b] px-4 py-2 text-[13px] font-semibold text-[#06240f] hover:bg-[#2be277]">
            Explore<span className="hidden sm:inline"> the island</span> →
          </Link>
        </div>
      </header>
      <main>
        <h1 className="sr-only">{profile.name}: work, research and wins</h1>
        {ZONES.map((z) => (
          <section key={z.id} id={z.id} className="scroll-mt-16 border-b border-white/10 pb-10" style={{ ["--accent" as string]: z.accent }}>
            <div className="flex items-center gap-2.5 px-4 pt-8 sm:px-10 sm:pt-10 font-mono text-[12px] uppercase text-white/55">
              <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: z.accent }} />
              {z.name} · {z.team}
            </div>
            <CaseBody heading="h2" id={z.id} onNext={(n) => document.getElementById(n)?.scrollIntoView({ behavior: "smooth" })} />
          </section>
        ))}
      </main>
      <footer className="flex flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10 font-mono text-[12px] uppercase text-white/45">
        <span>© 2026 {profile.name}</span>
        <span>
          <a className="hover:text-white" href={profile.links.github}>
            GitHub
          </a>{" "}
          ·{" "}
          <a className="hover:text-white" href={profile.links.linkedin}>
            LinkedIn
          </a>{" "}
          ·{" "}
          <a className="hover:text-white" href={profile.links.ssrn}>
            SSRN
          </a>
        </span>
      </footer>
    </div>
  );
}
