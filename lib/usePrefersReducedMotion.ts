"use client";

import { useEffect, useState } from "react";

export const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setPrefersReducedMotion(mediaQuery.matches);

        onChange();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", onChange);
        } else {
            mediaQuery.addListener(onChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener("change", onChange);
            } else {
                mediaQuery.removeListener(onChange);
            }
        };
    }, []);

    return prefersReducedMotion;
};
