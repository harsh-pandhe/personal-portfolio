"use client";

import React from "react";
import { motion } from "framer-motion";

const posts = [
    {
        title: "Designing resilient systems",
        tag: "Architecture",
        summary: "Notes on building services that stay calm under pressure.",
    },
    {
        title: "Smart contracts in the real world",
        tag: "Web3",
        summary: "Patterns I use to keep Solidity audits boring.",
    },
    {
        title: "Shipping fast with small teams",
        tag: "Product",
        summary: "Tactics for mentoring and momentum when the clock is tight.",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function BlogSection() {
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
                        Latest <span className="text-gradient">Writing</span>
                    </h2>
                    <p className="text-neutral-400">
                        Essays, breakdowns, and playbooks from recent work.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <motion.div
                            key={post.title}
                            variants={fadeUp}
                            className="glass rounded-2xl p-6 hover:shadow-xl hover:shadow-violet-500/10 transition-shadow"
                        >
                            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
                                {post.tag}
                            </p>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {post.title}
                            </h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                {post.summary}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
