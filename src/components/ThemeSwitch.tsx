'use client';

import { useTheme } from "next-themes";
import { useEffect, useCallback } from "react";
import clsx from 'clsx';

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // If the theme is set to "system", we need to check the user's system preference
    if (theme === "system") {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <div className="flex items-center justify-center gap-2 *:cursor-pointer">
      <label htmlFor="themeButton" className="opacity-70">Switch theme</label>
      <button
        id="themeButton"
        onClick={toggleTheme}
        className="h-6 w-12 rounded-full bg-border-color p-1 text-foreground"
        aria-label={`Toggle light or dark mode`}
      >
        <span
          className={clsx([
            'block size-4 rounded-full bg-background-light shadow-md transition-transform dark:bg-[#ffffff60]',
            theme === 'light' && 'translate-x-6',
          ])}
        />
      </button>
    </div>
  );
};
