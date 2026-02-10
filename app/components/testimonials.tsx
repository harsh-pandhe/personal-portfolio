"use client";

import React from "react";
import { motion } from "framer-motion";

const testimonials = [
    {
        quote:
            "Harsh ships with urgency and precision. Every sprint ends with real outcomes.",
        name: "Project Morpheus Team",
        role: "Hackathon Organizers",
    },
    {
        quote:
            "He bridges product and engineering, and keeps the team aligned under pressure.",
        name: "IIC-SIT Leadership",
        role: "Campus Innovation Council",
    },
    {
        quote:
            "From architecture to delivery, his systems thinking is rare at this stage.",
        name: "Mentor Panel",
        role: "RoboRashtra 2026",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TestimonialsSection() {
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
                        Words from <span className="text-gradient">Collaborators</span>
                    </h2>
                    <p className="text-neutral-400">
                        Feedback from teams and mentors I have worked with.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((item) => (
                        <motion.div
                            key={item.name}
                            variants={fadeUp}
                            className="glass rounded-2xl p-6 border border-white/10"
                        >
                            <p className="text-sm text-neutral-200 leading-relaxed mb-4">
                                “{item.quote}”
                            </p>
                            <p className="text-sm font-semibold text-white">
                                {item.name}
                            </p>
                            <p className="text-xs text-neutral-500">{item.role}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
