import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export const Logo = () => (
    <Link href="#" className="flex items-center space-x-2 text-black dark:text-white">
        <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm" />
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium whitespace-pre"
        >
            Harsh Pandhe
        </motion.span>
    </Link>
);
