'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

export function AppearanceChoiceGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {children}
    </div>
  );
}

type AppearanceChoiceProps = {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  children: ReactNode;
};

export function AppearanceChoice({
  selected,
  onSelect,
  label,
  description,
  children,
}: AppearanceChoiceProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'rounded-lg border-2 p-2.5 text-left transition-colors sm:p-3',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border-color hover:border-border-color-strong',
      )}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-3 sm:gap-y-1">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
              selected ? 'border-primary' : 'border-border-color-strong',
            )}
          >
            {selected && (
              <div className="size-2 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="sm:col-start-2 sm:row-span-2 sm:row-start-1">
          {children}
        </div>
        <p className="text-xs text-foreground/50 sm:col-start-1 sm:ml-6">
          {description}
        </p>
      </div>
    </button>
  );
}
