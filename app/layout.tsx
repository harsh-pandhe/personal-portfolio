import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif, Inter_Tight } from "next/font/google";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-serif", weight: "400", style: ["normal", "italic"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://harshpandhe.com"),
  title: "Harsh Pandhe — A portfolio you can fly through",
  description:
    "Harsh Pandhe builds autonomous drones, multi-robot swarms and evidence-first software. SIH 2025 National Winner, ISRO IRoC-U 2026 Finalist, Singapore–India Hackathon 2026 finalist, ex-Doppelmayr, 6 SSRN papers.",
  keywords: [
    "Harsh Pandhe",
    "robotics",
    "autonomous navigation",
    "multi-agent reinforcement learning",
    "MAPPO",
    "drones",
    "PX4",
    "ROS 2",
    "SIH 2025",
    "IRoC-U",
    "SSRN",
    "SIT Lonavala",
  ],
  authors: [{ name: "Harsh Pandhe", url: "https://github.com/harsh-pandhe" }],
  openGraph: {
    title: "Harsh Pandhe — A portfolio you can fly through",
    description:
      "Drones that navigate without GPS, swarms that cover ground safely, and research that reports what didn't work.",
    type: "website",
  },
  twitter: { card: "summary_large_image", creator: "@HarshPandhe" },
};

export const viewport = { themeColor: "#05060a" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
