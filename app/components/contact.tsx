"use client";
import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ContactForm from "@/app/components/contact-form";
import SocialCard from "@/components/ui/social-card";

const CrowdCanvas = dynamic(
  () => import("@/components/ui/crowd-canvas"),
  { ssr: false },
);
import { Mail, Phone, MapPin } from "lucide-react";
import {
  FaLinkedinIn,
  FaGithub,
  FaXTwitter,
} from "react-icons/fa6";
import {
  LuLinkedin,
  LuGithub,
  LuMail,
  LuGlobe,
} from "react-icons/lu";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const socialCards = [
  {
    image: "https://avatars.githubusercontent.com/u/83552028?v=4",
    title: "LinkedIn",
    name: "Harsh Pandhe",
    pitch:
      "Full-Stack Developer & SIH 2025 National Winner. Let's connect and build something great together.",
    icon: <FaLinkedinIn className="h-4 w-4" />,
    buttons: [
      {
        label: "View Profile",
        icon: <LuLinkedin className="h-4 w-4" />,
        link: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/",
      },
      {
        label: "Send Message",
        icon: <LuMail className="h-4 w-4" />,
        link: "https://www.linkedin.com/in/harsh-pandhe-853a9121a/",
      },
    ],
  },
  {
    image: "https://avatars.githubusercontent.com/u/83552028?v=4",
    title: "GitHub",
    name: "Harsh Pandhe",
    pitch:
      "90+ repositories spanning Web3, Full-Stack, Embedded AI, and Robotics. Check out my open-source work.",
    icon: <FaGithub className="h-4 w-4" />,
    buttons: [
      {
        label: "View Repositories",
        icon: <LuGithub className="h-4 w-4" />,
        link: "https://github.com/harsh-pandhe",
      },
      {
        label: "Follow Me",
        icon: <LuGlobe className="h-4 w-4" />,
        link: "https://github.com/harsh-pandhe",
      },
    ],
  },
  {
    image: "https://avatars.githubusercontent.com/u/83552028?v=4",
    title: "X (Twitter)",
    name: "Harsh Pandhe",
    pitch:
      "Sharing thoughts on tech, Web3, and engineering. Follow for updates on my latest projects.",
    icon: <FaXTwitter className="h-4 w-4" />,
    buttons: [
      {
        label: "View Profile",
        icon: <LuGlobe className="h-4 w-4" />,
        link: "https://x.com/harsh_pandhe",
      },
      {
        label: "Send a DM",
        icon: <LuMail className="h-4 w-4" />,
        link: "https://x.com/harsh_pandhe",
      },
    ],
  },
];

export default function ContactPage() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="relative w-full bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* Crowd canvas background */}
      {!prefersReducedMotion && (
        <CrowdCanvas
          src="/images/peeps/all-peeps.png"
          rows={15}
          cols={7}
          className="absolute bottom-0 w-full h-[70%] opacity-30"
        />
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/70 pointer-events-none z-10" />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="relative z-20 w-full max-w-5xl mx-auto px-4 py-20 md:py-28"
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Have a project in mind or just want to say hello? I&apos;d love to
            hear from you.
          </p>
        </motion.div>

        {/* Social Cards */}
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap justify-center gap-5 mb-12"
        >
          {socialCards.map((card) => (
            <SocialCard key={card.title} {...card} />
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="glass rounded-2xl overflow-hidden glow max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Info side */}
            <div className="p-8 md:p-10 flex flex-col justify-center bg-gradient-to-br from-violet-600/10 to-transparent">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Let&apos;s Connect
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                Whether you have a question, want to discuss a project, or just
                want to say hello — feel free to reach out.
              </p>
              <div className="space-y-5">
                {[
                  {
                    icon: Mail,
                    text: "harshpandhehome@gmail.com",
                    href: "mailto:harshpandhehome@gmail.com",
                  },
                  {
                    icon: Phone,
                    text: "+91 908-293-4286",
                    href: "tel:+919082934286",
                  },
                  {
                    icon: MapPin,
                    text: "Mumbai, Maharashtra, India",
                    href: "https://g.co/kgs/GHoQCjN",
                  },
                ].map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                  >
                    <span className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-violet-500/30 transition-colors">
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.text}
                  </a>
                ))}
              </div>
            </div>

            {/* Form side */}
            <div className="p-8 md:p-10 bg-white/[0.02]">
              <h2 className="text-xl font-semibold text-white mb-2">
                Drop a Message
              </h2>
              <p className="text-neutral-500 text-sm mb-6">
                I&apos;ll get back to you as soon as possible.
              </p>
              <ContactForm />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
