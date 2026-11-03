// Long-form case studies for each place on the island, laid out like Vibhor Mathur's case pages.
// Every fact below comes from research/ (dossier, LinkedIn posts, SSRN page) or lib/achievements.ts.
import { archive, certifications, education, papers, profile, skills } from "@/lib/achievements";
import type { ZoneId } from "./zones";

export type Section =
  | { type: "text"; label: string; title?: string; body: string }
  | { type: "statement"; text: string }
  | { type: "steps"; label: string; title?: string; items: { title: string; body?: string; meta?: string }[] }
  | { type: "chips"; label: string; items: string[] }
  | { type: "quote"; text: string; who: string }
  | { type: "links"; label: string; items: { t: string; s?: string; meta?: string; href?: string }[] }
  | { type: "contact" }
  | { type: "papers"; label: string; area?: "Quant" | "Robotics" };

/** Key results for each paper, from the SSRN posts on LinkedIn and the local PDF drafts. */
export const PAPER_NOTES: Record<string, { finding: string; stats: string[] }> = {
  "7137361": {
    finding: "A simple 12-1 volatility-adjusted momentum baseline beats XGBoost rankers on every core metric out of sample, and the ML scores carry no information about realised returns.",
    stats: ["Sharpe 1.73 vs 1.55", "CAGR 41.7% vs 38.8%", "10-fold walk-forward"],
  },
  "7376218": {
    finding: "Capping sector exposure — standard institutional practice — forces the strategy out of its strongest momentum leaders. The cost is large and statistically significant.",
    stats: ["CAGR 42.56% → 33.97%", "Sharpe 1.728 → 1.497", "p = 0.0204"],
  },
  "7389238": {
    finding: "With ~42 bps of friction per monthly rotation in India, a hysteresis buffer band stops boundary churn and lifts after-cost returns.",
    stats: ["Turnover −51.7%", "Drag 163 → 78 bps", "CAGR 41.70% → 45.12%"],
  },
  "7556699": {
    finding: "A CBF safety filter kept an undertrained MAPPO policy collision-free at the velocity level — but the swarm barely moved. Safety and competence are different properties.",
    stats: ["0.0 m mean displacement", "3.0 vs 0.8–2.4 collisions / episode", "Dual-lookahead CBF"],
  },
  "7567220": {
    finding: "A centralised-critic MAPPO policy trained on a physics-in-the-loop budget: entropy collapsed and returns swung wildly within a handful of episodes. An honest look at what small budgets do.",
    stats: ["4,500 env steps", "Entropy → −0.53", "Returns −227 to +3"],
  },
  "7567362": {
    finding: "The MARS testbed: MAPPO with a GNN neighbour encoder, a CBF velocity filter and consensus mapping on three TurtleBot3s in ROS 2 + Gazebo — benchmarked against random-walk and frontier baselines.",
    stats: ["3 TurtleBot3 Waffles", "MAPPO 10.4% vs 21.1% frontier", "Noise + failure tests"],
  },
};

export type Case = {
  titleLines: string[];
  meta: [string, string][];
  hook: string;
  cracked?: { label?: string; parts: [string, string][] };
  metrics?: { value: string; label: string }[];
  sections: Section[];
  end?: { title: string; items: [string, string][] }[];
};

const ssrn = (id: string) => `https://ssrn.com/abstract=${id}`;

export const CASES: Record<ZoneId, Case> = {
  hq: {
    titleLines: ["Harsh", "Pandhe"],
    meta: [
      ["Based in", profile.location],
      ["Studying", "B.Tech CS · SIT Lonavala"],
      ["Focus", "Autonomous navigation & multi-agent robotics"],
      ["Next stop", "Singapore · 15–17 Nov"],
    ],
    hook: "I build things that move on their own — and I write down what didn't work.",
    cracked: {
      label: "The path so far",
      parts: [
        ["Where it started", "A diploma in Computer Engineering at SPM Polytechnic, Solapur — First Class with Distinction, and elected General Secretary."],
        ["What changed", "2025: from feeling lost to what I called the best year of my life — a Smart India Hackathon national win, a campus leadership role and a national hackathon to run."],
        ["What drives it", "Evidence. Walk-forward tests, baselines, injected failures and honest write-ups, from trading systems to drone swarms."],
      ],
    },
    metrics: [
      { value: "10,000+", label: "teams in the SIH 2025 field we won" },
      { value: "6", label: "papers on SSRN, 803 views" },
      { value: "102", label: "public GitHub repositories" },
      { value: "161", label: "LinkedIn posts on building in public" },
    ],
    sections: [
      {
        type: "steps",
        label: "Timeline",
        title: "From Solapur to Singapore.",
        items: [
          { title: "2021 · Diploma, SPM Polytechnic", body: "Computer Engineering. General Secretary (Head Boy)." },
          { title: "2024 · B.Tech, SIT Lonavala", body: "Computer Science with Blockchain Honours. First paper: “Collaborative Real-Time Code” (IRJMETS)." },
          { title: "2025 · SIH national winner", body: "Team Algo Sapiens, Telhan Sathi. Head of Cybersecurity & Blockchain at IIC-SIT." },
          { title: "2026 · Robots, drones, markets", body: "RoboRashtra 1st Runner-Up, IRoC-U finalist, Doppelmayr internship, six SSRN papers." },
          { title: "Nov 2026 · Singapore", body: "Selected for the Singapore–India Hackathon Grand Finale at SMU." },
        ],
      },
      { type: "quote", text: "Stop taking notes. Start forging steel.", who: "Harsh, on LinkedIn after the SIH win" },
      {
        type: "steps",
        label: "How I work",
        items: [
          { title: "Falsify first", body: "Every idea gets a walk-forward test, a baseline and a way to fail before it gets a slide." },
          { title: "Ship to hardware", body: "Simulation is a step, not the result: FAST-LIO on a Livox, inference on a Teensy, PCBs at 0 DRC errors." },
          { title: "Write it down", body: "Papers, postmortems and public posts, so the next person doesn't repeat my mistakes." },
        ],
      },
    ],
    end: [
      {
        title: "Elsewhere",
        items: [
          ["GitHub", profile.links.github],
          ["LinkedIn", profile.links.linkedin],
          ["SSRN", profile.links.ssrn],
          ["X", profile.links.x],
        ],
      },
    ],
  },

  arena: {
    titleLines: ["Smart India", "Hackathon '25"],
    meta: [
      ["Role", "Team lead · Algo Sapiens"],
      ["Problem", "PS SIH25273 · Telhan Sathi"],
      ["Finale", "Kolhapur · Dec 2025"],
      ["Result", "National Winner · ₹1,50,000"],
    ],
    hook: "From “zero hopes” to national winners. Luck got us to the door. Strategy kicked it open.",
    cracked: {
      label: "How it was won",
      parts: [
        ["The pivot", "Our first hardware idea wasn't selected in Batch 1. Over the Diwali break I found the Telhan Sathi software problem and drafted a master architecture overnight."],
        ["The idea", "An oilseed-farming platform with crop advisories, farm monitoring and scheme integration — plus a ‘Field Nigrani’ IoT feature so our hardware teammate stayed on the team."],
        ["The finale", "36 hours at KIT's College of Engineering, Kolhapur. I scripted the pitch, wired the IoT hardware into the app when it wouldn't talk, and fixed the backend live."],
      ],
    },
    metrics: [
      { value: "10,000+", label: "teams in the national field" },
      { value: "₹1,50,000", label: "national prize" },
      { value: "6", label: "people on Team Algo Sapiens" },
      { value: "1st", label: "national win for SIT Lonavala" },
    ],
    sections: [
      { type: "quote", text: "In Algo Sapiens, nobody gets left behind.", who: "Harsh, on the SIH winning deck" },
      {
        type: "steps",
        label: "The rest of the mission log",
        title: "Wins, finals and selections.",
        items: [
          { title: "Singapore–India Hackathon 2026", body: "Selected for the Grand Finale at Singapore Management University, 15–17 Nov 2026 (AICTE, MoE Innovation Cell).", meta: "Nov 2026 · International" },
          { title: "ISRO IRoC-U 2026 · Finalist", body: "Team 10144, Automation & Navigation Lead for a GPS-denied UAV.", meta: "2026 · Space robotics" },
          { title: "RoboRashtra 2026 · 1st Runner-Up", body: "Led Team Imposters in the Chakravyuh challenge. ₹10,000.", meta: "Feb 2026 · Embedded AI" },
          { title: "AICTE & MIC IDE Bootcamp", body: "Team Algo Sapiens selected for Phase II.", meta: "Apr 2026" },
          { title: "PCU Ideathon 2.0 · Top 40", body: "Of 500+ teams, with Team Beyond Logic.", meta: "Apr 2025" },
          { title: "HackChrono · Ctrl+Space · Hackatron @ Infotsav'25", body: "Chandigarh University, Newton School and ABV-IIITM Gwalior.", meta: "2025 · Participation" },
        ],
      },
    ],
  },

  marsyard: {
    titleLines: ["GPS-denied", "flight"],
    meta: [
      ["Role", "Automation & Navigation Lead"],
      ["Team", "10144"],
      ["Challenge", "ISRO IRoC-U 2026"],
      ["Result", "Finalist"],
    ],
    hook: "No GPS on Mars. So the drone has to work out where it is from LiDAR, an IMU and a lot of careful frame maths.",
    cracked: {
      parts: [
        ["The problem", "Fly, map and land autonomously in a planetary-style arena where satellite positioning isn't available."],
        ["The approach", "FAST-LIO LiDAR-inertial odometry on a Livox Mid-360, fused with EKF2 and optical flow on PX4, with a Raspberry Pi 5 companion running ROS 2."],
        ["The craft", "Blender-built Martian sandbox worlds, Gazebo + PX4 failsafe testing, direct MAVLink instead of MAVROS, and an RC kill switch above everything."],
      ],
    },
    metrics: [
      { value: "0", label: "GPS fixes used to navigate" },
      { value: "360°", label: "Livox Mid-360 field of view" },
      { value: "5", label: "boards in the Sovereign-X avionics stack" },
      { value: "0", label: "DRC errors on the flight controller" },
    ],
    sections: [
      {
        type: "steps",
        label: "Field notes",
        title: "Lessons from the IRoC-U series.",
        items: [
          { title: "Never time.sleep() a drone", body: "Blocking sleeps starve the control loop. Command from state machines that check arming and mode every tick." },
          { title: "Brain vs reflexes", body: "Planning on the companion computer, safety on the flight controller. An RC kill switch beats any software failsafe." },
          { title: "The LiDAR was upside down", body: "An inverted Livox breaks every transform downstream. Write the frame maths down before blaming FAST-LIO." },
          { title: "I was wrong about LOITER", body: "ArduPilot developers corrected my post: the behaviour was right, my expectation wasn't." },
        ],
      },
      { type: "statement", text: "Software allows Ctrl+Z. Physics does not." },
      {
        type: "links",
        label: "Flight hardware",
        items: [
          { t: "Sovereign-X", s: "Indigenous 4-layer avionics: STM32H7 flight controller with dual isolated IMUs, 4-in-1 DroneCAN ESC, power board, RTK GNSS + mesh telemetry, swarm LED ring. KiCad API scripts got the FC to 0 DRC errors on 4-layer FR4.", meta: "Hardware · 2026" },
          { t: "Taramandal GCS", s: "A 4-day sprint: PX4 + Gazebo SITL, FastAPI + MAVSDK backend streaming at 5 Hz, React Three Fiber path preview. Drones within 2.0 m trigger a global return-to-launch.", meta: "Swarm ground control", href: "https://github.com/harsh-pandhe/Taramandal-GCS" },
        ],
      },
    ],
  },

  swarm: {
    titleLines: ["Multi-robot", "coverage"],
    meta: [
      ["Project", "MARS"],
      ["Stack", "ROS 2 Jazzy · Gazebo"],
      ["Methods", "MAPPO · CBF safety filters"],
      ["Output", "3 SSRN papers"],
    ],
    hook: "Classical path planning works beautifully for one robot. Scale to a swarm and it breaks.",
    cracked: {
      parts: [
        ["The failure", "A frontier heuristic where each robot greedily drives to the nearest unvisited sector: all three converge on the same spots. Greedy convergence."],
        ["The honest baseline", "Before reaching for MARL I fixed the classical heuristic first — including robots that were driving forward while looking backward — so the AI wasn't benchmarked against a strawman."],
        ["The safety layer", "Control-barrier-function filters that keep robots apart regardless of how good the policy is, then failures injected mid-run to measure recovery."],
      ],
    },
    metrics: [
      { value: "3", label: "robotics papers on SSRN" },
      { value: "83", label: "views across the three" },
      { value: "100", label: "step at which a robot is made to fail" },
      { value: "600 MHz", label: "Teensy 4.1 running our maze net" },
    ],
    sections: [
      { type: "papers", label: "Papers from this field", area: "Robotics" },
      {
        type: "text",
        label: "Also on the field",
        title: "RoboRashtra 2026 · Chakravyuh",
        body: "Led Team Imposters, a four-person team, to 1st Runner-Up and ₹10,000. A line follower that hands over to on-device neural-net inference for the maze — trained on 100+ datasets in 16 hours and run on a 600 MHz Teensy 4.1.",
      },
      { type: "chips", label: "Built with", items: ["ROS 2 Jazzy", "Gazebo", "MAPPO", "Control Barrier Functions", "TurtleBot3", "Python", "Teensy 4.1"] },
    ],
    end: [{ title: "Code", items: [["MARS on GitHub", "https://github.com/harsh-pandhe/MARS"]] }],
  },

  ropeway: {
    titleLines: ["Doppelmayr", "× RopeIQ"],
    meta: [
      ["Role", "Software Development Intern"],
      ["Company", "Doppelmayr India"],
      ["Period", "16 Apr – 15 Oct 2026"],
      ["Type", "Internship"],
    ],
    hook: "Two coordinates in. A permit-grade ropeway alignment out.",
    cracked: {
      parts: [
        ["The problem", "Laying out a ropeway means trading terrain, tower placement, clearances and design codes against each other."],
        ["The approach", "RopeIQ searches alignments with a genetic algorithm, NSGA-II and PPO, then checks them against Eurocode rules."],
        ["The proof", "Validated against 12 real installations on five continents, with DXF / LandXML export, a 3D twin and a bill of materials. 157 tests."],
      ],
    },
    metrics: [
      { value: "12", label: "real installations validated against" },
      { value: "5", label: "continents" },
      { value: "157", label: "automated tests" },
      { value: "6", label: "months at Doppelmayr" },
    ],
    sections: [
      {
        type: "steps",
        label: "Built at Doppelmayr",
        items: [
          { title: "RopeIQ", body: "Ropeway alignment optimiser (Python · FastAPI)." },
          { title: "DoppelDash", body: "An internal operations platform with a companion mobile app." },
          { title: "Standards", body: "Work to ISO 9001 processes and WCAG AA accessibility." },
        ],
      },
      {
        type: "links",
        label: "Around the ropes",
        items: [
          { t: "Pune ropeway pre-feasibility", s: "Corridor studies for LT Chowk–Sardar Patel Chowk and Mitramandal–Manapa Bhavan, and a Pune traffic decongestion strategy." },
          { t: "Bentley Illuminate 2026, Mumbai", s: "Digital twins to real infrastructure." },
          { t: "Maval Maza", s: "Newspaper feature on the Doppelmayr selection." },
        ],
      },
    ],
  },

  trading: {
    titleLines: ["Algo", "Trade"],
    meta: [
      ["Market", "NSE · Nifty 500"],
      ["Window", "2018–2026 walk-forward"],
      ["Signal", "Vol-adjusted 12-1 momentum"],
      ["Status", "60-day unattended paper trial"],
    ],
    hook: "Ten hypotheses tested. Ten rejected. One strategy left standing.",
    cracked: {
      parts: [
        ["The trap", "Three months and 20 phases of infrastructure — LLM agents, WebSocket streamers, Telegram bots — then an honest backtest: a Ferrari with no engine."],
        ["The discipline", "A falsification-first research OS: point-in-time Nifty 500 membership, exact NSE costs plus 10 bps slippage per leg, and every idea through a walk-forward gate."],
        ["The audit", "A stale price feed and a NAV double-count made the paper account look up 50%+ when the truth was under 2%. Found, fixed, documented."],
      ],
    },
    metrics: [
      { value: "40.2%", label: "CAGR, 8-year walk-forward" },
      { value: "1.68", label: "Sharpe ratio" },
      { value: "−26.4%", label: "max drawdown" },
      { value: "428", label: "tests in the codebase" },
    ],
    sections: [
      {
        type: "steps",
        label: "Gate E",
        title: "What got rejected, and why.",
        items: [
          { title: "Hierarchical Risk Parity", body: "Higher Sharpe, but −2.1 pp CAGR (p = 0.23)." },
          { title: "Smallcap 250 universe", body: "Sharpe fell to 1.20, CAGR −7.9 pp." },
          { title: "Sector caps", body: "Capping industry exposure cost −8.4 pp CAGR." },
          { title: "XGBoost ranker", body: "Underperformed simple maths at 1.8× the turnover." },
          { title: "GDELT news sentiment", body: "0.0 pp edge on domestic equities." },
          { title: "Stops, reversal blends, correlation caps", body: "Each made returns or drawdowns worse." },
        ],
      },
      { type: "statement", text: "Great research is the discipline to reject 90% of your own ideas." },
      { type: "papers", label: "Quant papers on SSRN", area: "Quant" },
    ],
    end: [{ title: "Note", items: [["Backtested results, not a promise of future returns.", ""]] }],
  },

  workshop: {
    titleLines: ["The", "Workshop"],
    meta: [
      ["Builds here", `${archive.length}`],
      ["Public repos", "102"],
      ["Open source", "validator.js · rich"],
      ["Streak", "#365DaysOfCode"],
    ],
    hook: "Robotics, ML, hardware, civic tech and full-stack products — most of them on GitHub.",
    sections: [
      {
        type: "links",
        label: "Archive",
        items: archive.map((a) => ({ t: a.name, s: a.line, meta: `${a.year} · ${a.kind}`, href: a.href })),
      },
      {
        type: "links",
        label: "Merged open-source PRs",
        items: [
          { t: "validatorjs/validator.js #2683", href: "https://github.com/validatorjs/validator.js/pull/2683" },
          { t: "Textualize/rich #4123", href: "https://github.com/Textualize/rich/pull/4123" },
        ],
      },
    ],
  },

  library: {
    titleLines: ["Research", "Library"],
    meta: [
      ["Papers", "6 on SSRN"],
      ["Views", "803"],
      ["Downloads", "276"],
      ["Areas", "Quant · Multi-robot RL"],
    ],
    hook: "Half of these papers report what didn't work. That's the point.",
    metrics: [
      { value: "6", label: "working papers on SSRN" },
      { value: "803", label: "total views" },
      { value: "276", label: "total downloads" },
    ],
    sections: [
      { type: "papers", label: "On SSRN" },
      {
        type: "links",
        label: "Drafts & earlier work",
        items: [
          { t: "Environment Structure, Not Just Team Size", s: "Working draft: the same permutation-invariant coverage stack reaches 90.4% in a cluttered café but 99–100% in an open warehouse — team-size invariance and environment-structure invariance are different things.", meta: "Draft · Multi-robot RL" },
          { t: "Collaborative Real-Time Code", s: "The architecture of Codex, a real-time collaborative code editor.", meta: "IRJMETS · Jan 2024" },
        ],
      },
    ],
  },

  morpheus: {
    titleLines: ["Project", "Morpheus"],
    meta: [
      ["Role", "Lead Organizer"],
      ["Org", "IIC · SIT Lonavala"],
      ["Year", "2026"],
      ["Type", "24-hour national hackathon"],
    ],
    hook: "Red pill or blue pill? The simulation has been breached.",
    cracked: {
      parts: [
        ["The problem", "“Does the fan in Room 304 work?” Hostel ops for a national event, run on paper and spreadsheets."],
        ["The approach", "A platform built in-house: JWT role-based access (Admin, Warden, Auditor, Desk) and a guided room-audit wizard."],
        ["The craft", "An allocation engine as one MongoDB transaction — verify, sort by hostel block, pick beds, commit all or nothing. No double bookings."],
      ],
    },
    metrics: [
      { value: "200+", label: "participants" },
      { value: "₹2L+", label: "in prizes" },
      { value: "24h", label: "national hackathon" },
      { value: "70+", label: "developers mentored at CODE2LAUNCH" },
    ],
    sections: [
      {
        type: "steps",
        label: "Web, Cybersecurity & Blockchain Head · IIC-SIT",
        items: [
          { title: "500+ students, 8 departments", body: "Campus-wide tech initiatives since October 2025." },
          { title: "Expert mentor & judge", body: "SIT-ACM CODE2LAUNCH: 70+ developers mentored, 50+ projects judged." },
          { title: "Kalpataru 2026", body: "Built in-house instead of hiring an agency." },
        ],
      },
      { type: "chips", label: "Built with", items: ["React + Vite", "Express", "MongoDB transactions", "JWT RBAC", "Vercel"] },
    ],
    end: [{ title: "Live", items: [["projectmorpheus.in", "https://projectmorpheus.in"]] }],
  },

  home: {
    titleLines: ["Say", "hello"],
    meta: [
      ["Email", profile.email],
      ["Based in", profile.location],
      ["Interested in", "Robotics, autonomy & research engineering"],
      ["Also at", "GitHub · LinkedIn · SSRN · X"],
    ],
    hook: "Let's build something that flies.",
    sections: [
      { type: "contact" },
      {
        type: "steps",
        label: "Education",
        items: education.map((e) => ({ title: e.school, body: `${e.degree}. ${e.note}`, meta: e.period })),
      },
      ...skills.map((s) => ({ type: "chips" as const, label: s.group, items: s.items })),
      { type: "chips", label: "Certifications", items: certifications },
    ],
  },
};
