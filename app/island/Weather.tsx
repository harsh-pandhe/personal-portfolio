"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getUI, setUI, useUI, world } from "./store";
import { fetchNaviMumbai, istIsNight, isRainy } from "./weather";
import { sfx } from "./audio";

/** Fetches Navi Mumbai's weather every 10 minutes and turns it (plus IST time) into scene targets. */
export function WeatherController() {
  const ui = useUI();
  useEffect(() => {
    const ac = new AbortController();
    const load = () => fetchNaviMumbai(ac.signal).then((w) => w && setUI({ weather: w }));
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, []);
  // weather → rain and cloud targets
  useEffect(() => {
    const w = ui.weather;
    if (ui.weatherMode === "monsoon") {
      world.rainTarget = 1;
      world.cloud = 0.95;
    } else if (ui.weatherMode === "clear" || !w) {
      world.rainTarget = 0;
      world.cloud = 0.25;
    } else {
      world.rainTarget = isRainy(w.code) ? Math.min(1, 0.45 + w.precip / 4) : 0;
      world.cloud = w.cloud / 100;
    }
  }, [ui.weatherMode, ui.weather]);
  // live IST day/night
  useEffect(() => {
    if (ui.timeMode !== "live") return;
    const tick = () => {
      if (getUI().gala === null && getUI().story === null) setUI({ night: istIsNight() });
    };
    tick();
    const t = setInterval(tick, 60 * 1000);
    return () => clearInterval(t);
  }, [ui.timeMode]);
  return null;
}

/** Rain streaks around the camera, plus lightning in heavy rain. */
export function Rain() {
  const N = 4500;
  const { camera } = useThree();
  const ref = useRef<THREE.LineSegments>(null);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#cfe3f5", transparent: true, opacity: 0, depthWrite: false }), []);
  const { geo, drops } = useMemo(() => {
    const pos = new Float32Array(N * 6);
    const drops = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 70, y: Math.random() * 40, z: (Math.random() - 0.5) * 70, v: 26 + Math.random() * 12 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geo: g, drops };
  }, []);
  const flash = useRef(0);
  const nextBolt = useRef(6);
  useFrame(({ scene }, dt) => {
    world.rain += (world.rainTarget - world.rain) * Math.min(dt * 0.6, 1);
    const r = world.rain;
    mat.opacity = r * 0.55;
    if (ref.current) ref.current.visible = r > 0.02;
    if (r > 0.02) {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      const cx = camera.position.x,
        cz = camera.position.z;
      for (let i = 0; i < N; i++) {
        const d = drops[i];
        d.y -= d.v * dt;
        if (d.y < -2) {
          d.y = 38;
          d.x = (Math.random() - 0.5) * 70;
          d.z = (Math.random() - 0.5) * 70;
        }
        const x = cx + d.x,
          z = cz + d.z;
        a[i * 6] = x;
        a[i * 6 + 1] = d.y;
        a[i * 6 + 2] = z;
        a[i * 6 + 3] = x + 0.08;
        a[i * 6 + 4] = d.y + 0.9;
        a[i * 6 + 5] = z;
      }
      pos.needsUpdate = true;
    }
    // lightning in heavy rain
    nextBolt.current -= dt;
    if (r > 0.75 && nextBolt.current < 0) {
      flash.current = 1;
      nextBolt.current = 7 + Math.random() * 12;
      sfx("thunder");
    }
    flash.current = Math.max(0, flash.current - dt * 3.5);
    scene.userData.flash = flash.current * (0.6 + Math.random() * 0.4);
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
