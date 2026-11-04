# Mission Island — redesign notes (round 1)

Feedback from Harsh on the live preview, with the cause found in the code where one is known. More rounds will follow; append below.

## Round 1 change list

| # | Feedback | Where / likely cause | Plan |
|---|----------|----------------------|------|
| 1 | First screen (loader + hero) should be smoother and lag-free | Loader counts up while the full world mounts behind it; ~7k lines of scene, 38k grass blades, 340 trees, show particles, weather all start together | Mount the hero view with a lighter scene first, stream the rest in after first paint; lower DPR and shadows on the hero; defer grass, people, traffic, weather until idle |
| 2 | Drone show is stuck in the air and turns with the camera | `app/island/Show.tsx:74-76` — outside the gala the holder is placed opposite the camera at 85 units and rotated to face it | Anchor the show to a fixed world position over the sea (the gala position) and never move it with the camera |
| 3 | Show looks ugly (DNA helix, "HARSH", looks like "hank yo") | `app/island/shapes.ts` — sampled text and generic shapes; letters unreadable at this distance and particle count | Redesign as a story: a sequence of scenes (drone to a swarm to a map to a rocket to a trophy to a handshake) with moving transitions, real drone-show look (warm point lights, slow ascents, tight grid launch from the pier, synchronised colour changes), readable only where text adds value |
| 4 | Lighthouse light only reaches a short distance | Beam cone is too short | Longer beam that sweeps across the sea, with a faint volumetric glow and a light pool on the water |
| 5 | More ships | A few sailboats only | Add cargo ships and ferries on lanes toward the Navi Mumbai skyline, plus more sailboats and navigation lights at night |
| 6 | Cars are wrong | Traffic on the ring road (KayKit cars) — orientation, lane position, spacing or speed look off | Check model forward axis, put cars on a lane centreline, follow the road spline, stop for visitors at crossings |
| 7 | Better roads | Roads are flat ribbons on the terrain | Properly built roads: lane markings, kerbs, junction geometry, bridges, sloped sections that follow the terrain |
| 8 | Bigger island, not flat | `app/island/terrain.ts` — small footprint and gentle height | Enlarge the island and add real elevation (hills, ridge, cliffs, valleys), then re-place zones, roads and trees on the new heightfield |
| 9 | Trees disappear and stop rendering | `app/island/Env.tsx:122+` — instanced meshes for trunks, crowns and pines still have frustum culling on. Their bounding sphere is computed from the base geometry before instance matrices are written, so the whole forest is culled when the camera looks away from the origin | Set `frustumCulled={false}` on all three meshes (or recompute bounds after the matrices are set); check the other instanced meshes in the same file |
| 10 | NPC speech is stacked into one narrow line | `app/island/Actors.tsx:384-392` — the thought bubble is a `rounded-full` pill with no width, wrap or max-width, rendered inside drei `<Html>` | Give it `w-max max-w-[220px] whitespace-normal`, `rounded-2xl`, and balanced line breaks |

## Research: what exists and what is missing

Already collected (see `research/README.md`): dossier, 161 LinkedIn posts with full text, SSRN list, repo inventory, own papers.

Images: **not downloaded.** `research/linkedin/image_manifest.json` lists 65 post images (one best-resolution URL each, 65 posts). The session's network policy blocks `media.licdn.com`, so nothing could be fetched. The URLs also carry no signature token, so LinkedIn may refuse them even once the host is allowed. Most reliable route: Harsh exports the LinkedIn data archive, or drops the key images (SIH win, IRoC-U, RoboRashtra, Doppelmayr, Morpheus, Bentley summit) into a folder.

Still not captured (from `research/linkedin/posts_summary.md`): comments and reactions, full text of some long posts, certificates, team photos.

## Section plan (draft, to confirm)

Each zone gets one story, one proof (number, image or demo) and one call to action. Content comes from `lib/achievements.ts` and `app/island/zones.ts`.

| Zone | Story | Proof / media needed |
|------|-------|----------------------|
| Mission Control (hq) | Who Harsh is, in one line | Portrait, headline stats (SIH winner, 6 papers, 25+ builds) |
| The Arena | Hackathons: SIH 2025 national winner, RoboRashtra runner-up, Singapore–India Hackathon (15–17 Nov 2026, SMU) | Winning deck slides, trophy and team photos |
| Mars Yard | IRoC-U 2026 Finalist, GPS-denied UAV stack, Sovereign-X avionics | Sim screenshots, drone and hardware photos, LiDAR plots |
| Swarm Field | MARS multi-agent swarm, MAPPO, safety filters | Failure-injection telemetry, swarm sim clip |
| Ropeway Ridge | Doppelmayr internship (16 Apr–15 Oct 2026, ended), RopeIQ | Any shareable screenshots, newspaper feature |
| Trading Floor | AlgoTrade: 20 phases, rejected hypotheses, audits | Equity curve, audit write-ups |
| The Workshop | Product builds: Aura, Harsh OS, AgriTrace, Ather Co-Pilot | App screenshots |
| Research Library | 6 SSRN papers, negative-result philosophy | Paper covers, SSRN links |
| Morpheus Gate | Project Morpheus hostel ops platform and hackathon organiser role | Site screenshots, event photos |
| Home | Contact, say hello | Links only |

## Open questions for Harsh

- Is the gala show meant to run on demand only, or also as an idle ambient show at night?
- Which 10–15 photos or slides should be the "hero" media?
- Keep the Doppelmayr zone, or fold it into Workshop now that the internship has ended?
