"use client";

import React from "react";
import { motion } from "framer-motion";

const milestones = [
    {
        year: "2024",
        title: "Led campus cybersecurity initiatives",
        detail: "Expanded student training and outreach programs.",
    },
    {
        year: "2025",
        title: "Smart India Hackathon winner",
        detail: "Built Telhan Sathi for civic impact.",
    },
    {
        year: "2026",
        title: "RoboRashtra runner-up",
        detail: "Delivered embedded AI solutions on microcontrollers.",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TimelineSection() {
    return (
        <div className="relative w-full bg-[#0b0b0f] py-20 md:py-28">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="max-w-4xl mx-auto px-6"
            >
                <motion.div variants={fadeUp} className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-3">
                        Timeline <span className="text-gradient">Highlights</span>
                    </h2>
                    <p className="text-neutral-400">
                        The key checkpoints that shaped my journey.
                    </p>
                </motion.div>

                <div className="space-y-6">
                    {milestones.map((item) => (
                        <motion.div
                            key={item.year}
                            variants={fadeUp}
                            className="flex gap-6 glass rounded-2xl p-6 border border-white/10"
                        >
                            <div className="text-2xl font-bold text-gradient w-16">
                                {item.year}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-neutral-400">{item.detail}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
