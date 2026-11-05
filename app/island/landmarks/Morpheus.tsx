"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { world } from "../store";
import { Solid } from "../Props";
import { M, useGlow, Billboard, ZoneGroup } from "./common";

function rainTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, tex };
}

/* Morpheus Gate in projectmorpheus.in's own style: pixel-green CRT sign, a terminal kiosk and the
   five "levels" (domains) as monoliths. */
function crt(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return { c, tex, mat: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 1, color: "#000000" }) };
}
const LEVELS = ["EDTECH", "HEALTHCARE", "WOMEN SAFETY", "AGRITECH", "FINTECH"];
function MorpheusSigns() {
  const pix = useMemo(() => {
    const v = typeof document !== "undefined" ? getComputedStyle(document.body).getPropertyValue("--font-pixel").trim() : "";
    return v || "monospace";
  }, []);
  const sign = useMemo(() => crt(1024, 256), []);
  const term = useMemo(() => crt(512, 384), []);
  const lv = useMemo(() => LEVELS.map(() => crt(256, 512)), []);
  const scan = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = "rgba(0,0,0,.35)";
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  };
  useEffect(() => {
    let live = true;
    // the pixel font has to be loaded before it can be drawn into a canvas
    document.fonts
      .load(`20px ${pix}`)
      .catch(() => [])
      .then(() => live && paint());
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix]);
  const paint = () => {
    const g = sign.c.getContext("2d")!;
    g.fillStyle = "#020702";
    g.fillRect(0, 0, 1024, 256);
    g.font = `64px ${pix}`;
    g.fillStyle = "#0a5a14";
    g.fillText("PROJECT MORPHEUS", 46, 150);
    g.fillStyle = "#22ff4c";
    g.fillText("PROJECT MORPHEUS", 40, 144);
    g.font = `18px ${pix}`;
    g.fillStyle = "#ff2d2d";
    g.fillText("[SENTINEL] ACTIVE · SIT LONAVALA · FEB 26 2026", 40, 214);
    scan(g, 1024, 256);
    sign.tex.needsUpdate = true;
    lv.forEach((q, i) => {
      const x = q.c.getContext("2d")!;
      x.fillStyle = "#020702";
      x.fillRect(0, 0, 256, 512);
      x.strokeStyle = "#22ff4c";
      x.lineWidth = 6;
      x.strokeRect(10, 10, 236, 492);
      x.fillStyle = "#22ff4c";
      x.font = `20px ${pix}`;
      x.fillText(`LEVEL 0${i + 1}`, 30, 70);
      x.font = `16px ${pix}`;
      LEVELS[i].split(" ").forEach((w, k) => x.fillText(w, 30, 260 + k * 34));
      x.fillStyle = "rgba(34,255,76,.5)";
      x.font = `12px ${pix}`;
      x.fillText("> HOVER TO DECRYPT", 24, 470);
      scan(x, 256, 512);
      q.tex.needsUpdate = true;
    });
  };
  const acc = useRef(0);
  useFrame(({ clock }, dt) => {
    const n = world.night;
    sign.mat.emissiveIntensity = term.mat.emissiveIntensity = 0.9 + n * 1.2;
    lv.forEach((q) => (q.mat.emissiveIntensity = 0.7 + n * 1.2));
    acc.current += dt;
    if (acc.current < 0.12) return;
    acc.current = 0;
    const t = clock.elapsedTime;
    const line = "WAKE UP. BUILD THE FUTURE.";
    const k = Math.floor(t * 8) % (line.length + 16);
    const g = term.c.getContext("2d")!;
    g.fillStyle = "#020702";
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = "#22ff4c";
    g.font = `14px ${pix}`;
    g.fillText("oracle@morpheus:~$ ./wake.exe", 22, 44);
    g.font = `18px ${pix}`;
    g.fillText(line.slice(0, Math.min(k, line.length)) + (Math.floor(t * 2) % 2 ? "_" : " "), 22, 110);
    const stats: [string, string][] = [
      ["24", "HOURS"],
      ["5", "DOMAINS"],
      ["2L+", "PRIZES"],
    ];
    stats.forEach(([v, l], i) => {
      g.fillStyle = "#22ff4c";
      g.font = `30px ${pix}`;
      g.fillText(v, 22 + i * 165, 220);
      g.fillStyle = "rgba(34,255,76,.6)";
      g.font = `12px ${pix}`;
      g.fillText(l, 22 + i * 165, 250);
    });
    g.fillStyle = "#ff2d2d";
    g.font = `12px ${pix}`;
    g.fillText("RED PILL OR BLUE PILL?", 22, 330);
    scan(g, 512, 384);
    term.tex.needsUpdate = true;
  });
  return (
    <group>
      {/* the name across the top of the portal */}
      <group position={[0, 12.4, -4]}>
        <mesh material={sign.mat} position={[0, 0, 0.06]}>
          <planeGeometry args={[10, 2.5]} />
        </mesh>
        <mesh material={sign.mat} position={[0, 0, -0.06]} rotation-y={Math.PI}>
          <planeGeometry args={[10, 2.5]} />
        </mesh>
        <mesh material={M.dark}>
          <boxGeometry args={[10.4, 2.8, 0.1]} />
        </mesh>
        {[-3, 3].map((x) => (
          <mesh key={x} position={[x, -1.55, 0]} material={M.dark}>
            <boxGeometry args={[0.18, 0.5, 0.18]} />
          </mesh>
        ))}
      </group>
      {/* terminal kiosk */}
      <group position={[9, 0, 4]} rotation-y={-0.7}>
        <Solid w={1.8} d={1} />
        <mesh position={[0, 0.6, 0]} material={M.dark} castShadow>
          <boxGeometry args={[1.6, 1.2, 0.8]} />
        </mesh>
        <mesh position={[0, 1.75, -0.1]} rotation-x={-0.2} material={term.mat}>
          <planeGeometry args={[2, 1.5]} />
        </mesh>
        <mesh position={[0, 1.75, -0.15]} rotation-x={-0.2} material={M.dark}>
          <boxGeometry args={[2.15, 1.65, 0.06]} />
        </mesh>
      </group>
      {/* the five levels */}
      {LEVELS.map((_, i) => {
        const a = ((-64 + i * 32) * Math.PI) / 180;
        const x = Math.sin(a) * 11,
          z = -Math.cos(a) * 11 - 2;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={-a}>
            <Solid w={1.5} d={0.5} />
            <mesh position={[0, 1.6, 0]} material={M.dark} castShadow>
              <boxGeometry args={[1.5, 3.2, 0.5]} />
            </mesh>
            <mesh position={[0, 1.6, 0.26]} material={lv[i].mat}>
              <planeGeometry args={[1.4, 3.05]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* The portal: a swirling tunnel of green code inside a standing ring. */
function portalMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: { uT: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float uNight; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 p = vUv*2.0-1.0; float r = length(p); if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        // log-polar tunnel: rings rush toward the centre while the whole thing turns
        float depth = 0.35/(r+0.05) + uT*0.9;
        float ang = a/6.2831 + uT*0.05 + 0.15/(r+0.1);
        vec2 cell = floor(vec2(ang*42.0, depth*6.0));
        float glyph = step(0.55, h(cell)) * (0.5 + 0.5*sin(uT*6.0 + h(cell+1.0)*40.0));
        float streak = smoothstep(0.0, 0.25, fract(depth*6.0)) * (1.0 - fract(depth*6.0));
        vec3 green = vec3(0.13, 1.0, 0.36);
        vec3 col = green * glyph * streak * 1.6 + vec3(0.02,0.12,0.05);
        col += vec3(0.7,1.0,0.8) * smoothstep(0.25, 0.0, r) * 0.9;      // the light at the end
        col += green * smoothstep(0.82, 1.0, r) * 0.8;                   // rim glow
        gl_FragColor = vec4(col, 0.94);
      }`,
  });
}

function PillPlinth({ color, label, x }: { color: string; label: string; x: number }) {
  const pill = useRef<THREE.Group>(null);
  const glow = useGlow(color, 0.6, 2.4);
  const tag = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#020702";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = color;
    g.font = "700 44px ui-monospace, monospace";
    g.textAlign = "center";
    g.fillText(label, 256, 80);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.9 });
  }, [color, label]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pill.current) {
      pill.current.rotation.y = t * 0.6 + x;
      pill.current.position.y = 2.75 + Math.sin(t * 1.4 + x) * 0.18;
    }
  });
  return (
    <group position={[x, 0, 1.5]}>
      <Solid r={1.3} />
      <mesh position={[0, 0.55, 0]} material={M.dark} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.3, 1.1, 8]} />
      </mesh>
      <mesh position={[0, 1.12, 0]} rotation-x={-Math.PI / 2} material={glow}>
        <ringGeometry args={[0.75, 0.95, 32]} />
      </mesh>
      {[0, Math.PI].map((r) => (
        <mesh key={r} position={[Math.sin(r) * 1.22, 0.55, Math.cos(r) * 1.22]} rotation-y={r} material={tag}>
          <planeGeometry args={[1.5, 0.38]} />
        </mesh>
      ))}
      <group ref={pill}>
        <mesh rotation-z={Math.PI / 2.6} castShadow>
          <capsuleGeometry args={[0.42, 1.0, 10, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>
      <pointLight position={[0, 2.6, 0]} color={color} intensity={6} distance={7} />
    </group>
  );
}

export function Morpheus() {
  const { c, tex } = useMemo(rainTexture, []);
  const drops = useRef<number[]>(Array.from({ length: 16 }, () => Math.random() * 30));
  const acc = useRef(0);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 1.1, color: "#000000" }), [tex]);
  const ring = useGlow("#19e36b", 0.7, 3);
  const portal = useMemo(portalMaterial, []);
  const floor = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#050a06";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#0f5a22";
    g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 512);
      g.moveTo(0, i);
      g.lineTo(512, i);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.4 });
  }, []);
  useFrame(({ clock }, dt) => {
    portal.uniforms.uT.value = clock.elapsedTime;
    floor.emissiveIntensity = 0.3 + world.night * 1.2;
    acc.current += dt;
    if (acc.current < 0.07) return;
    acc.current = 0;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, 0, 256, 512);
    g.font = "bold 16px monospace";
    drops.current.forEach((y, i) => {
      g.fillStyle = Math.random() > 0.9 ? "#d6ffe6" : "#19e36b";
      g.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)), i * 16, y * 16);
      drops.current[i] = y * 16 > 512 && Math.random() > 0.95 ? 0 : y + 1;
    });
    tex.needsUpdate = true;
  });
  const R = 4.8;
  return (
    <ZoneGroup id="morpheus">
      {/* the gate's floor: a dark glass disc with a green grid */}
      <mesh position={[0, 0.04, -2]} rotation-x={-Math.PI / 2} material={floor} receiveShadow>
        <circleGeometry args={[11.5, 64]} />
      </mesh>
      {/* the portal on its stepped plinth */}
      <Solid w={11} d={2.6} position={[0, 0, -4]} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.4, -4]} material={M.dark} castShadow receiveShadow>
          <boxGeometry args={[11 - i * 1.6, 0.4, 2.6 - i * 0.5]} />
        </mesh>
      ))}
      <group position={[0, R + 1.3, -4]}>
        <mesh material={ring} castShadow>
          <torusGeometry args={[R, 0.42, 16, 72]} />
        </mesh>
        <mesh material={M.dark}>
          <torusGeometry args={[R + 0.55, 0.2, 10, 72]} />
        </mesh>
        <mesh material={portal}>
          <circleGeometry args={[R - 0.2, 64]} />
        </mesh>
      </group>
      {/* code-rain pillars either side */}
      {[-7.2, 7.2].map((x) => (
        <group key={x} position={[x, 0, -4]}>
          <Solid w={1.5} d={1.5} />
          <mesh position={[0, 3.2, 0]} material={M.dark} castShadow>
            <boxGeometry args={[1.4, 6.4, 1.4]} />
          </mesh>
          {[0.71, -0.71].map((z) => (
            <mesh key={z} position={[0, 3.2, z]} rotation-y={z > 0 ? 0 : Math.PI} material={mat}>
              <planeGeometry args={[1.25, 6.1]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* the choice */}
      <PillPlinth color="#ff2b2b" label="RED PILL · WAKE UP" x={-4.2} />
      <PillPlinth color="#2b6bff" label="BLUE PILL · SLEEP" x={4.2} />
      <MorpheusSigns />
      <Billboard id="morpheus" pos={[-9.5, 0, 8.5]} rotY={0.6} scale={0.85} />
    </ZoneGroup>
  );
}
