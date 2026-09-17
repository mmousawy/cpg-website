'use client';

import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';

import type { AppThemeSelection } from '@/hooks/useAppTheme';
import { useAppTheme } from '@/hooks/useAppTheme';

const THEME_OPTIONS: {
  value: AppThemeSelection;
  label: string;
  icon: ReactNode;
}[] = [
  {
    value: 'system',
    label: 'Auto',
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
  },
  {
    value: 'midnight',
    label: 'Midnight',
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
];

type ThemePreferencePickerProps = {
  value: AppThemeSelection;
  onChange: (theme: AppThemeSelection) => void;
  /** When false, hides selected-state styling until the client theme is ready. */
  selectionReady?: boolean;
};

export default function ThemePreferencePicker({
  value,
  onChange,
  selectionReady = true,
}: ThemePreferencePickerProps) {
  const { resolvedTheme, setTheme } = useAppTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleSelect = (theme: AppThemeSelection) => {
    onChange(theme);
    if (theme === 'system') {
      setTheme('system');
    } else {
      setTheme(theme);
    }
  };

  const themeHint = (() => {
    if (value === 'system') {
      if (themeMounted && resolvedTheme) {
        return `Follows your system — currently ${resolvedTheme}`;
      }
      return 'Follows your system preference';
    }
    if (value === 'light') {
      return 'Always uses the light theme';
    }
    if (value === 'dark') {
      return 'Always uses the dark theme';
    }
    return 'A deeper dark theme';
  })();

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-2 py-2 text-sm font-medium transition-colors sm:px-3',
              selectionReady && value === option.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border-color hover:border-border-color-strong',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-foreground/80">
        {themeHint}
      </p>
    </div>
  );
}
