'use client';

import { useTheme } from "next-themes";
import { useCallback } from "react";

export default function Footer() {
  const { theme, setTheme } = useTheme();

  const switchTheme = useCallback(() => {
    if (theme === "system") {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme("light");
      } else {
        setTheme("dark");
      }
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  }, [theme, setTheme]);

  return (
    <footer>
      <button onClick={switchTheme}>Switch theme</button>
    </footer>
  );
};
