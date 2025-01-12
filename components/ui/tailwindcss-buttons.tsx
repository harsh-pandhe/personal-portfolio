"use client";
import React from "react";
import { IconClipboard } from "@tabler/icons-react";

export const ButtonsCard = ({
    children,
}: {
    children?: React.ReactNode;
}) => {
    return (
        <div>
            <div className="absolute inset-0 dark:bg-dot-white/[0.1] bg-dot-black/[0.1]" />
            <IconClipboard className="absolute top-2 right-2 text-neutral-300 group-hover/btn:block hidden h-4 w-4 transition duration-200" />
            <div className="relative z-40">{children}</div>
        </div>
    );
};
