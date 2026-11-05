# Mission Island — launch plan

What the portfolio needs before it goes live. `[x]` done, `[ ]` still open.

## 1. World and scene
- [x] Island terrain, sea, sky dome, day/night, three layered mountain ranges
- [x] Ten themed zones with landmarks, billboards and animated extras
- [x] Roads with curbs, roundabout, promenades, crossings, footpaths, signposts
- [x] Lighthouse, pier, sailboats, birds, flags, benches, planters, beach rocks
- [x] Robot villagers with roles, thoughts, questions, waving and toppling
- [x] Human visitors (KayKit Adventurers, CC0): fans, readers on benches, walkers, workers, a gala crowd
- [x] Traffic on the ring road (KayKit cars, CC0): taxis, sedan, hatchback, police; they stop for you
- [x] Navi Mumbai skyline across the water with lit windows at night and a creek bridge
- [x] Live Navi Mumbai weather (Open-Meteo): rain, cloud cover, lightning; Clear and Monsoon overrides
- [x] Live IST day/night option

## 2. Story and show
- [x] Story mode: nine chapters with letterbox, typed subtitles and slow camera moves
- [x] Gala night: eight formations with captions, fireworks, searchlights, beach crowd cheering
- [x] Drone formations: name, trophy, quadcopter, helix, rings, rocket, globe, thank-you

## 3. Sound
- [x] Ambience: waves, wind, birds by day, crickets at night, rain, thunder
- [x] Interface sounds: open, close, click, chapter, medal, fireworks
- [x] Lo-fi music loop; brighter gala track while the show runs
- [x] Off until the visitor turns it on

## 4. UI / UX
- [x] Left panel, hero, tour, case-study pages, minimap, toasts, help sheet
- [x] Settings sheet: sound, music, weather, time of day, quality
- [x] Weather and IST clock chip, sound toggle
- [x] One type system (Inter Tight / Instrument Serif / DM Mono) and colour tokens in tailwind.config.ts
- [x] Visible keyboard focus; reduced-motion respected for CSS animation
- [x] Read mode at /read, and automatic fallback there when WebGL isn't available

## 5. Launch hygiene
- [x] Old page components, unused UI kit and 30+ unused dependencies removed
- [x] README for the new site
- [x] Metadata, Open Graph image (public/og.jpg), icon, robots.txt, sitemap
- [x] Model credits in public/models/CREDITS.md
- [ ] Decide what to do with `research/` (ChatGPT titles and Gmail notes in a public repo) — owner's call
- [ ] Point harshpandhe.com at Vercel (metadata already uses it) — owner's call
- [ ] Mobile layout and touch controls (desktop-only by request for now)
- [ ] A real photo or illustrated avatar for the panel (initials for now)
- [ ] Check performance on a mid-range laptop GPU and tune shadow/grass budgets if needed
