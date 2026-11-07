"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { world } from "../store";
import { papers } from "@/lib/achievements";
import { M, fontFamily, Billboard, ZoneGroup, hoverHandlers, boxMetres, facadeMaterial } from "./common";
import { Static } from "../Props";

/* A walk-street trading wall: four instruments, AlgoTrade's real P&L, an equity curve and a ticker.
   The instrument prices are a simulated feed (clearly labelled); the AlgoTrade figures are from the
   SSRN papers and LinkedIn posts. */
const WALL_W = 1600,
  WALL_H = 800;
const INSTR = [
  { name: "NIFTY 50", base: 24300, vol: 0.0016, c: "#00e08a" },
  { name: "BANK NIFTY", base: 52100, vol: 0.002, c: "#2db5ff" },
  { name: "GOLD ₹/10g", base: 76400, vol: 0.0012, c: "#ffc93c" },
  { name: "USD / INR", base: 84.2, vol: 0.0005, c: "#c58bff" },
];
const EQUITY = [100, 104, 103, 111, 118, 114, 126, 139, 133, 148, 162, 158, 177, 196, 188, 212, 241, 233, 262, 289];

export function Trading() {
  const c = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = WALL_W;
    cv.height = WALL_H;
    return cv;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [c]);
  const series = useRef(INSTR.map((q) => Array.from({ length: 60 }, (_, i) => q.base * (1 + Math.sin(i * 0.3 + q.base) * q.vol * 6))));
  const acc = useRef(0);
  const ff = useMemo(() => fontFamily(), []);
  const glass = useMemo(() => facadeMaterial("glass", 3), []);
  const towerGeo = useMemo(() => boxMetres(11, 17, 6), []);
  const wallBack = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 512;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#2a2f36";
    g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = "#454c56";
    g.lineWidth = 10;
    for (let x = 0; x <= 1024; x += 128) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.moveTo(x, 0);
      g.lineTo(x + 128, 512);
      g.moveTo(x + 128, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    g.fillStyle = "#00e08a";
    g.fillRect(0, 230, 1024, 60);
    g.fillStyle = "#03110c";
    g.font = `800 44px ${fontFamily()}`;
    g.fillText("ALGOTRADE · TRADING FLOOR", 40, 276);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.3 });
  }, []);
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 0.9 }), [tex]);
  useFrame(({ clock }, dt) => {
    acc.current += dt;
    screen.emissiveIntensity = 0.75 + world.night * 1.1;
    glass.emissiveIntensity = world.night * 1.2;
    if (acc.current < 0.5) return;
    acc.current = 0;
    const t = clock.elapsedTime;
    const g = c.getContext("2d")!;
    g.fillStyle = "#03080a";
    g.fillRect(0, 0, WALL_W, WALL_H);
    // header
    g.fillStyle = "#0d1a16";
    g.fillRect(0, 0, WALL_W, 70);
    g.fillStyle = "#00e08a";
    g.font = `800 40px ${ff}`;
    g.fillText("ALGOTRADE · TRADING FLOOR", 28, 48);
    g.font = `600 22px ${ff}`;
    g.fillStyle = "#6f8f86";
    g.fillText("Instrument tiles: simulated feed, not live prices", 1050, 46);
    // instrument tiles
    INSTR.forEach((q, k) => {
      const s = series.current[k];
      s.push(s[s.length - 1] * (1 + (Math.random() - 0.48) * q.vol * 2));
      if (s.length > 60) s.shift();
      const x0 = 24 + k * 394,
        y0 = 90,
        w = 376,
        h = 250;
      g.fillStyle = "#08110f";
      g.fillRect(x0, y0, w, h);
      const last = s[s.length - 1],
        open = s[0],
        chg = ((last - open) / open) * 100;
      g.fillStyle = "#9fb3ad";
      g.font = `700 24px ${ff}`;
      g.fillText(q.name, x0 + 16, y0 + 34);
      g.fillStyle = "#ffffff";
      g.font = `800 40px ${ff}`;
      g.fillText(last.toLocaleString("en-IN", { maximumFractionDigits: q.base < 1000 ? 2 : 0 }), x0 + 16, y0 + 80);
      g.fillStyle = chg >= 0 ? "#00e08a" : "#ff4d5e";
      g.font = `700 24px ${ff}`;
      g.fillText(`${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}%`, x0 + w - 130, y0 + 80);
      const lo = Math.min(...s),
        hi = Math.max(...s);
      g.strokeStyle = q.c;
      g.lineWidth = 3;
      g.beginPath();
      s.forEach((v, i) => {
        const x = x0 + 14 + (i / 59) * (w - 28),
          y = y0 + h - 18 - ((v - lo) / (hi - lo || 1)) * 130;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
      g.lineTo(x0 + w - 14, y0 + h - 14);
      g.lineTo(x0 + 14, y0 + h - 14);
      g.fillStyle = q.c + "22";
      g.fill();
    });
    // P&L panel with the real backtest figures
    g.fillStyle = "#08110f";
    g.fillRect(24, 360, 560, 360);
    g.fillStyle = "#9fb3ad";
    g.font = `700 24px ${ff}`;
    g.fillText("STRATEGY P&L · WALK-FORWARD BACKTEST", 44, 400);
    const stats: [string, string, string][] = [
      ["CAGR", "40.2%", "#00e08a"],
      ["Sharpe", "1.68", "#00e08a"],
      ["Max drawdown", "−26.4%", "#ff4d5e"],
      ["Hypotheses rejected", "10", "#ffc93c"],
      ["Paper sessions", "60", "#2db5ff"],
    ];
    stats.forEach(([k, v, col], i) => {
      g.fillStyle = "#c9d6d2";
      g.font = `600 26px ${ff}`;
      g.fillText(k, 44, 452 + i * 52);
      g.fillStyle = col;
      g.font = `800 34px ${ff}`;
      g.fillText(v, 420, 452 + i * 52);
    });
    // equity curve: an illustrative shape, labelled as such on the wall
    g.fillStyle = "#08110f";
    g.fillRect(604, 360, 972, 360);
    g.fillStyle = "#9fb3ad";
    g.font = `700 24px ${ff}`;
    g.fillText("EQUITY CURVE · ILLUSTRATIVE, INDEXED TO 100", 624, 400);
    const reveal = Math.min(EQUITY.length, 2 + Math.floor((t * 1.5) % (EQUITY.length + 6)));
    g.strokeStyle = "#00e08a";
    g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i < reveal; i++) {
      const x = 640 + (i / (EQUITY.length - 1)) * 900,
        y = 690 - ((EQUITY[i] - 90) / 210) * 260;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = "#00e08a";
    g.font = `800 34px ${ff}`;
    g.fillText(`${EQUITY[reveal - 1]}`, 1460, 430);
    // ticker
    g.fillStyle = "#0d1a16";
    g.fillRect(0, 740, WALL_W, 60);
    g.fillStyle = "#b8ffe3";
    g.font = `600 28px ${ff}`;
    const tick = "MOMENTUM 12-1 BEATS XGBOOST RANKERS · SECTOR CAPS COST 8.6 PTS OF CAGR · HYSTERESIS BUFFER CUTS TURNOVER 51.7% · GATE E: PRODUCTION CLEARED · ";
    const off = (t * 90) % 1900;
    g.fillText(tick + tick, 20 - off, 782);
    tex.needsUpdate = true;
  });
  return (
    <ZoneGroup id="trading">
      {/* static parts merged per material after mount; moving parts are marked dynamic */}
      <Static>
      {/* the exchange tower: a glass curtain wall on every side, lit floor by floor at night */}
      <mesh position={[0, 8.5, -7]} geometry={towerGeo} material={glass} castShadow receiveShadow />
      <mesh position={[0, 17.2, -7]} material={M.metal}>
        <boxGeometry args={[11.4, 0.4, 6.4]} />
      </mesh>
      {/* the market wall at eye level: 16 x 8 m, bottom edge 0.9 m off the ground */}
      <mesh position={[0, 4.9, -3.6]} material={M.dark} castShadow>
        <boxGeometry args={[16.8, 8.8, 0.5]} />
      </mesh>
      <mesh position={[0, 4.9, -3.33]} material={screen} {...hoverHandlers("trading")}>
        <planeGeometry args={[16, 8]} />
      </mesh>
      {/* its back: a steel truss with the floor's name, seen from the tower side */}
      <mesh position={[0, 4.9, -3.87]} rotation-y={Math.PI} material={wallBack}>
        <planeGeometry args={[16.6, 8.6]} />
      </mesh>
      {[-8.6, 8.6].map((x) => (
        <mesh key={x} position={[x, 4.4, -3.6]} material={M.dark} castShadow>
          <boxGeometry args={[0.6, 8.8, 0.9]} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, -3.2]} material={M.white} receiveShadow>
        <boxGeometry args={[17.6, 0.4, 1.4]} />
      </mesh>
      <Billboard id="trading" pos={[9.5, 0, 4.5]} rotY={-0.55} scale={0.85} />
      </Static>
    </ZoneGroup>
  );
}
