"use client";

import dynamic from "next/dynamic";

// The island is WebGL-only, so it renders on the client; the page around it is server-rendered.
const Island = dynamic(() => import("./island/Island"), { ssr: false });

export default function IslandClient() {
  return <Island />;
}
