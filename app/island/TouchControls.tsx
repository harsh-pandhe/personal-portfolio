"use client";

// On-screen controls for touch screens while walking: a thumb joystick on the left, Jump and Wave
// on the right. Dragging anywhere else on the island still turns the camera; two fingers zoom.
import { useRef, useState } from "react";
import { useDevice } from "./device";
import { useUI, world } from "./store";

const R = 52; // joystick travel, px

/** Tap a key the Player and teammates already listen for. */
function press(key: string) {
  dispatchEvent(new KeyboardEvent("keydown", { key }));
  setTimeout(() => dispatchEvent(new KeyboardEvent("keyup", { key })), 120);
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const id = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2),
      y = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y);
    if (d > R) (x *= R / d), (y *= R / d);
    setKnob({ x, y });
    world.joy.x = x / R;
    world.joy.y = y / R;
  };
  const end = () => {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    world.joy.x = world.joy.y = 0;
  };
  return (
    <div
      ref={base}
      role="application"
      aria-label="Walk joystick"
      className="relative grid h-[136px] w-[136px] touch-none place-items-center rounded-full border-2 border-white/70 bg-black/25 shadow-xl backdrop-blur-md"
      onPointerDown={(e) => {
        id.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="h-[58px] w-[58px] rounded-full bg-white/90 shadow-lg transition-transform duration-75"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

export default function TouchControls() {
  const ui = useUI();
  const { touch } = useDevice();
  if (!touch || ui.mode !== "explore" || ui.open || ui.story !== null || ui.gala !== null) return null;
  const pill = "grid h-14 w-14 place-items-center rounded-full border-2 border-white/70 bg-black/30 text-[11px] font-semibold text-white shadow-xl backdrop-blur-md active:scale-95";
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[104px] z-20 flex items-end justify-between sm:bottom-8">
      <div className="pointer-events-auto">
        <Joystick />
      </div>
      <div className="pointer-events-auto flex flex-col gap-3">
        <button className={pill} onClick={() => press(" ")} aria-label="Jump">
          Jump
        </button>
        <button className={pill} onClick={() => press("f")} aria-label="Wave">
          Wave
        </button>
      </div>
    </div>
  );
}
