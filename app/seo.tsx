import { SITE_URL } from "@/lib/site";
import { education, profile } from "@/lib/achievements";

/** schema.org Person + WebSite, so search engines can tie the site to his other profiles. */
export function PersonJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: profile.name,
        url: SITE_URL,
        image: `${SITE_URL}/og.jpg`,
        email: `mailto:${profile.email}`,
        jobTitle: "Autonomous navigation & multi-agent robotics engineer",
        description: profile.tagline,
        address: { "@type": "PostalAddress", addressLocality: "Navi Mumbai", addressRegion: "Maharashtra", addressCountry: "IN" },
        alumniOf: education.map((e) => ({ "@type": "EducationalOrganization", name: e.school })),
        knowsAbout: ["Autonomous navigation", "Multi-agent reinforcement learning", "ROS 2", "PX4", "LiDAR SLAM", "Control Barrier Functions", "Drone shows", "Quantitative research"],
        award: ["Smart India Hackathon 2025 — National Winner", "ISRO Robotics Challenge IRoC-U 2026 — Finalist", "RoboRashtra 2026 — 1st Runner-Up"],
        sameAs: Object.values(profile.links),
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#site`, url: SITE_URL, name: `${profile.name} — Mission Island`, author: { "@id": `${SITE_URL}/#person` } },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
