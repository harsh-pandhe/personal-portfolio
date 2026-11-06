import type { Config } from "tailwindcss";

// Design tokens for Mission Island. Type: Bricolage Grotesque (display), Inter Tight (text), Instrument Serif (accent italics), DM Mono (labels).
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#121417",
        paper: "#f3f3f1",
        brand: { blue: "#2d5bff", cyan: "#00d2ff", mint: "#12f0c0", go: "#22d36b", violet: "#7a4dff" },
      },
      keyframes: {
        grow: { from: { width: "0%" }, to: { width: "100%" } },
        rise: { from: { transform: "translateY(40%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        dip: { from: { opacity: "0.92" }, to: { opacity: "0" } },
        pop: { from: { transform: "scale(.6) translateY(8px)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
