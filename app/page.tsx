"use client";

import dynamic from "next/dynamic";

const Island = dynamic(() => import("./island/Island"), { ssr: false });

export default function Home() {
  return <Island />;
}
