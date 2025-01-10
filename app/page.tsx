"use client";

import React, { useState } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconHome,
  IconTerminal2,
  IconNewSection,
  IconExchange,
} from "@tabler/icons-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
} from "@tabler/icons-react";

import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import Projects from "@/app/components/projects";
import Me from "@/app/components/me";
import Contact from "@/app/components/contact";
import Link from "next/link";
import { motion } from "framer-motion";
import { FlipWords } from "@/components/ui/flip-words";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activePage, setActivePage] = useState("home");
  const words = ["Namaste", "Hello", "Bonjour", "Hola", "Ciao", "Hallo", "Olá", "Konnichiwa"];

  const links = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      action: () => setActivePage("home"),
      href: "#",
    },
    {
      title: "Me",
      icon: <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      action: () => setActivePage("me"),
      href: "#",
    },
    {
      title: "Projects",
      icon: <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      action: () => setActivePage("projects"),
      href: "#",
    },
    {
      title: "Contact",
      icon: <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      action: () => setActivePage("contact"),
      href: "#",
    },
    {
      title: "LinkedIn",
      icon: <IconBrandLinkedin className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/",
    },
    {
      title: "GitHub",
      icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "https://github.com/harsh-pandhe",
    },
  ];

  const [open, setOpen] = useState(false);

  const linkss = [
    {
      label: "Home",
      href: "#",
      action: () => setActivePage("home"),
      icon: <IconBrandTabler className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Projects",
      href: "#",
      action: () => setActivePage("projects"),
      icon: <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Me",
      href: "#",
      action: () => setActivePage("me"),
      icon: <IconBrandLinkedin className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Contact",
      href: "#",
      action: () => setActivePage("contact"),
      icon: <IconArrowLeft className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "LinkedIn",
      icon: <IconBrandLinkedin className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
      href: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/",
    },
    {
      label: "GitHub",
      icon: <IconBrandGithub className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
      href: "https://github.com/harsh-pandhe",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row dark:bg-neutral-800 w-full flex-1 mx-auto bg-neutral-900  overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 md:hidden">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {linkss.map((link, idx) => (
                <SidebarLink
                  key={idx}
                  link={link}
                  setActivePage={setActivePage}
                />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="h-screen bg-neutral-900 w-full">
        <div className="h-full z-10 relative">
          {activePage === "home" && (
            <div className="h-[40rem] flex justify-center items-center px-4">
              <div className="text-4xl mx-auto font-normal text-white dark:text-white">
                <FlipWords words={words} /><br />
                <h2>Work Under Progress</h2>
              </div>
            </div>
          )}
          {activePage === "projects" && <Projects />}
          {activePage === "me" && <Me />}
          {activePage === "contact" && <Contact />}
        </div>

        <div className="flex z-50 items-center justify-center fixed bottom-0 mb-4 w-full">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={links.map((link) => ({
              title: link.title,
              icon: link.icon,
              href: link.href || "#",
              onClick: link.action,
            }))}
          />
        </div>

        <ShootingStars />
        <StarsBackground />
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Harsh Pandhe
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};
