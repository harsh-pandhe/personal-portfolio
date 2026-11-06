import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harsh Pandhe — Work, research and wins",
  description:
    "Every case study from Harsh Pandhe's Mission Island portfolio on one page: SIH 2025, ISRO IRoC-U, MARS swarm research, Doppelmayr RopeIQ, AlgoTrade and six SSRN papers.",
  alternates: { canonical: "/read" },
};

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
