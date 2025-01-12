"use client";

import React, { useState } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { IconBrandGithub, IconBrandLinkedin, IconHome, IconLetterH, IconPrompt, IconAffiliateFilled } from "@tabler/icons-react";
import Back from "./components/Back";
import Projects from "@/app/components/projects";
import Me from "@/app/components/me";
import Contact from "@/app/components/contact";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Logo } from "@/app/components/Logo";
import { LogoIcon } from "@/app/components/LogoIcon";

export default function Home() {
  const [activePage, setActivePage] = useState("home");
  const [open, setOpen] = useState(false);

  const links = [
    { title: "Home", icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />, action: () => setActivePage("home"), href: "#" },
    { title: "Me", icon: <IconLetterH className="h-full w-full text-neutral-500 dark:text-neutral-300" />, action: () => setActivePage("me"), href: "#" },
    { title: "Projects", icon: <IconPrompt className="h-full w-full text-neutral-500 dark:text-neutral-300" />, action: () => setActivePage("projects"), href: "#" },
    { title: "Contact", icon: <IconAffiliateFilled className="h-full w-full text-neutral-500 dark:text-neutral-300" />, action: () => setActivePage("contact"), href: "#" },
    { title: "LinkedIn", icon: <IconBrandLinkedin className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/" },
    { title: "GitHub", icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: "https://github.com/harsh-pandhe" },
  ];

  const items = [
    { title: "Home", icon: <IconHome className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, action: () => { setActivePage("home"), setOpen(false); }, href: "#" },
    { title: "Me", icon: <IconLetterH className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, action: () => { setActivePage("me"), setOpen(false); }, href: "#" },
    { title: "Projects", icon: <IconPrompt className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, action: () => { setActivePage("projects"), setOpen(false); }, href: "#" },
    { title: "Contact", icon: <IconAffiliateFilled className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, action: () => { setActivePage("contact"), setOpen(false) }, href: "#" },
    { title: "LinkedIn", icon: <IconBrandLinkedin className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, href: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/" },
    { title: "GitHub", icon: <IconBrandGithub className="h-5 w-7 text-neutral-500 dark:text-neutral-300" />, href: "https://github.com/harsh-pandhe" },
  ];

  return (
    <main className="relative h-screen bg-black">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 md:hidden">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {items.map((link, idx) => (
                <SidebarLink key={idx} link={link} setActivePage={setActivePage} />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {activePage === "home" && <Back />}
      {activePage === "projects" && <Projects />}
      {activePage === "me" && <Me />}
      {activePage === "contact" && <Contact />}

      <FloatingDock
        mobileClassName="translate-y-20"
        desktopClassName="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40"
        items={links.map((link) => ({
          title: link.title,
          icon: link.icon,
          href: link.href || "#",
          onClick: link.action,
        }))}
      />
    </main >
  );
}
