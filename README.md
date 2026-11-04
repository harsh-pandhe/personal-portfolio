# Harsh Pandhe — Mission Island

A portfolio you can fly through. A walkable 3D island built with Next.js and React Three Fiber, where every place is a piece of Harsh's work: the Smart India Hackathon arena, the ISRO IRoC-U Mars yard, the MARS swarm field, Doppelmayr's ropeway ridge, the AlgoTrade floor, a research library of six SSRN papers, Project Morpheus, a workshop of 25 builds, and home.

- **Explore:** WASD or click to walk, E to open a place, 0–9 to fast-travel, `?` for every control.
- **Watch the story (M):** nine cinematic chapters, ending in the gala.
- **Gala night (G):** a drone show with formations, fireworks, searchlights and a crowd on the beach.
- **Live Navi Mumbai:** weather from Open-Meteo (rain, cloud cover, monsoon mode) and an optional live IST day/night.
- **Sound:** waves, birds, crickets, rain, interface sounds and a lo-fi loop, all synthesised with WebAudio (off until you turn it on).
- **Read mode:** every case study on one plain page at `/read`; visitors without WebGL are sent there automatically.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Add `?lite` for a lighter render (no shadows or grass, lower resolution).

## Where things live

| Path | What it is |
| --- | --- |
| `lib/achievements.ts` | Source of truth for facts: missions, papers, projects, experience |
| `app/island/zones.ts` | Where each place sits and its short copy |
| `app/island/cases.ts` | The long-form case study for each place |
| `app/island/Story.tsx` | Story chapters and the gala programme pacing |
| `app/island/Show.tsx` | Drone-show formations, fireworks, searchlights |
| `app/island/Landmarks.tsx`, `Extras.tsx`, `Decor.tsx`, `Paths.tsx`, `City.tsx` | The world |
| `app/island/Actors.tsx`, `People.tsx` | Player, robot villagers, human visitors, medals, camera |
| `app/island/weather.ts`, `Weather.tsx` | Live weather and rain |
| `app/island/audio.ts` | Synthesised sound and music |
| `app/read/page.tsx` | The plain reading page |
| `public/models/` | 3D models — see `CREDITS.md` there |
| `docs/LAUNCH_PLAN.md` | What's done and what's left before launch |

## Credits

3D models: EDU-450 quadcopter from elodin-sys/elodin (Apache-2.0); RobotExpressive by Tomás Laulhé (CC0); KayKit Adventurers and City Builder Bits by Kay Lousberg (CC0). Weather data: Open-Meteo.
