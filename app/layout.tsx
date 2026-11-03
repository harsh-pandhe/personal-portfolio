import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Harsh Pandhe | Autonomous Systems & Research",
  description:
    "Portfolio of Harsh Pandhe — SIH 2025 National Winner, Head of Cybersecurity & Blockchain @ IIC-SIT, Full-Stack & Web3 Developer building distributed systems, embedded AI, and blockchain solutions.",
  keywords: [
    "Harsh Pandhe",
    "SIH 2025",
    "Full-Stack Developer",
    "Web3",
    "Blockchain",
    "Robotics",
    "Next.js",
    "React",
    "TypeScript",
    "Embedded AI",
  ],
  authors: [{ name: "Harsh Pandhe" }],
  openGraph: {
    title: "Harsh Pandhe | Autonomous Systems & Research",
    description:
      "SIH 2025 National Winner · Head of Cybersecurity & Blockchain @ IIC-SIT · Building distributed systems & blockchain solutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
