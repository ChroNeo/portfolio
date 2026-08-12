import { useEffect, useState } from "react";
import { LuSun, LuMoon } from "react-icons/lu";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDarkMode = stored ? stored === "dark" : prefersDark;
        setIsDark(isDarkMode);
        document.documentElement.classList.toggle("dark", isDarkMode);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle("dark", newTheme);
        localStorage.setItem("theme", newTheme ? "dark" : "light");
    };

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full
                bg-(--paper-bg) text-(--ink)
                shadow-lg ring-1 ring-black/10 transition-all
                duration-300 hover:scale-110 active:scale-95 dark:ring-white/10"
        >
            {isDark ? <LuSun className="h-6 w-6" /> : <LuMoon className="h-6 w-6" />}
        </button>
    );
}