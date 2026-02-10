import React from "react";
import Link from "next/link";

export const LogoIcon = () => (
    <Link
        href="#"
        className="font-normal flex items-center text-sm py-1 relative z-20"
    >
        <div className="h-6 w-6 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            H
        </div>
    </Link>
);
