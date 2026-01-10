"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function DarkModeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        );
    }

    const isDark = theme === "dark";

    return (
        <motion.button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            whileTap={{ scale: 0.9 }}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <motion.div
                initial={false}
                animate={{
                    rotate: isDark ? 180 : 0,
                    scale: isDark ? 0.8 : 1,
                }}
                transition={{ duration: 0.3 }}
            >
                {isDark ? (
                    <Moon className="w-6 h-6 text-blue-400" />
                ) : (
                    <Sun className="w-6 h-6 text-yellow-500" />
                )}
            </motion.div>
        </motion.button>
    );
}
