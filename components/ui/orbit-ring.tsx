"use client";

import React from "react";

const items = [
    "Full-Stack",
    "Web3",
    "Blockchain",
    "Cybersecurity",
    "Embedded AI",
    "Robotics",
    "Distributed Systems",
    "SIH '25",
];

/** CSS-3D rotating ring of focus areas (no WebGL needed). */
export default function OrbitRing() {
    const radius = 340;
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[4] flex items-end justify-center overflow-hidden"
            style={{ perspective: "1000px" }}
        >
            <div
                className="orbit-ring relative mb-[12vh] h-0 w-0"
                style={{ transformStyle: "preserve-3d" }}
            >
                {items.map((label, i) => (
                    <span
                        key={label}
                        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-violet-200/80 backdrop-blur-sm"
                        style={{
                            transform: `rotateY(${(360 / items.length) * i}deg) translateZ(${radius}px)`,
                        }}
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}
