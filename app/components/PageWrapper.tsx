"use client";

import { DarkModeToggle } from "./DarkModeToggle";
import { ReactNode } from "react";

interface PageWrapperProps {
    children: ReactNode;
    className?: string;
}

export function PageWrapper({ children, className = "" }: PageWrapperProps) {
    return (
        <div className={className}>
            {children}
            <DarkModeToggle />
        </div>
    );
}
