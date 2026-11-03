// The island's zones: where each sits, how it looks, and what it says.
// All copy is drawn from lib/achievements.ts (the portfolio's source of truth).
import {
  about,
  archive,
  education,
  experience,
  fieldNotes,
  missions,
  papers,
  profile,
  skills,
  certifications,
  openSource,
} from "@/lib/achievements";

export type ZoneId =
  | "hq"
  | "arena"
  | "marsyard"
  | "swarm"
  | "ropeway"
  | "trading"
  | "workshop"
  | "library"
  | "morpheus"
  | "home";

export type Block =
  | { kind: "lead"; text: string }
  | { kind: "stats"; items: { v: string; k: string }[] }
  | { kind: "list"; title?: string; items: { t: string; s?: string; meta?: string; href?: string }[] }
  | { kind: "tags"; title?: string; items: string[] }
  | { kind: "notes"; items: { t: string; s: string; tag?: string }[] };

export type Zone = {
  id: ZoneId;
  key: string; // fast-travel key
  name: string;
  team: string; // small label, like a department
  accent: string;
  angle: number; // degrees around the island, 0 = east, -90 = north
  radius: number;
  headline: string;
  blurb: string;
  blocks: Block[];
};

const ISLAND_R = 32;

export const ZONES: Zone[] = [
  {
    id: "hq",
    key: "0",
    name: "Mission Control",
    team: "Harsh Pandhe · HQ",
    accent: "#2d5bff",
    angle: 0,
    radius: 0,
    headline: "Engineer of things that move on their own.",
    blurb: about.intro,
    blocks: [
      { kind: "lead", text: about.body.join(" ") },
      {
        kind: "stats",
        items: [
          { v: "10,000+", k: "teams behind us at SIH 2025" },
          { v: "6", k: "SSRN papers" },
          { v: "100+", k: "public repositories" },
          { v: "70+", k: "developers mentored" },
        ],
      },
      { kind: "notes", items: about.principles.map((p) => ({ t: p.k, s: p.v })) },
    ],
  },
  {
    id: "arena",
    key: "1",
    name: "The Arena",
    team: "Hall of wins",
    accent: "#f5b301",
    angle: -90,
    radius: ISLAND_R,
    headline: "Smart India Hackathon 2025 — National Winner.",
    blurb:
      "Led Team Algo Sapiens to the national title among 10,000+ teams with Telhan Sathi, an oilseed-farming platform — the first win for SIT Lonavala. The mustard field next to the stadium is for it.",
    blocks: [
      {
        kind: "list",
        title: "Mission log",
        items: missions.map((m) => ({ t: m.title, s: m.detail, meta: `${m.date} · ${m.result}` })),
      },
    ],
  },
  {
    id: "marsyard",
    key: "2",
    name: "Mars Yard",
    team: "ISRO IRoC-U 2026 · Finalist",
    accent: "#ff5a36",
    angle: -50,
    radius: ISLAND_R,
    headline: "A drone that flies without GPS.",
    blurb:
      "Automation & Navigation Lead for Team 10144. FAST-LIO SLAM on a Livox Mid-360, EKF2 with optical flow, PX4 and ROS 2 on a Raspberry Pi 5 — tested in Blender-built Martian worlds before the real thing.",
    blocks: [
      {
        kind: "list",
        title: "Flight hardware",
        items: [
          { t: "IRoC-U ASCEND", s: "GPS-denied navigation stack; green end-to-end in simulation, sim-to-real pipeline for the hardware.", meta: "ROS 2 · PX4 · FAST-LIO · Livox · Pi 5" },
          { t: "Sovereign-X", s: "Custom 4-layer drone avionics — STM32H7, 4-in-1 DroneCAN ESC, RTK GNSS. KiCad automation, 0 DRC errors.", meta: "Hardware · 2026" },
          { t: "Taramandal GCS + Studio", s: "Ground control and choreography for centimetre-accurate drone light shows. 155+ tests, 100-drone regression. Switch to night (L) to see the show over the sea.", meta: "FastAPI · WebGL · PX4", href: "https://github.com/harsh-pandhe/Taramandal-GCS" },
        ],
      },
      { kind: "notes", items: fieldNotes.filter((n) => n.tag === "UAV").map((n) => ({ t: n.title, s: n.body, tag: n.tag })) },
    ],
  },
  {
    id: "swarm",
    key: "3",
    name: "Swarm Field",
    team: "MARS · multi-robot research",
    accent: "#12f0c0",
    angle: -10,
    radius: ISLAND_R,
    headline: "Robots that cover ground — safely.",
    blurb:
      "MARS is a multi-robot area-coverage testbed: MAPPO policies, control-barrier-function safety filters, ROS 2 Jazzy and Gazebo. The robots on this field are sweeping it right now.",
    blocks: [
      {
        kind: "list",
        title: "Papers from this field",
        items: papers
          .filter((p) => p.area === "Robotics")
          .map((p) => ({ t: p.title, meta: `${p.date} · SSRN · ${p.views} views`, href: `https://ssrn.com/abstract=${p.id}` })),
      },
      {
        kind: "list",
        title: "Also on the field",
        items: [
          { t: "RoboRashtra 2026 · 1st Runner-Up", s: "Chakravyuh line + maze solver with neural-net inference on a 600 MHz Teensy 4.1. 16 hours, 100+ datasets.", meta: "Team Imposters · Feb 2026" },
          { t: "MARS on GitHub", s: "The testbed, controllers and failure-injection experiments.", href: "https://github.com/harsh-pandhe/MARS" },
        ],
      },
      { kind: "notes", items: fieldNotes.filter((n) => n.tag === "Swarms").map((n) => ({ t: n.title, s: n.body, tag: n.tag })) },
    ],
  },
  {
    id: "ropeway",
    key: "4",
    name: "Ropeway Ridge",
    team: "Doppelmayr India · Apr–Oct 2026",
    accent: "#e5322d",
    angle: 30,
    radius: ISLAND_R,
    headline: "Two coordinates in. A ropeway out.",
    blurb:
      "Six months as a Software Development Intern at Doppelmayr, the Austrian ropeway company. The cabins climbing this ridge run on the kind of alignment RopeIQ designs.",
    blocks: [
      {
        kind: "list",
        title: "Built at Doppelmayr",
        items: experience[0].points.map((p) => ({ t: p })),
      },
      {
        kind: "list",
        title: "RopeIQ",
        items: [
          { t: "Permit-grade alignment from two points", s: "GA, NSGA-II and PPO search; Eurocode checks; DXF / LandXML export; 3D twin; bill of materials. 157 tests, validated against 12 real installations on 5 continents.", meta: "Python · FastAPI" },
          { t: "Pune ropeway pre-feasibility", s: "Corridor studies for LT Chowk–Sardar Patel Chowk and Mitramandal–Manapa Bhavan, plus a traffic decongestion strategy." },
        ],
      },
    ],
  },
  {
    id: "trading",
    key: "5",
    name: "Trading Floor",
    team: "AlgoTrade · quant research",
    accent: "#00b37e",
    angle: 70,
    radius: ISLAND_R,
    headline: "The strategy that survived ten attempts to kill it.",
    blurb:
      "A research OS for NSE equities. Ten popular upgrades were tested walk-forward and rejected; what shipped is plain volatility-adjusted momentum, then 60 unattended paper-trading sessions before any capital.",
    blocks: [
      {
        kind: "stats",
        items: [
          { v: "40.2%", k: "CAGR, 2018–2026 walk-forward" },
          { v: "1.68", k: "Sharpe ratio" },
          { v: "−26.4%", k: "max drawdown" },
          { v: "10", k: "hypotheses rejected" },
        ],
      },
      {
        kind: "list",
        title: "Quant papers",
        items: papers
          .filter((p) => p.area === "Quant")
          .map((p) => ({ t: p.title, meta: `${p.date} · ${p.downloads} downloads`, href: `https://ssrn.com/abstract=${p.id}` })),
      },
      { kind: "notes", items: fieldNotes.filter((n) => n.tag === "Quant").map((n) => ({ t: n.title, s: n.body, tag: n.tag })) },
    ],
  },
  {
    id: "workshop",
    key: "6",
    name: "The Workshop",
    team: `Archive · ${archive.length} builds`,
    accent: "#7a4dff",
    angle: 110,
    radius: ISLAND_R,
    headline: "Everything else I've shipped.",
    blurb: "Robotics, ML, hardware, civic tech and full-stack products — most of them on GitHub.",
    blocks: [
      {
        kind: "list",
        items: archive.map((a) => ({ t: a.name, s: a.line, meta: `${a.year} · ${a.kind}`, href: a.href })),
      },
      { kind: "list", title: "Open source", items: openSource.map((o) => ({ t: `${o.repo} ${o.pr}`, href: o.href })) },
    ],
  },
  {
    id: "library",
    key: "7",
    name: "Research Library",
    team: "SSRN · 6 papers",
    accent: "#00d2ff",
    angle: 150,
    radius: ISLAND_R,
    headline: "Six papers. Half of them are about being wrong, honestly.",
    blurb: "Each monolith is a paper. Quant finance on the Nifty 500, and multi-robot reinforcement learning.",
    blocks: [
      {
        kind: "list",
        items: papers.map((p) => ({
          t: p.title,
          meta: `${p.date} · ${p.area} · ${p.views} views · ${p.downloads} downloads`,
          href: `https://ssrn.com/abstract=${p.id}`,
        })),
      },
      { kind: "list", title: "Also", items: [{ t: "Collaborative Real-Time Code", s: "IRJMETS, Jan 2024 — the architecture of Codex, a real-time collaborative editor." }] },
    ],
  },
  {
    id: "morpheus",
    key: "8",
    name: "Morpheus Gate",
    team: "IIC · SIT Lonavala",
    accent: "#19e36b",
    angle: 190,
    radius: ISLAND_R,
    headline: "The simulation has been breached.",
    blurb:
      "Lead Organizer of Project Morpheus 2026, a Matrix-themed 24-hour national hackathon: 200+ participants, ₹2L+ in prizes, and a platform I built for registration, RBAC and hostel allocation.",
    blocks: [
      { kind: "list", title: "Web, Cybersecurity & Blockchain Head", items: experience[1].points.map((p) => ({ t: p })) },
      { kind: "list", items: [{ t: "projectmorpheus.in", s: "The event platform.", href: "https://projectmorpheus.in" }] },
    ],
  },
  {
    id: "home",
    key: "9",
    name: "Home",
    team: "Navi Mumbai",
    accent: "#ff7ac6",
    angle: 230,
    radius: ISLAND_R,
    headline: "From a diploma in Solapur to a Grand Finale in Singapore.",
    blurb: "Education, toolbox and how to reach me.",
    blocks: [
      { kind: "list", title: "Education", items: education.map((e) => ({ t: e.school, s: `${e.degree}. ${e.note}`, meta: e.period })) },
      ...skills.map((s) => ({ kind: "tags" as const, title: s.group, items: s.items })),
      { kind: "tags", title: "Certifications", items: certifications },
      {
        kind: "list",
        title: "Say hello",
        items: [
          { t: profile.email, href: `mailto:${profile.email}` },
          { t: "GitHub", href: profile.links.github },
          { t: "LinkedIn", href: profile.links.linkedin },
          { t: "SSRN", href: profile.links.ssrn },
          { t: "X", href: profile.links.x },
        ],
      },
    ],
  },
];

export function zonePos(z: Zone): [number, number] {
  const a = (z.angle * Math.PI) / 180;
  return [Math.cos(a) * z.radius, Math.sin(a) * z.radius];
}

export const zoneById = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>;
