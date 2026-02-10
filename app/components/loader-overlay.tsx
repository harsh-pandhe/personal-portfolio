"use client";

import React, { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";

const LOADER_URL =
  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/35984/LEGO_loader_chrisgannon.json";

export default function LoaderOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: LOADER_URL,
    });

    animation.setSpeed(3.24);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = originalOverflow;
    }, 3200);

    return () => {
      window.clearTimeout(timer);
      animation.destroy();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="loader-overlay" aria-hidden="true">
      <div className="loader-stack">
        <div ref={containerRef} className="loader-window" />
        <div className="loader-text">Loading</div>
      </div>
    </div>
  );
}
