# Round 5 plan: finish the product (2026-11-05)

Audit of the whole platform: the live deployment and the local build were checked in headless Chrome
(RTX 4060) on six screen sizes (1440, 1280, iPad Pro 11, iPhone 14, iPhone SE, Pixel 7). I also
searched Google for "Harsh Pandhe" in Harsh's own Chrome and read his GitHub profile README for new facts.

## What the audit found

### Reach: nobody who searches finds the site
- **harshpandhe.com does not resolve** (no DNS). Canonical URL, sitemap, robots, OpenGraph, the GitHub
  README and the LinkedIn links all point at it.
- The repo's homepage link (`personal-portfolio-pi-fawn-65.vercel.app`) is a dead deployment (404).
  Only per-deployment URLs work.
- Google "Harsh Pandhe": LinkedIn, a skills.rest scrape, the GitHub README, dev.to, and many
  "Harsh Pandey" results. The portfolio is not indexed.
- The homepage HTML that crawlers get has **9 words**, no `<h1>`, no structured data and no canonical URL (the
  island is client-only). `/read` has 4,440 words but **ten `<h1>`s**.

### Mobile: the site is a desktop site on phones
- No responsive breakpoints anywhere in `app/` (one stray file).
- Island on a phone: the desktop sidebar covers the whole screen, the hero headline is hidden, and
  there are no touch controls. Keyboard hints (WASD, E, M, G) are shown to people without keyboards.
- `/read` on a phone lays out at **683 px** instead of 390 (the browser zooms out). Four-column
  grids, a wrapping nine-item nav and the hero aside are cut off.
- Case-study overlay: desktop-only grid layouts.

### Visual / type
- Type is Inter Tight + Instrument Serif + DM Mono + Press Start 2P. Headlines use fixed clamp() sizes
  tuned for 1440 px. No display face with character. Line lengths are uncapped on wide screens.

### Drone show
- Formations are sampled text and shapes, with uniform point sprites and no trails. It doesn't reflect Taramandal,
  his real drone-show GCS (Hungarian-assignment formation morphing, guaranteed minimum spacing, LED
  choreography, 1,000-drone sim).

### Content gaps (from the GitHub README, 2026-10-24)
- Taramandal details (public repo, RBAC, signed trajectories, 1,000-drone viewport), MARS v1.0.0 on
  Zenodo (DOI 10.5281/zenodo.22758286), CubeSat 1U track, kisan-micro-erp MVP, RopeIQ validated on 19
  installations, DoppelDash for Android, dev.to (18 posts). Facts to keep: Doppelmayr ended 15 Oct 2026
  (the README still says "present").

### Cleaning
- `CLAUDE.md` mentions `app/experience/` which no longer exists.
- `Landmarks.tsx` is ~1,950 lines with every zone in one file.
- Dev-only handles (`__island`, `__scene`) are fine but should be documented.
- Accessibility: no `prefers-reduced-motion` path, icon buttons without labels, and canvas-only content
  behind the overlay.

## Plan (each item is a GitHub issue; executed in this order)

| # | Phase | Item |
|---|-------|------|
| 1 | Reach | Site URL from one place (`NEXT_PUBLIC_SITE_URL`, falling back to Vercel's production URL) so canonical, sitemap and OG are correct before the domain is attached |
| 2 | Reach | Server-rendered homepage content: real `<h1>`, intro, section links, `<noscript>`; JSON-LD `Person` + `WebSite` with `sameAs` (LinkedIn, GitHub, SSRN, dev.to, X, Zenodo); canonical; one `<h1>` on `/read` |
| 3 | Mobile | Device tiering: phones, tablets and low-memory devices get the lite renderer (no shadows, capped DPR, thinner grass) |
| 4 | Mobile | Mobile island UI: compact top bar, bottom-sheet menu instead of the sidebar, phone-sized hero, touch hints instead of key hints |
| 5 | Mobile | Touch controls: virtual joystick, drag to look, pinch to zoom, tap to walk, on-screen Open / Wave buttons |
| 6 | Mobile | Case-study overlay as a full-screen sheet on phones; single-column grids |
| 7 | Mobile | `/read` responsive: scrollable nav, fluid type, stacked grids, no horizontal overflow at 320 px |
| 8 | Mobile | Story and gala on phones: portrait camera framing, caption sizes, touch-friendly controls |
| 9 | Type | Type system: a display face for headlines, a fluid type scale, capped measure; load only the weights used |
| 10 | Screens | Breakpoint pass for 320 / 390 / 768 / 1024 / 1440 / 1920 / 2560, with a screenshot matrix as proof |
| 11 | Show | Drone show v2 in Taramandal's style: minimum-distance reassignment between formations, glowing LEDs with halos and colour waves, take-off from and landing on the deck, new formations, camera moves |
| 12 | Content | Add the new facts (Zenodo DOI, Taramandal details, CubeSat, RopeIQ 19 installations, dev.to) |
| 13 | Clean | Split `Landmarks.tsx` per zone, update `CLAUDE.md`, remove dead code, accessibility (reduced motion, labels) |
| 14 | Verify | Build, lint, measure on desktop and phone (Pixel 7 at 4x CPU), screenshot matrix, PR |

## Needs Harsh (can't be done from code)
- **Attach a domain** in Vercel (buy harshpandhe.com or use another), then set `NEXT_PUBLIC_SITE_URL`.
- Update the GitHub repo's homepage URL and the LinkedIn website link once the domain is live.
- Submit the domain to Google Search Console and request indexing of `/` and `/read`.
