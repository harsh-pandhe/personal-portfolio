import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LoaderOverlay from "./components/loader-overlay";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Harsh Pandhe | SIH'25 Winner · Full-Stack & Web3 Developer",
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
    title: "Harsh Pandhe | SIH'25 Winner · Full-Stack & Web3 Developer",
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
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} font-sans`}>
        <LoaderOverlay />
        {children}
      </body>
    </html>
  );
}
