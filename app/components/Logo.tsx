import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export const Logo = () => (
    <Link href="#" className="flex items-center space-x-2 text-black dark:text-white">
        <Image
            src="/logo.png"
            alt="Logo"
            width={24}
            height={24}
            className="rounded-full"
        />
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium whitespace-pre"
        >
            Harsh Pandhe
        </motion.span>
    </Link>
);
