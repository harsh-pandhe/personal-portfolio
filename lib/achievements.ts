// Source of truth for the portfolio. Compiled from resume, LinkedIn honors, SSRN author page, Gmail, GitHub.

export const profile = {
  name: "Harsh Pandhe",
  tagline: "Autonomous navigation, multi-agent robotics & systems that survive contact with reality.",
  location: "Navi Mumbai, India",
  email: "harshpandhehome@gmail.com",
  links: {
    github: "https://github.com/harsh-pandhe",
    linkedin: "https://www.linkedin.com/in/harshpandhe/",
    x: "https://x.com/HarshPandhe",
    ssrn: "https://ssrn.com/author=12415688",
    devto: "https://dev.to/harshpandhe",
    zenodo: "https://doi.org/10.5281/zenodo.22758286",
  },
};

export const stats = [
  { label: "SIH 2025 national teams beaten", value: 10000, suffix: "+" },
  { label: "SSRN papers", value: 6, suffix: "" },
  { label: "SSRN downloads", value: 276, suffix: "" },
  { label: "GitHub contributions", value: 1850, suffix: "+" },
];

export type Mission = {
  date: string;
  title: string;
  result: string;
  detail: string;
  tag: string;
};

export const missions: Mission[] = [
  {
    date: "Nov 2026",
    title: "Singapore–India Hackathon · Grand Finale",
    result: "Selected to represent India",
    detail:
      "Selected through idea + interview rounds (AICTE, MoE Innovation Cell, SMU). Grand Finale at Singapore Management University, 15–17 Nov 2026.",
    tag: "International",
  },
  {
    date: "Apr 2026",
    title: "ISRO Robotics Challenge — IRoC-U 2026",
    result: "Finalist · Team 10144",
    detail:
      "Automation & Navigation Lead. GPS-denied UAV: FAST-LIO SLAM on Livox Mid-360, EKF2 + optical flow, ROS 2 + PX4, Pi 5 companion, custom docking station.",
    tag: "Space / Robotics",
  },
  {
    date: "Feb 2026",
    title: "RoboRashtra 2026 · Chakravyuh",
    result: "1st Runner-Up · ₹10,000",
    detail:
      "Led Team Imposters. Line-follower that hands over to on-device neural-net inference for the maze, on a Teensy 4.1 at 600 MHz, with a safety supervisor.",
    tag: "Embedded AI",
  },
  {
    date: "Dec 2025",
    title: "Smart India Hackathon 2025",
    result: "National Winner · ₹1,50,000",
    detail:
      "Led Team Algo Sapiens (6) to the national title among 10,000+ teams with Telhan Sathi (MoA&FW PS 25273). First team from SIT Lonavala to reach nationals — and win.",
    tag: "National",
  },
  {
    date: "Apr 2026",
    title: "AICTE & MIC IDE Bootcamp",
    result: "Selected · Phase II",
    detail: "Ministry of Education Innovation Cell programme.",
    tag: "Program",
  },
  {
    date: "Apr 2025",
    title: "PCU Ideathon 2.0",
    result: "Top 40 of 500+ teams",
    detail: "24-hour national hackathon with Team Beyond Logic.",
    tag: "Hackathon",
  },
];

export type Paper = {
  id: string;
  title: string;
  date: string;
  views: number;
  downloads: number;
  area: "Quant" | "Robotics";
};

export const papers: Paper[] = [
  {
    id: "7137361",
    title: "When Gradient Boosting Does Not Beat Momentum: A Significance-Tested, Walk-Forward Negative Result in the Nifty 500",
    date: "Jul 2026",
    views: 235,
    downloads: 85,
    area: "Quant",
  },
  {
    id: "7376218",
    title: "The Cost of Sector Constraints in Cross-Sectional Momentum: Evidence from the Nifty 500",
    date: "Aug 2026",
    views: 244,
    downloads: 92,
    area: "Quant",
  },
  {
    id: "7389238",
    title: "Hysteresis Rebalancing in Cross-Sectional Momentum: Reducing Boundary Churn and Transaction-Cost Drag",
    date: "Sep 2026",
    views: 241,
    downloads: 77,
    area: "Quant",
  },
  {
    id: "7556699",
    title: "Diagnosing a Low-Displacement Failure Mode in MAPPO for Multi-Robot Area Coverage",
    date: "Oct 2026",
    views: 27,
    downloads: 8,
    area: "Robotics",
  },
  {
    id: "7567220",
    title: "A Failed Diagnosis of Entropy Collapse in Small-Budget MAPPO for Multi-Robot Area Coverage",
    date: "Oct 2026",
    views: 23,
    downloads: 6,
    area: "Robotics",
  },
  {
    id: "7567362",
    title: "MARS: A Safety-Filtered Multi-Robot Area-Coverage Testbed with Classical, Random-Walk and MAPPO Controllers",
    date: "Oct 2026",
    views: 33,
    downloads: 8,
    area: "Robotics",
  },
];

export type Project = {
  name: string;
  line: string;
  stack: string;
  proof: string;
  href?: string;
};

export const projects: Project[] = [
  {
    name: "RopeIQ",
    line: "Two coordinates in, permit-grade ropeway alignment out.",
    stack: "Python · GA / NSGA-II / PPO · FastAPI",
    proof: "Eurocode-validated, checked against 12 real installations on 5 continents.",
  },
  {
    name: "IRoC-U ASCEND",
    line: "GPS-denied autonomous UAV stack for ISRO's robotics challenge.",
    stack: "ROS 2 · PX4 · FAST-LIO · Livox · Pi 5",
    proof: "Full stack green end-to-end in simulation; hardware-bound sim-to-real pipeline.",
  },
  {
    name: "Taramandal",
    line: "Sovereign, centimetre-accurate drone light-show platform.",
    stack: "FastAPI · WebGL · PX4 · STM32H7 · KiCad",
    proof: "155+ tests, 100-drone regression, 5/5 custom PCBs DRC-clean.",
    href: "https://github.com/harsh-pandhe/Taramandal-GCS",
  },
  {
    name: "AlgoTrade",
    line: "A trading system built to falsify its own ideas.",
    stack: "Python · NSE / Upstox · walk-forward research OS",
    proof: "40.2% CAGR, Sharpe 1.68 over 8 years OOS; 10 hypotheses rejected; 428 tests.",
  },
  {
    name: "MARS",
    line: "Safety-filtered multi-robot swarm coverage testbed.",
    stack: "ROS 2 Jazzy · Gazebo · MAPPO · CBF",
    proof: "Three SSRN papers, including an honest failure analysis.",
    href: "https://github.com/harsh-pandhe/MARS",
  },
  {
    name: "Project Morpheus",
    line: "Hackathon + hostel ops platform for 500+ participants.",
    stack: "Next.js · MongoDB transactions · RBAC",
    proof: "Atomic allocator, live organizer dashboards; ran a 200+ person national event.",
    href: "https://projectmorpheus.in",
  },
];

export const timeline = [
  { year: "2021", text: "Diploma in Computer Engineering at SPM Polytechnic, Solapur. Elected General Secretary (Head Boy)." },
  { year: "2024", text: "Diploma — First Class with Distinction. Joined B.Tech Computer Science at SIT Lonavala. Published 'Collaborative Real-Time Code' (IRJMETS)." },
  { year: "2025", text: "#365DaysOfCode. Top 40 at PCU Ideathon. Head of Cybersecurity & Blockchain at IIC-SIT. Smart India Hackathon national winner in December." },
  { year: "2026 H1", text: "Lead Organizer, Project Morpheus. RoboRashtra 1st Runner-Up. ISRO IRoC-U finalist. Software Development Intern at Doppelmayr India (Apr–Oct)." },
  { year: "2026 H2", text: "Six SSRN papers on quant finance and multi-robot RL. MARS swarm testbed. Sovereign-X avionics. Selected for the Singapore–India Hackathon." },
  { year: "Nov 2026", text: "Singapore–India Hackathon Grand Finale, Singapore Management University, 15–17 Nov." },
];

export const now = {
  label: "Now",
  text: "Preparing for the Singapore–India Hackathon Grand Finale (SMU, 15–17 Nov 2026), finishing B.Tech at SIT Lonavala, and pushing the MARS swarm and Taramandal drone-show stacks toward hardware.",
};

export const about = {
  intro:
    "I'm Harsh Ravindra Pandhe, a Computer Science undergraduate at SIT Lonavala who builds autonomous systems — drones that navigate without GPS, robot swarms that cover ground safely, and software that has to work outside the demo.",
  body: [
    "My path runs from a diploma in Solapur, through leading a six-person team to the Smart India Hackathon 2025 national title, to an engineering internship at Doppelmayr, the Austrian ropeway company.",
    "I care about evidence. My trading system's best result is the ten upgrades I proved didn't work; half my SSRN papers report negative results; my LinkedIn posts are mostly bugs I shipped and how I caught them.",
  ],
  principles: [
    { k: "Falsify first", v: "Every idea gets a walk-forward test, a baseline and a way to fail before it gets a slide." },
    { k: "Ship to hardware", v: "Simulation is a step, not the result. FAST-LIO on a Livox, inference on a Teensy, PCBs that pass DRC." },
    { k: "Write it down", v: "Papers, postmortems and 161 public posts — so the next person doesn't repeat my mistakes." },
  ],
};

export type Role = {
  org: string;
  role: string;
  period: string;
  where: string;
  points: string[];
};

export const experience: Role[] = [
  {
    org: "Doppelmayr India",
    role: "Software Development Intern",
    period: "Apr 2026 – Oct 2026",
    where: "Austrian ropeway & cable-car MNC",
    points: [
      "Built RopeIQ, a ropeway alignment optimiser (GA, NSGA-II, PPO) validated against 12 real installations on 5 continents.",
      "Shipped DoppelDash, an internal operations platform with a companion mobile app.",
      "Worked to ISO 9001 process and WCAG AA accessibility requirements.",
    ],
  },
  {
    org: "IIC — SIT Lonavala",
    role: "Web, Cybersecurity & Blockchain Head",
    period: "Oct 2025 – present",
    where: "Institution's Innovation Council, MoE",
    points: [
      "Lead campus tech initiatives across 8 departments and 500+ students.",
      "Lead Organizer of Project Morpheus 2026 — a 24-hour national hackathon, 200+ participants, ₹2L+ prizes.",
      "Mentored 70+ developers (SIT-ACM CODE2LAUNCH) and judged 50+ projects.",
    ],
  },
  {
    org: "ISRO IRoC-U 2026 · Team 10144",
    role: "Automation & Navigation Lead",
    period: "2026",
    where: "ISRO Robotics Challenge — University",
    points: [
      "GPS-denied UAV: FAST-LIO SLAM on a Livox Mid-360, EKF2 + optical flow, PX4, ROS 2, Raspberry Pi 5.",
      "Replaced MAVROS with direct MAVLink, separated 'brain' from 'reflexes', added an RC kill switch.",
      "Built the Martian sandbox simulation worlds for Project ASCEND.",
    ],
  },
  {
    org: "Team Algo Sapiens",
    role: "Team Lead",
    period: "Sep – Dec 2025",
    where: "Smart India Hackathon 2025",
    points: [
      "Led 6 engineers on Telhan Sathi (PS 25273, Ministry of Agriculture & Farmers Welfare).",
      "National winner among 10,000+ teams at the Kolhapur Grand Finale — a first for SIT Lonavala.",
    ],
  },
];

export const education = [
  {
    school: "Sinhgad Institute of Technology, Lonavala",
    degree: "B.Tech, Computer Science · Honours in Blockchain",
    period: "2024 – 2027",
    note: "Sem 5 SGPA 8.05 · O grades in Lab Practice I, CN & Security Lab and Seminar.",
  },
  {
    school: "SPM Polytechnic, Solapur",
    degree: "Diploma, Computer Engineering",
    period: "2021 – 2024",
    note: "First Class with Distinction · General Secretary (Head Boy).",
  },
  {
    school: "Presentation Convent School, Nerul",
    degree: "ICSE · Class 10 · Science & Computer Applications",
    period: "2008 – 2021",
    note: "89% in the ICSE board exams · school cricket and football teams, athletics, chess.",
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Robotics & autonomy", items: ["ROS 2", "PX4", "ArduPilot", "MAVLink", "FAST-LIO", "Gazebo", "Isaac Sim", "EKF2"] },
  { group: "ML & research", items: ["PyTorch", "MAPPO / MARL", "Control Barrier Functions", "XGBoost", "Walk-forward testing", "Computer vision"] },
  { group: "Embedded & hardware", items: ["Teensy 4.1", "STM32H7", "ESP32", "Raspberry Pi 5", "KiCad", "DroneCAN"] },
  { group: "Full-stack", items: ["TypeScript", "Next.js", "React", "Node / Express", "FastAPI", "MongoDB", "Prisma", "React Native"] },
  { group: "Systems & security", items: ["Python", "C++", "Rust", "Docker", "Linux", "Solidity", "Network security"] },
];

export type ArchiveItem = {
  name: string;
  year: string;
  kind: "Robotics" | "AI / ML" | "Full-stack" | "Quant" | "Hardware" | "Civic";
  line: string;
  href?: string;
};

export const archive: ArchiveItem[] = [
  { name: "Sovereign-X", year: "2026", kind: "Hardware", line: "Custom 4-layer drone avionics — STM32H7, 4-in-1 DroneCAN ESC, RTK GNSS; KiCad automation, 0 DRC errors." },
  { name: "Taramandal GCS + Studio", year: "2026", kind: "Robotics", line: "Ground control and choreography for drone light shows; spatial safety rings and auto-abort.", href: "https://github.com/harsh-pandhe/Taramandal-GCS" },
  { name: "MARS", year: "2026", kind: "Robotics", line: "Multi-robot area coverage with MAPPO and CBF safety filters in ROS 2 Jazzy + Gazebo.", href: "https://github.com/harsh-pandhe/MARS" },
  { name: "iroc-ascend-nav", year: "2026", kind: "Robotics", line: "GPS-denied navigation stack for ISRO IRoC-U; green end-to-end in simulation." },
  { name: "RopeIQ", year: "2026", kind: "AI / ML", line: "Ropeway alignment from two coordinates: Eurocode checks, DXF/LandXML export, 3D twin, bill of materials. 157 tests." },
  { name: "AlgoTrade", year: "2026", kind: "Quant", line: "Paper-trading daemon + falsification-driven research OS on point-in-time Nifty 500 data. 428 tests." },
  { name: "NetGuard-ML", year: "2026", kind: "AI / ML", line: "Leakage-free intrusion detection on CIC-IDS2017 — why 99.8% accuracy claims collapse on real networks." },
  { name: "airgapped-netops-ai", year: "2026", kind: "AI / ML", line: "Network operations assistant designed to run with no internet connection." },
  { name: "Traffic surveillance", year: "2026", kind: "AI / ML", line: "Helmet compliance, wheel-count vehicle classification and a risk index from CCTV." },
  { name: "terra-verify", year: "2026", kind: "Civic", line: "Construction progress from Sentinel-2 imagery — hectares changed plus a report." },
  { name: "pod-transit", year: "2026", kind: "Civic", line: "Browser-based personal rapid transit simulator on real maps." },
  { name: "City Companion", year: "2026", kind: "Civic", line: "Consent-first mobility telemetry with k-anonymous aggregates for planners." },
  { name: "Harsh OS", year: "2026", kind: "AI / ML", line: "Local-first multi-agent layer for LinkedIn (Tampermonkey + Ollama) — no data leaves the machine." },
  { name: "Aura", year: "2026", kind: "Full-stack", line: "Offline-first, self-hosted music app in React Native." },
  { name: "Project Morpheus platform", year: "2026", kind: "Full-stack", line: "Registration, RBAC, atomic MongoDB hostel allocator and audit wizard for a national hackathon.", href: "https://projectmorpheus.in" },
  { name: "AgriTrace", year: "2026", kind: "Civic", line: "Circular-economy agri-waste tracking for farmers, recycling agents and admins." },
  { name: "Ather Co-Pilot", year: "2026", kind: "AI / ML", line: "Unified AI workspace with retrieval-augmented generation." },
  { name: "KrishiPancham AI", year: "2026", kind: "AI / ML", line: "Panchang-aware agricultural companion built on FastAPI." },
  { name: "Chakravyuh Bot", year: "2026", kind: "Hardware", line: "Line + maze solver with neural-net inference on a 600 MHz Teensy 4.1 — RoboRashtra 1st Runner-Up." },
  { name: "Telhan Sathi", year: "2025", kind: "Civic", line: "Oilseed farming platform — crop advisories, IoT soil sensing, scheme integration. SIH 2025 winner." },
  { name: "CityConnect", year: "2025", kind: "Civic", line: "Civic issue reporting rewarded with blockchain EcoCoins (Solidity + Django)." },
  { name: "Kisan Micro-ERP", year: "2025", kind: "Full-stack", line: "Lightweight ERP for smallholder farmers." },
  { name: "ExpenseTracker", year: "2025", kind: "Full-stack", line: "Personal finance tracker — 136 commits of steady iteration." },
  { name: "ESP32-CAM series", year: "2025", kind: "Hardware", line: "Six-part build series on low-cost camera modules." },
  { name: "Codex", year: "2024", kind: "Full-stack", line: "Real-time collaborative code editor; the basis of an IRJMETS paper." },
];

export const fieldNotes: { title: string; body: string; tag: string }[] = [
  { tag: "UAV", title: "Never time.sleep() a drone", body: "Blocking sleeps starve the control loop. Command drones from state machines that check arming and mode on every tick." },
  { tag: "UAV", title: "Brain vs reflexes", body: "Keep planning on the companion computer and safety on the flight controller. An RC kill switch beats any software failsafe." },
  { tag: "UAV", title: "The LiDAR was upside down", body: "A Livox mounted upside down means every transform downstream is wrong. Write the frame math down before blaming FAST-LIO." },
  { tag: "UAV", title: "I was wrong about LOITER", body: "ArduPilot maintainers corrected my post: the behaviour was right, my expectation wasn't. Corrections are part of the work." },
  { tag: "Quant", title: "float('nan') is truthy", body: "One NaN check silently corrupted two days of paper-trading NAV. Audits found a stale feed and double-counting too: +50% was really under 2%." },
  { tag: "Quant", title: "A Ferrari with no engine", body: "Three months and 20 phases of trading infrastructure taught me to find the edge before building the car." },
  { tag: "ML", title: "99.8% doesn't survive the network", body: "Intrusion-detection benchmarks leak. Split by time and by host, and accuracy falls to something honest." },
  { tag: "Swarms", title: "Greedy planners converge — badly", body: "Classical path planning breaks for swarms. Inject a hardware failure at step 100 and measure the recovery, not the happy path." },
];

export const openSource = [
  { repo: "validatorjs/validator.js", pr: "#2683", href: "https://github.com/validatorjs/validator.js/pull/2683" },
  { repo: "Textualize/rich", pr: "#4123", href: "https://github.com/Textualize/rich/pull/4123" },
];

export const certifications = [
  "Certified Ethical Hacker Bootcamp — Zero To Mastery",
  "Advanced Data Structures & Algorithms — Codedamn",
  "Computer Networks Fundamentals — Udemy",
  "Web Development Bootcamp 2025 — Udemy",
  "Responsive Web Design — freeCodeCamp",
  "Data Science 101 — IBM",
];

export const recognition = [
  "Featured in Maval Maza for selection to Doppelmayr's software team.",
  "Attended Bentley Systems Illuminate 2026, Mumbai.",
  "Expert mentor & judge, SIT-ACM CODE2LAUNCH.",
  "1,896 LinkedIn followers · 161 posts on engineering in public.",
];
