import IslandClient from "./IslandClient";
import { PersonJsonLd } from "./seo";
import { ZONES } from "./island/zones";
import { about, profile } from "@/lib/achievements";

/** The island, plus the same story as plain HTML for search engines, screen readers and no-JS visitors. */
export default function Home() {
  return (
    <>
      <PersonJsonLd />
      <IslandClient />
      <section className="sr-only" aria-label="About this site">
        <h1>{profile.name}: autonomous navigation and multi-agent robotics engineer</h1>
        <p>{about.intro}</p>
        <p>{about.body.join(" ")}</p>
        <h2>Explore the work</h2>
        <ul>
          {ZONES.map((z) => (
            <li key={z.id}>
              <a href={`/read#${z.id}`}>
                {z.name}: {z.headline}
              </a>
            </li>
          ))}
        </ul>
        <p>
          <a href="/read">Read every case study on one page</a> · <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      </section>
      <noscript>
        <p style={{ padding: 24, fontFamily: "system-ui", color: "#fff", background: "#0a0f1d" }}>
          Mission Island needs JavaScript and WebGL. <a href="/read" style={{ color: "#22d36b" }}>Read the portfolio as a page instead →</a>
        </p>
      </noscript>
    </>
  );
}
