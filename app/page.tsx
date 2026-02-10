"use client";

import React, { useCallback } from "react";
import {
  IconHome,
  IconUser,
  IconCode,
  IconCamera,
  IconMail,
} from "@tabler/icons-react";
import {
  BookOpen,
  BriefcaseBusiness,
  MessageSquareQuote,
  Clock,
  Trophy,
} from "lucide-react";
import { FloatingDock } from "@/components/ui/floating-dock";
import dynamic from "next/dynamic";

const Back = dynamic(() => import("./components/Back"), { ssr: false });
const Me = dynamic(() => import("@/app/components/me"));
const Blog = dynamic(() => import("@/app/components/blog"));
const Services = dynamic(() => import("@/app/components/services"));
const Testimonials = dynamic(() => import("@/app/components/testimonials"));
const Timeline = dynamic(() => import("@/app/components/timeline"));
const Projects = dynamic(() => import("@/app/components/projects"));
const Competitions = dynamic(() => import("@/app/components/competitions"));
const Contact = dynamic(() => import("@/app/components/contact"));
const Memories = dynamic(() => import("@/app/components/memories"));

const sections = [
  { id: "hero", title: "Hero", icon: IconHome },
  { id: "about", title: "About", icon: IconUser },
  { id: "services", title: "Services", icon: BriefcaseBusiness },
  { id: "projects", title: "Projects", icon: IconCode },
  { id: "competitions", title: "Competitions", icon: Trophy },
  { id: "timeline", title: "Timeline", icon: Clock },
  { id: "testimonials", title: "Testimonials", icon: MessageSquareQuote },
  { id: "memories", title: "Memories", icon: IconCamera },
  { id: "blog", title: "Blog", icon: BookOpen },
  { id: "contact", title: "Contact", icon: IconMail },
];


/* ══════════════════════════════════ *
 *          PAGE COMPONENT           *
 * ══════════════════════════════════ */
export default function Home() {
  /* ── smooth-scroll to section ── */
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const dockItems = sections.map((section) => ({
    title: section.title,
    href: `#${section.id}`,
    icon: (
      <section.icon className="h-full w-full text-neutral-500 dark:text-neutral-300" />
    ),
    onClick: () => scrollTo(section.id),
  }));

  return (
    <main className="relative bg-[hsl(var(--background))]">
      {/* ─── Floating Dock ─── */}
      <FloatingDock
        items={dockItems}
        desktopClassName="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        mobileClassName="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      />

      {/* ─── Sections ─── */}
      <div>
        <section id="hero" className="min-h-screen">
          <Back />
        </section>

        <section id="about" className="min-h-screen">
          <Me />
        </section>

        <section id="services" className="min-h-screen">
          <Services />
        </section>

        <section id="projects" className="min-h-screen">
          <Projects />
        </section>

        <section id="competitions" className="min-h-screen">
          <Competitions />
        </section>

        <section id="timeline" className="min-h-screen">
          <Timeline />
        </section>

        <section id="testimonials" className="min-h-screen">
          <Testimonials />
        </section>

        <section id="memories" className="min-h-screen">
          <Memories />
        </section>

        <section id="blog" className="min-h-screen">
          <Blog />
        </section>

        <section id="contact" className="min-h-screen">
          <Contact />
        </section>
      </div>
    </main>
  );
}

