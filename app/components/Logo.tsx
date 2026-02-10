import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export const Logo = () => (
    <Link
        href="#"
        className="flex items-center space-x-2 text-white"
    >
        <div className="h-6 w-6 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
            H
        </div>
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium whitespace-pre text-sm"
        >
            Harsh Pandhe
        </motion.span>
    </Link>
);
