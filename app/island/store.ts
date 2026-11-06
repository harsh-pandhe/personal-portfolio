import { useSyncExternalStore } from "react";
import { zoneById, zonePos, type ZoneId } from "./zones";

export type Mode = "intro" | "explore" | "tour";

/** Per-frame values read inside useFrame (no React re-render). */
export const world = {
  night: 0, // 0 = day, 1 = night (eased)
  nightTarget: 0,
  player: { x: 0, z: 23, yaw: Math.PI, speed: 0 },
  keys: new Set<string>(),
  joy: { x: 0, y: 0 }, // on-screen joystick, -1..1 (y down = backward)
  camYaw: 0,
  camPitch: 0.42,
  camDist: 11,
  dragging: false,
  target: null as null | { x: number; z: number }, // click-to-walk destination
  gala: 0, // 0..1 while the gala drone show runs
  rain: 0, // 0..1 eased rain amount
  rainTarget: 0,
  cloud: 0.3, // 0..1 cloud cover
  shot: null as null | { pos: [number, number, number]; look: [number, number, number] }, // story-mode camera
  cut: false, // jump straight to the shot this frame (a film cut) instead of easing toward it
};

/** UI state shared between the canvas and the DOM overlay. */
type UI = {
  mode: Mode;
  near: ZoneId | null;
  open: ZoneId | null; // case-study panel
  tour: number; // index into TOUR
  night: boolean;
  loaded: boolean;
  compiled: boolean; // shaders for the first screen are built
  medals: number[]; // indices of found medals
  weatherMode: "live" | "clear" | "monsoon";
  timeMode: "manual" | "live";
  weather: import("./weather").WeatherNow | null;
  sound: boolean;
  music: boolean;
  settings: boolean;
  story: number | null; // chapter index while story mode runs
  gala: number | null; // formation index while the gala show runs
  toast: { id: number; title: string; body?: string } | null;
  help: boolean;
  panel: boolean; // left sidebar shown
};

let ui: UI = {
  mode: "intro",
  near: null,
  open: null,
  tour: 0,
  night: false,
  loaded: false,
  compiled: false,
  medals: [],
  toast: null,
  help: false,
  weatherMode: "live",
  timeMode: "manual",
  weather: null,
  sound: false,
  music: false,
  settings: false,
  story: null,
  gala: null,
  panel: true,
};

let toastId = 0;
export function toast(title: string, body?: string) {
  setUI({ toast: { id: ++toastId, title, body } });
}
const subs = new Set<() => void>();

export function setUI(patch: Partial<UI>) {
  let changed = false;
  for (const k in patch) {
    const key = k as keyof UI;
    if (ui[key] !== patch[key]) changed = true;
  }
  if (!changed) return;
  ui = { ...ui, ...patch };
  if (patch.night !== undefined) world.nightTarget = patch.night ? 1 : 0;
  subs.forEach((f) => f());
}

export function getUI() {
  return ui;
}

export function useUI() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => ui,
    () => ui
  );
}

export const TOUR: ZoneId[] = ["hq", "arena", "marsyard", "swarm", "ropeway", "trading", "workshop", "library", "morpheus", "home"];

/** Put the player at a zone's approach, facing it, and switch to walking. */
export function travel(id: ZoneId) {
  const z = zoneById[id];
  const [x, zz] = zonePos(z);
  const k = z.radius ? (z.radius - 15) / z.radius : 0;
  world.player.x = z.radius ? x * k : 0;
  world.player.z = z.radius ? zz * k : 23;
  world.player.yaw = Math.atan2(x - world.player.x, zz - world.player.z) || Math.PI;
  world.camYaw = world.player.yaw + Math.PI;
  world.target = null;
  setUI({ mode: "explore", open: null });
}
