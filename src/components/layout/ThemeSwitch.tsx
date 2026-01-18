'use client';

import { useTheme } from 'next-themes';
import { useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useMounted } from '@/hooks/useMounted';

export default function ThemeSwitch() {
  const mounted = useMounted();
  const { theme, setTheme, systemTheme } = useTheme();

  useEffect(() => {
    // If the theme is set to "system", we need to check the user's system preference
    if (theme === 'system') {
      if (systemTheme === 'dark') {
        setTheme('dark');
      } else if (systemTheme === 'light') {
        setTheme('light');
      }
    }
  }, [theme, systemTheme, setTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const themeButtonHandle = (
    <span
      className={clsx([
        'block size-4 rounded-full bg-background-light shadow-md transition-transform dark:bg-[#ffffff60]',
        (theme === 'light') && 'translate-x-6',
      ])}
    />
  );

  return (
    <div
      className="flex items-center justify-center gap-2"
    >
      <label
        htmlFor="themeButton"
        className="cursor-pointer opacity-70"
      >
        Switch theme
      </label>
      <button
        id="themeButton"
        onClick={toggleTheme}
        className="h-6 w-12 cursor-pointer rounded-full bg-border-color p-1 text-foreground "
        aria-label={'Toggle light or dark mode'}
      >
        {mounted
          ? themeButtonHandle
          : (
            <span
              className={clsx([
                'block size-4 rounded-full bg-background-light shadow-md transition-transform dark:bg-[#ffffff60]',
              ])}
            />
          )
        }
      </button>
    </div>
  );
};
