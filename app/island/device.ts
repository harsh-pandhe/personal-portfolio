// What kind of screen and input we're on. Read once for the renderer (it can't change tier mid-session)
// and live for the UI (rotating a phone or resizing a window re-lays the overlay).
import { useSyncExternalStore } from "react";

export type Device = {
  phone: boolean; // narrow screen: bottom dock and sheets instead of the sidebar
  tablet: boolean;
  touch: boolean; // coarse pointer: on-screen controls instead of key hints
  portrait: boolean;
  low: boolean; // phone, or a device reporting little memory or few cores: lighter renderer
};

const SERVER: Device = { phone: false, tablet: false, touch: false, portrait: false, low: false };

function read(): Device {
  if (typeof window === "undefined") return SERVER;
  const w = window.innerWidth,
    h = window.innerHeight;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const phone = Math.min(w, h) < 600 || w < 768;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low = phone || (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  return { phone, tablet: !phone && touch, touch, portrait: h > w, low };
}

let current = read();
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  const update = () => {
    const next = read();
    if (Object.keys(next).some((k) => next[k as keyof Device] !== current[k as keyof Device])) {
      current = next;
      subs.forEach((f) => f());
    }
  };
  addEventListener("resize", update);
  addEventListener("orientationchange", update);
}

/** Visitors who asked their OS for less motion: the overview camera holds still. */
export const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The device as it was when the page loaded (for renderer settings). */
export const DEVICE = current;

/** The device right now, re-rendering on rotation and resize. */
export function useDevice() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => SERVER
  );
}
