"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import Heatmap from "@/components/ui/heatmap";
import { generateContributionData } from "@/lib/github-contributions";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import {
    IconBrandReact,
    IconBrandNextjs,
    IconBrandTypescript,
    IconBrandNodejs,
    IconBrandPython,
    IconBrandMongodb,
    IconBrandGit,
    IconBrandDocker,
    IconBrandTailwind,
    IconBrandRust,
    IconCurrencyEthereum,
    IconCpu,
} from "@tabler/icons-react";

const skills = [
    { name: "React", icon: IconBrandReact, color: "text-cyan-400" },
    { name: "Next.js", icon: IconBrandNextjs, color: "text-white" },
    { name: "TypeScript", icon: IconBrandTypescript, color: "text-blue-400" },
    { name: "Node.js", icon: IconBrandNodejs, color: "text-green-400" },
    { name: "Python", icon: IconBrandPython, color: "text-yellow-400" },
    { name: "Solidity", icon: IconCurrencyEthereum, color: "text-purple-400" },
    { name: "Rust", icon: IconBrandRust, color: "text-orange-400" },
    { name: "MongoDB", icon: IconBrandMongodb, color: "text-green-500" },
    { name: "Docker", icon: IconBrandDocker, color: "text-blue-500" },
    { name: "Tailwind", icon: IconBrandTailwind, color: "text-teal-400" },
    { name: "Git", icon: IconBrandGit, color: "text-orange-500" },
    { name: "Embedded AI", icon: IconCpu, color: "text-rose-400" },
];

const achievements = [
    { label: "SIH 2025", value: "National Winner" },
    { label: "RoboRashtra 2026", value: "1st Runner-Up" },
    { label: "Repos", value: "90+" },
    { label: "Devs Mentored", value: "70+" },
];


const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Me() {
    const prefersReducedMotion = usePrefersReducedMotion();
    const contributionData = useMemo(() => generateContributionData(), []);

    return (
        <div className="relative w-full bg-neutral-950 flex items-center justify-center">
            {!prefersReducedMotion && <BackgroundBeams />}

            <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28"
            >
                {/* Header */}
                <motion.div variants={fadeUp} className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        About <span className="text-gradient">Me</span>
                    </h1>
                    <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        I architect systems that bridge the gap between complex theory and
                        real-world impact. Computer Engineering student at SIT&nbsp;Lonavala,
                        on a mission to master the convergence of Web3, AI, and Distributed
                        Systems.
                    </p>
                </motion.div>

                {/* Stats row */}
                <motion.div
                    variants={fadeUp}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    {achievements.map((a) => (
                        <div
                            key={a.label}
                            className="glass rounded-xl p-4 text-center"
                        >
                            <p className="text-xl md:text-2xl font-bold text-gradient">
                                {a.value}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">{a.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Bio cards */}
                <motion.div
                    variants={fadeUp}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
                >
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-3">
                            What I Do
                        </h3>
                        <p className="text-neutral-400 leading-relaxed text-sm">
                            I build full-stack web applications, blockchain architectures,
                            and embedded AI systems. From winning the Smart India Hackathon
                            2025 with &ldquo;Telhan Sathi&rdquo; to deploying neural networks
                            on microcontrollers for RoboRashtra 2026, I turn whiteboard ideas
                            into shipped products.
                        </p>
                    </div>
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-3">
                            Leadership &amp; Community
                        </h3>
                        <p className="text-neutral-400 leading-relaxed text-sm">
                            As Head of Cybersecurity &amp; Blockchain at IIC-SIT, I lead
                            campus-wide tech initiatives for 500+ students. I organize
                            national hackathons like Project Morpheus 2026, mentor 70+ junior
                            developers, and have authored a published research paper on
                            collaborative code editing.
                        </p>
                    </div>
                </motion.div>

                {/* Skills grid */}
                <motion.div variants={fadeUp}>
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                        Tech <span className="text-gradient">Stack</span>
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {skills.map((skill) => (
                            <motion.div
                                key={skill.name}
                                variants={fadeUp}
                                whileHover={{ scale: 1.05, y: -4 }}
                                className="glass rounded-xl p-4 flex flex-col items-center gap-2 cursor-default group"
                            >
                                <skill.icon
                                    className={`h-8 w-8 ${skill.color} group-hover:scale-110 transition-transform`}
                                />
                                <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">
                                    {skill.name}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>


                {/* GitHub Contribution Heatmap */}
                <motion.div variants={fadeUp} className="mt-16">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
                        2025 <span className="text-gradient">Contributions</span>
                    </h2>
                    <p className="text-neutral-500 text-sm text-center mb-8">
                        817+ contributions across 90+ repositories — consistency is the only cheat code.
                    </p>
                    <div className="glass rounded-2xl p-4 md:p-6 overflow-x-auto">
                        <Heatmap
                            data={contributionData}
                            startDate={new Date("2025-01-01")}
                            endDate={new Date("2025-12-31")}
                            colorMode="interpolate"
                            minColor="#1e1b4b"
                            maxColor="#8b5cf6"
                            interpolation="sqrt"
                            cellSize={14}
                            gap={3}
                            daysOfTheWeek="MWF"
                            valueDisplayFunction={(value) =>
                                `${value} contribution${value !== 1 ? "s" : ""}`
                            }
                        />
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
