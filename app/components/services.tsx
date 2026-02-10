"use client";

import React from "react";
import { motion } from "framer-motion";

const services = [
    {
        title: "Full-stack product builds",
        detail: "From design systems to deployment, built for scale.",
    },
    {
        title: "Blockchain architecture",
        detail: "Auditable smart contracts and secure token systems.",
    },
    {
        title: "Embedded AI & robotics",
        detail: "On-device intelligence with real-world constraints.",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ServicesSection() {
    return (
        <div className="relative w-full bg-[#0b0b0f] py-20 md:py-28">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="max-w-5xl mx-auto px-6"
            >
                <motion.div variants={fadeUp} className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-3">
                        Services <span className="text-gradient">Offered</span>
                    </h2>
                    <p className="text-neutral-400">
                        Focused engagements that move the needle fast.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <motion.div
                            key={service.title}
                            variants={fadeUp}
                            className="glass rounded-2xl p-6 border border-white/10"
                        >
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {service.title}
                            </h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                {service.detail}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
