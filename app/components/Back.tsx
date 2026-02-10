"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlipWords } from "@/components/ui/flip-words";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const SplineWrapper = dynamic(
    () => import("@/components/ui/spline-wrapper"),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />
        ),
    }
);

export default function Back() {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [showSpline, setShowSpline] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion) {
            setShowSpline(false);
            return;
        }
        const mq = window.matchMedia("(min-width: 1024px)");
        const update = () => setShowSpline(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, [prefersReducedMotion]);

    const roles = [
        "Full-Stack Developer",
        "Web3 Developer",
        "Blockchain Architect",
        "Embedded AI Engineer",
        "Robotics Innovator",
        "Distributed Systems Builder",
    ];

    const greetings = [
        "Namaste",
        "Hello",
        "Bonjour",
        "Hola",
        "Ciao",
        "Konnichiwa",
    ];

    return (
        <div className="relative h-screen overflow-hidden">
            {/* Stars behind everything */}
            {!prefersReducedMotion && (
                <StarsBackground className="absolute inset-0 z-0 h-full w-full" />
            )}

            {/* Atmospheric glow */}
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top,_rgba(120,119,198,0.25),_transparent_55%)]" />
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_bottom,_rgba(76,29,149,0.18),_transparent_60%)]" />

            {/* Hero content */}
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
                <div className="w-full max-w-4xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.05 }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.35em] text-neutral-300"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        <FlipWords words={greetings} duration={2500} />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-6 text-4xl sm:text-5xl md:text-7xl font-bold text-white"
                    >
                        Harsh{" "}
                        <span className="text-gradient">Pandhe</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.32 }}
                        className="mt-3 text-sm md:text-base text-violet-300 font-medium tracking-wide"
                    >
                        SIH&apos;25 National Winner 🏆 · Head of Cybersecurity &amp; Blockchain @ IIC&nbsp;SIT
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.45 }}
                        className="mt-4 text-lg md:text-2xl text-neutral-300"
                    >
                        I&apos;m a <FlipWords words={roles} duration={2500} />
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.55 }}
                        className="mt-4 text-sm md:text-base text-neutral-400 max-w-2xl mx-auto"
                    >
                        I build full-stack platforms, blockchain systems, and embedded AI solutions
                        that move from prototype to production fast.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.65 }}
                        className="mt-8 flex flex-wrap justify-center gap-4"
                    >
                        <a
                            href="https://github.com/harsh-pandhe"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-xl glass text-sm font-medium text-white hover:bg-white/10 transition-all duration-300"
                        >
                            View GitHub
                        </a>
                        <button
                            onClick={() => {
                                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-all duration-300 shadow-lg shadow-violet-500/25"
                        >
                            Get in Touch
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.75 }}
                        className="mt-8 flex flex-wrap justify-center gap-3"
                    >
                        {[
                            { label: "90+", value: "Repositories" },
                            { label: "817+", value: "2025 Contributions" },
                            { label: "70+", value: "Devs Mentored" },
                        ].map((stat) => (
                            <div
                                key={stat.value}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-300"
                            >
                                <span className="text-white font-semibold mr-2">
                                    {stat.label}
                                </span>
                                {stat.value}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* 3D Spline (desktop only) */}
            {showSpline && (
                <div className="absolute inset-0 z-5 opacity-40">
                    <SplineWrapper scene="https://prod.spline.design/oumZ0UDMuQBuUecd/scene.splinecode" />
                </div>
            )}

            {/* Shooting stars on top */}
            {!prefersReducedMotion && (
                <ShootingStars className="absolute inset-0 z-20 pointer-events-none" />
            )}
        </div>
    );
}