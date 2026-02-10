"use client";

import React from "react";
import { motion } from "framer-motion";

const competitions = [
    {
        title: "Smart India Hackathon 2025",
        result: "National Winner",
        focus: "Civic tech, full-stack delivery",
    },
    {
        title: "RoboRashtra 2026",
        result: "1st Runner-Up",
        focus: "Embedded AI + robotics",
    },
    {
        title: "Project Morpheus 2026",
        result: "Organized",
        focus: "Nationwide hackathon leadership",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function CompetitionsSection() {
    return (
        <div className="relative w-full bg-neutral-950 py-20 md:py-28">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="max-w-5xl mx-auto px-6"
            >
                <motion.div variants={fadeUp} className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-3">
                        Competitions <span className="text-gradient">Won</span>
                    </h2>
                    <p className="text-neutral-400">
                        A snapshot of the contests and challenges I have taken on.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {competitions.map((item) => (
                        <motion.div
                            key={item.title}
                            variants={fadeUp}
                            className="glass rounded-2xl p-6 border border-white/10"
                        >
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {item.title}
                            </h3>
                            <p className="text-sm text-violet-300 font-medium mb-2">
                                {item.result}
                            </p>
                            <p className="text-sm text-neutral-400">{item.focus}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
