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

## Round 2 change list

Feedback after walking the island (screenshots of Ropeway Ridge, Trading Floor, Home and The Arena).

| # | Feedback | Where / likely cause | Plan |
|---|----------|----------------------|------|
| 11 | NPC speech still stacked one word per line (seen at Ropeway, Home, Arena) | Same as #10: `Actors.tsx:384` thought bubble has no width or wrap | Fix together with #10; verify in a screenshot at every zone |
| 12 | Cars look wrong: tiny, odd orange and white fragments on the road | Traffic on the ring road; model scale and lamp or lane-marking pieces read as debris | Fix scale, forward axis and lane position (see #6); remove stray lamp meshes; check at road level |
| 13 | A person sits on a bench next to the bull on the Trading Floor, overlapping it | Bench positions are a fixed rule, 6.2 m from the zone centre (`Decor.tsx`, `People.tsx`), with no check against landmarks | Place benches per zone with explicit clearance from landmarks and billboards |
| 14 | Reference: https://www.projectmorpheus.in/ | Blocked by the session network policy (403) | Needs the host allowed, or screenshots and copy from Harsh; use it for the Morpheus Gate zone and the visual language |
| 15 | Pull pictures from LinkedIn for every section and download them | `media.licdn.com` blocked; see the research section below | Needs the host allowed, or a LinkedIn data export, or photos dropped in a folder |
| 16 | Add a Singapore landmark (Merlion, or the three-tower ship building, Marina Bay Sands) | Not in the scene | Add a Marina Bay Sands style skyline with the Merlion across the water, tied to the Singapore–India Hackathon (15–17 Nov 2026, SMU) |
| 17 | Expand each section area | Zones are small plazas | Larger footprint per zone with its own props, paths and planting; relies on the bigger island (#8) |
| 18 | Proper roads, greenery and surroundings | Roads are flat ribbons; greenery is scattered trees and grass | Part of #7 and #8: proper road network, hedges, lawns, flower beds, tree lines |
| 19 | Arena: crowd is bouncing dots, wants real humans; stadium bigger; rigid bodies must not be walked through | Crowd is an instanced capsule mesh with bounce in `Extras.tsx`; the stadium has no collision | Seat real human models (the KayKit people already in `public/models/people`) in tiered stands; enlarge the bowl; add colliders for the stands, trophy and walls |
| 20 | Mars Yard: drone propellers do not rotate | `PropDiscs` in `Landmarks.tsx:339` is a static blur disc; the `quad-f450.glb` rotors are not animated | Spin the actual rotor meshes (blur disc only at speed), hover bob, tilt on movement |
| 21 | Every section can be improved drastically | Round 1 zones are placeholders for the story | Rework zone by zone against the section plan below; one session per zone |
| 22 | Multi-robot system (Swarm Field) should be properly built | Villagers and swarm field are decorative | Real swarm demo: robots with roles, coverage grid, failure injection and recovery as in the MARS papers, readable HUD |
| 23 | "My journey" section from school onward | Not present | New journey path through the island: school, diploma in Solapur, SIT Lonavala, hackathons, Doppelmayr, IRoC-U, Singapore; needs school details from Harsh |
| 24 | Better cinematic story: multiple angles, more control over the flow | `Story.tsx` has nine chapters with one slow camera move each | Multi-shot chapters (wide, tracking, close-up, drone POV); pause, rewind, skip, chapter list, speed control, captions toggle |
| 25 | Bigger ropeway across 2 or 3 mountains over the city | Ropeway Ridge is one short line | Multi-span ropeway with towers and cabins over several peaks and the city below |
| 26 | Trading Floor: big screen with Nifty 50, gold and profit and loss | A small billboard | Large trading wall: Nifty 50 and gold charts, P&L, rejected-hypothesis ticker; use real figures only from the research (no invented numbers) |
| 27 | Robotic arm should look real, import a real model | Current arm is hand-built primitives | Import a CC0 or permissively licensed industrial arm GLB, credit it in `public/models/CREDITS.md`, add joint animation |
| 28 | Distant mountains look like pyramids | Three layered ranges in `Env.tsx` use simple cone-like profiles | Noise-based ridgelines with layered haze, snow caps and proper silhouettes |

## Round 3 change list

Feedback after opening the case-study pages (Arena, Mars Yard, Swarm Field, Ropeway, Morpheus Gate).

| # | Feedback | Where / likely cause | Plan |
|---|----------|----------------------|------|
| 29 | Arena case-study page is weak (flat trophy, confetti) | `app/island/CaseStudy.tsx` and `cases.ts`: every page is a generic stat row plus one drawn hero | Redesign per page around real media (team photos, deck slides, Flow video), timeline of the SIH 2025 run, result card |
| 30 | Mars Yard page is weak (a flat drone drawing) | Same | Real sim footage, LiDAR and FAST-LIO visuals, a short Flow video, a 3D drone with spinning rotors |
| 31 | Ropeway page is weak | Same | Multi-peak ropeway scene (see #25), Doppelmayr work only where shareable |
| 32 | Morpheus page is weak | Same; green rain and two circles | Match the real Project Morpheus site look (needs the site, see #14), event photos, registration stats |
| 33 | Swarm page is weak | Same; a static grid | Live swarm sim as the hero (see #22) |
| 34 | Use the Flow connector and Google Flow to generate good videos, put them in the pages | Not available in this session (no Flow connector loaded, no folder attached) | Needs the connector or Flow exports from Harsh; embed as muted looping video per page with posters |
| 35 | Make good 3D with local Blender and its connector | Blender connector not available here | Needs Blender attached via a computer folder or exported GLBs; otherwise import CC0 models |
| 36 | Workshop: the project list is long, wants figma-board style cards of different sizes, scattered, connected by wires, a big decorative board | Workshop is a plain list | One large board: cards of varied size and shape for every project (apps, drones, tools), wire connectors, pan and zoom, click to open |
| 37 | Home page feels like a child's drawing | `Landmarks.tsx` Home house: primitive boxes and a flat roof | Rebuild Home as a believable Navi Mumbai home with detail, planting and lighting; it carries the contact call to action |
| 38 | More education: school onward | Not in the content | Add an education timeline from school to SIT Lonavala; needs school names and years from Harsh |
| 39 | Mission Control can be better | Hero zone | Rework as a control room with live panels (hackathon countdown, status, stats) |
| 40 | Deep research on Harsh: LinkedIn, GitHub, other accounts, launched mobile apps, all projects; find what's missing; add sections | Research covers LinkedIn text, SSRN, repo inventory; no live browsing, no app-store pass | Needs a browser session on Harsh's machine or exports; then add sections for apps, GitHub projects, education, certificates, volunteering |
| 41 | Expand the island | See #8 | Larger island with the new zones |
| 42 | City centre from Solapur to Singapore: a fountain or landmark, better storytelling | Home to Singapore link is only a sign | Central plaza with a fountain and a path of milestones from Solapur to Singapore |
| 43 | Cleaner, more cinematic story | See #24 | Same plan, multi-angle shots and controls |
| 44 | Verify every listed change in the browser with proof | I can run Chromium locally, so this part is possible | Screenshot or short capture per change at the end of each batch, attached to the PR |

## What I cannot reach from this session

- Your browser, Blender, Google Flow and the Flow repo: no connector loaded, no computer folder attached.
- `media.licdn.com` and `projectmorpheus.in`: blocked by the network policy.
- Without those, media and the real Morpheus look stay open; code, layout and 3D work can proceed with CC0 models.

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
