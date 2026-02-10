"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";

const SplineInner = lazy(() =>
    import("@splinetool/react-spline/next")
);

export default function SplineWrapper({ scene }: { scene: string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-full w-full bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />
        );
    }

    return (
        <Suspense
            fallback={
                <div className="h-full w-full bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />
            }
        >
            <SplineInner scene={scene} />
        </Suspense>
    );
}
