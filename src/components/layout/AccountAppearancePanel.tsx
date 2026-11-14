'use client';

import clsx from 'clsx';

import { THEME_OPTIONS } from '@/components/account/ThemePreferencePicker';
import type { AppThemeSelection } from '@/hooks/useAppTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import AccountMenuChevron from './AccountMenuChevron';

type AccountAppearancePanelProps = {
  onBack: () => void;
};

export default function AccountAppearancePanel({
  onBack,
}: AccountAppearancePanelProps) {
  const { user, updateProfileTheme } = useAuth();
  const { theme, setTheme } = useAppTheme();
  const mounted = useMounted();

  const handleSelect = async (next: AppThemeSelection) => {
    setTheme(next);

    if (!user) return;

    const { error } = await updateProfileTheme(next);
    if (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <>
      <div
        className="p-2"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-base hover:bg-background sm:text-sm"
        >
          <AccountMenuChevron
            direction="left"
            className="mr-3 h-4 w-4 shrink-0 opacity-50"
          />
          Switch appearance
        </button>
      </div>

      <div
        className="mx-4 border-t border-border-color-strong"
        role="presentation"
      />

      <div
        className="p-2"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = mounted && theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                void handleSelect(option.value);
              }}
              aria-pressed={selected}
              className={clsx(
                'flex w-full items-center rounded-lg px-3 py-2 text-left text-base sm:text-sm',
                selected
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--selection-ring)] after:ml-auto after:size-1.5 after:shrink-0 after:rounded-full after:bg-primary dark:bg-foreground/5'
                  : 'hover:bg-background',
              )}
            >
              <Icon
                className="mr-3 h-4 w-4 shrink-0"
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
