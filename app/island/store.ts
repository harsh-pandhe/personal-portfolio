import { useSyncExternalStore } from "react";
import type { ZoneId } from "./zones";

export type Mode = "intro" | "explore" | "tour";

/** Per-frame values read inside useFrame (no React re-render). */
export const world = {
  night: 0, // 0 = day, 1 = night (eased)
  nightTarget: 0,
  player: { x: 0, z: 9, yaw: Math.PI, speed: 0 },
  keys: new Set<string>(),
  camYaw: 0,
  camPitch: 0.42,
  camDist: 11,
  dragging: false,
};

/** UI state shared between the canvas and the DOM overlay. */
type UI = {
  mode: Mode;
  near: ZoneId | null;
  open: ZoneId | null; // case-study panel
  tour: number; // index into TOUR
  night: boolean;
  loaded: boolean;
};

let ui: UI = { mode: "intro", near: null, open: null, tour: 0, night: false, loaded: false };
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
