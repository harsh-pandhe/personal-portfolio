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
  { year: "2021", text: "Diploma in Computer Engineering, SPM Polytechnic — First Class with Distinction; General Secretary." },
  { year: "2024", text: "B.Tech Computer Science, SIT Lonavala. Published 'Collaborative Real-Time Code' (IRJMETS)." },
  { year: "2025", text: "Head of Cybersecurity & Blockchain at IIC-SIT. SIH 2025 national winner." },
  { year: "2026", text: "Doppelmayr intern, IRoC-U finalist, RoboRashtra runner-up, 6 SSRN papers, Lead Organizer of Project Morpheus." },
  { year: "Nov 2026", text: "Singapore–India Hackathon Grand Finale, SMU." },
];
