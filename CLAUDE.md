# Project context for Claude (local and cloud sessions)

This repo is Harsh Pandhe's portfolio (Next.js 15.5, React 19, React Three Fiber). The home page is "Mission Island", a walkable 3D island in `app/island/`; `/read` is every case study as one plain page (also the fallback for browsers without WebGL).

Where things live in `app/island/`:
- `zones.ts` (zone layout and copy, built from `lib/achievements.ts`), `cases.ts` (case-study pages), `terrain.ts` (island shape, roads, pads, cached height grid)
- `landmarks/` one file per zone (`common.tsx` has Billboard, ZoneGroup, shared materials); `Landmarks.tsx` composes them
- `Props.tsx` benches, flags, lamps, `<Solid>` colliders and `<Static>`/`bakeStatic` mesh merging; `colliders.ts` the collision world
- `Show.tsx` + `shapes.ts` the drone show (formations matched along a Hilbert curve)
- `device.ts` phone/touch/low-power tiers; `TouchControls.tsx` joystick; phones get a bottom dock and sheet menu
- 3D models in `public/models/` (CREDITS.md); `assets-src/scripts/island_props.py` rebuilds ships, trees and the ropeway station headless in Blender

`?lite` forces the lightest renderer. In development `window.__island` (world, travel, setUI), `__scene`, `__camera` and `__gl` are available in the console.
The public URL comes from `NEXT_PUBLIC_SITE_URL` (else Vercel's production domain); harshpandhe.com is not attached yet. Plans and audit notes are in `docs/`.

`research/` holds everything collected about Harsh (2026-11-04, plus `research/accounts/github_profile_2026-11-05.md`). Start with `research/README.md`:
- `research/01_dossier.md` — profile, education, achievements, projects
- `research/linkedin/posts_full.json` — all 161 LinkedIn posts, full text
- `research/accounts/` — SSRN author page (6 papers), Gmail findings, ChatGPT/Gemini themes and titles, repo inventory
- `research/papers/` — own research PDFs

Facts to keep consistent: Doppelmayr internship ran 16 Apr–15 Oct 2026 (ended); IRoC-U 2026 is "Finalist"; Singapore–India Hackathon Grand Finale is 15–17 Nov 2026 at SMU.
