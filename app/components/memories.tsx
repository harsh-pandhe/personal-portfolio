"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const outerImages = [
  "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fGZhc2hpb258ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1556304044-0699e31c6a34?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTJ8fGZhc2hpb258ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1590330297626-d7aff25a0431?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTA3fHxmYXNoaW9ufGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTk1fHxmYXNoaW9ufGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzR8fG1vZGVsJTIwZmFzaGlvbiUyMHN0cmVldHxlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1565321590372-09331b9dd1eb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGFpciUyMGpvcmRhbnxlbnwwfHwwfHx8MA%3D%3D",
];

const innerImages = [
  "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjM4fHxwcm9kdWN0fGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1637414165749-9b3cd88b8271?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHRlY2glMjBwcm9kdWN0fGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1699911251220-8e0de3b5ce88?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8b25ld2hlZWx8ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1667483629944-6414ad0648c5?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fGx1eHVyeSUyMHdhdGNofGVufDB8fDB8fHww",
  "https://plus.unsplash.com/premium_photo-1706078438060-d76ced26d8d5?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjF8fGNhbWVyYSUyMHBvbGFyb2lkfGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1525385444278-b7968e7e28dc?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDZ8fGl0ZW18ZW58MHx8MHx8fDA%3D",
];

const centerImages = [
  "https://images.unsplash.com/reserve/LJIZlzHgQ7WPSh5KVTCB_Typewriter.jpg?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aXRlbXxlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmFzaGlvbnxlbnwwfHwwfHx8MA%3D%3D",
];

const scalerImage =
  "https://assets.codepen.io/605876/model-shades.jpg?format=auto&quality=100";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function MemoriesGallery() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const img = scalerRef.current;
    if (!img) return;

    const updateSize = () => {
      setNaturalSize({ width: img.offsetWidth, height: img.offsetHeight });
    };

    if (img.complete) {
      updateSize();
    } else {
      img.addEventListener("load", updateSize);
    }

    return () => img.removeEventListener("load", updateSize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "80% end"],
  });

  const scalerWidth = useTransform(scrollYProgress, [0, 1], [
    viewport.width || 1200,
    naturalSize.width || 420,
  ]);
  const scalerHeight = useTransform(scrollYProgress, [0, 1], [
    viewport.height || 800,
    naturalSize.height || 520,
  ]);

  const layerScale = [0, 1, 2].map((index) => {
    const start = 0.3 + index * 0.05;
    return useTransform(scrollYProgress, [0, start, 1], [0, 0, 1]);
  });

  const layerOpacity = [0, 1, 2].map((index) => {
    const start = 0.55 + index * 0.03;
    return useTransform(scrollYProgress, [0, start, 1], [0, 0, 1]);
  });

  return (
    <div className="memories-scroll-wrap">
      <motion.header
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        className="memories-header"
      >
        <motion.h2 variants={fadeUp} className="memories-title">
          let&apos;s<br />scroll.
        </motion.h2>
        <motion.p variants={fadeUp} className="memories-subtitle">
          The memories column collapses into focus as you scroll.
        </motion.p>
      </motion.header>

      <main className="memories-main">
        <section ref={sectionRef} className="memories-section">
          <div className="memories-content">
            <div className="memories-grid">
              <motion.div
                className="memories-layer"
                style={{
                  opacity: prefersReducedMotion ? 1 : layerOpacity[0],
                  scale: prefersReducedMotion ? 1 : layerScale[0],
                }}
              >
                {outerImages.map((src, i) => (
                  <div key={`outer-${i}`}>
                    <img src={src} alt="" loading="lazy" />
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="memories-layer"
                style={{
                  opacity: prefersReducedMotion ? 1 : layerOpacity[1],
                  scale: prefersReducedMotion ? 1 : layerScale[1],
                }}
              >
                {innerImages.map((src, i) => (
                  <div key={`inner-${i}`}>
                    <img src={src} alt="" loading="lazy" />
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="memories-layer"
                style={{
                  opacity: prefersReducedMotion ? 1 : layerOpacity[2],
                  scale: prefersReducedMotion ? 1 : layerScale[2],
                }}
              >
                {centerImages.map((src, i) => (
                  <div key={`center-${i}`}>
                    <img src={src} alt="" loading="lazy" />
                  </div>
                ))}
              </motion.div>

              <div className="memories-scaler">
                <motion.img
                  ref={scalerRef}
                  src={scalerImage}
                  alt=""
                  loading="lazy"
                  style={
                    prefersReducedMotion
                      ? { width: "100%", height: "100%" }
                      : { width: scalerWidth, height: scalerHeight }
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="memories-end">
          <h2 className="memories-title">fin.</h2>
        </section>
      </main>

      <style jsx global>{`
        .memories-scroll-wrap {
          background: #000;
          color: #fff;
          overflow: clip;
          padding: 0 0 4rem;
        }

        .memories-header {
          min-height: 100vh;
          display: grid;
          align-content: center;
          max-width: calc(100% - (2 * var(--gutter, 2rem)));
          padding-left: 48px;
          text-align: left;
        }

        .memories-title {
          font-size: clamp(3.2rem, 10vw, 10rem);
          line-height: 0.7;
          margin: 0;
          text-transform: lowercase;
        }

        .memories-subtitle {
          padding-top: 24px;
          font-size: clamp(0.75rem, 2vw, 1.35rem);
          color: #e2e2e2;
          max-width: 32rem;
        }

        .memories-main section:first-of-type {
          min-height: 240vh;
        }

        .memories-content {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          place-items: center;
          align-content: center;
          position: sticky;
          top: 0;
          overflow: hidden;
        }

        .memories-main section:last-of-type {
          min-height: 100vh;
          display: grid;
          place-items: center;
        }

        .memories-grid {
          --offset: 0;
          --container-width: 1600px;
          --gap: clamp(10px, 7.35vw, 80px);

          width: var(--container-width);
          max-width: calc(100% - (2 * var(--gutter, 2rem)));
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(3, auto);
          gap: var(--gap);
          margin: 0 auto;
          align-content: center;
          position: absolute;
          top: 50%;
          left: 50%;
          translate: -50% -50%;
        }

        @media (max-width: 600px) {
          .memories-grid {
            grid-template-columns: repeat(3, 1fr);
            --offset: -1;
          }

          .memories-grid > .memories-layer:nth-of-type(1) {
            display: none;
          }

          .memories-header {
            padding-left: 24px;
          }
        }

        .memories-grid > .memories-layer {
          display: grid;
          grid-column: 1 / -1;
          grid-row: 1 / -1;
          grid-template-columns: subgrid;
          grid-template-rows: subgrid;
        }

        .memories-grid > .memories-layer:nth-of-type(1) div:nth-of-type(odd) {
          grid-column: 1;
        }

        .memories-grid > .memories-layer:nth-of-type(1) div:nth-of-type(even) {
          grid-column: -2;
        }

        .memories-grid > .memories-layer:nth-of-type(2) div:nth-of-type(odd) {
          grid-column: calc(2 + var(--offset));
        }

        .memories-grid > .memories-layer:nth-of-type(2) div:nth-of-type(even) {
          grid-column: calc(-3 - var(--offset));
        }

        .memories-grid > .memories-layer:nth-of-type(3) div:first-of-type {
          grid-column: calc(3 + var(--offset));
          grid-row: 1;
        }

        .memories-grid > .memories-layer:nth-of-type(3) div:last-of-type {
          grid-column: calc(3 + var(--offset));
          grid-row: -1;
        }

        .memories-grid img {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border-radius: 1rem;
        }

        .memories-grid .memories-scaler {
          position: relative;
          grid-area: 2 / calc(3 + var(--offset));
        }

        .memories-scaler {
          z-index: 2;
          width: 100%;
          height: 100%;
          position: relative;
        }

        .memories-scaler img {
          position: absolute;
          top: 50%;
          left: 50%;
          translate: -50% -50%;
          object-fit: cover;
          border-radius: 1rem;
        }
      `}</style>
    </div>
  );
}
