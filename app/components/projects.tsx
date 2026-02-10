"use client";
import React from "react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { IconBrandGithub, IconExternalLink } from "@tabler/icons-react";

type Project = {
    title: string;
    description: string;
    tags: string[];
    github?: string;
    live?: string;
};

const projects: Project[] = [
    {
        title: "Telhan Sathi",
        description:
            "SIH 2025 National Winner — AI-powered platform for oilseed farming with predictive crop advisories, IoT-based soil detection, real-time farm monitoring dashboards, and government scheme integration (NMEO-OS).",
        tags: ["Python", "IoT", "Django", "AI/ML", "Mobile App"],
        github: "https://github.com/harsh-pandhe",
        live: "https://telhan-sathi.vercel.app",
    },
    {
        title: "Project Morpheus 2026",
        description:
            "Full-stack hackathon platform I architected for a national-level 24-hour event at SIT Lonavala. Features user registration, team management, and a Matrix-themed immersive UX with React Three Fiber.",
        tags: ["React 19", "Tailwind v4", "Three.js", "MongoDB"],
        live: "https://www.projectmorpheus.in",
    },
    {
        title: "Codex — Collaborative Code Editor",
        description:
            "Real-time collaborative code editor supporting 50+ concurrent users with sub-50ms state propagation. Published research paper in IRJMETS on its architecture.",
        tags: ["Next.js", "TypeScript", "Monaco Editor", "Liveblocks"],
        github: "https://github.com/harsh-pandhe",
        live: "https://collabcodex.vercel.app",
    },
    {
        title: "CityConnect",
        description:
            "Decentralized civic engagement platform where citizens earn blockchain-based EcoCoins for resolving infrastructure issues. Built with custom Solidity smart contracts and Django REST API.",
        tags: ["Next.js", "Django", "Solidity", "MongoDB"],
        github: "https://github.com/harsh-pandhe",
    },
    {
        title: "Team Imposters — RoboRashtra 2026",
        description:
            "Hybrid autonomous robot using Behavioral Cloning for maze navigation. Trained a neural network on 100+ datasets, deployed on Teensy 4.1 with sub-ms inference latency. Won 1st Runner-Up.",
        tags: ["C++", "Teensy 4.1", "Neural Networks", "Sensor Fusion"],
        github: "https://github.com/harsh-pandhe",
    },
    {
        title: "E-Commerce Store",
        description:
            "Full-fledged MERN online shopping platform with admin panel, PayPal integration, product ratings & reviews, and Cloudinary image management. Designed for seamless customer & admin experiences.",
        tags: ["React", "Node.js", "MongoDB", "Express", "PayPal"],
        github: "https://github.com/harsh-pandhe",
    },
];

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Projects() {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <div className="relative w-full bg-neutral-950">
            {!prefersReducedMotion && <BackgroundBeams />}

            <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28"
            >
                <motion.div variants={fadeUp} className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        My <span className="text-gradient">Projects</span>
                    </h1>
                    <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
                        From national hackathon wins to published research — here are
                        some things I&apos;ve built that I&apos;m proud of.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <motion.div
                            key={project.title}
                            variants={fadeUp}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="glass rounded-2xl p-6 flex flex-col justify-between group glow"
                        >
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-gradient transition-all">
                                    {project.title}
                                </h3>
                                <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                    {project.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {project.github && (
                                    <a
                                        href={project.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <IconBrandGithub className="h-4 w-4" />
                                        Code
                                    </a>
                                )}
                                {project.live && (
                                    <a
                                        href={project.live}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <IconExternalLink className="h-4 w-4" />
                                        Live
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
