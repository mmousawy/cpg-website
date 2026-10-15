import type { ReactNode } from 'react';

type GearAccountPanelProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function GearAccountPanel({
  title,
  description,
  actions,
  children,
}: GearAccountPanelProps) {
  return (
    <section
      className="rounded-xl sm:rounded-2xl border border-border-color bg-background-light p-4 sm:p-6"
    >
      <div
        className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div
          className="min-w-0"
        >
          <h2
            className="text-xl font-semibold font-heading"
          >
            {title}
          </h2>
          <p
            className="mt-1 text-sm text-foreground/70 leading-snug"
          >
            {description}
          </p>
        </div>
        {actions && (
          <div
            className="flex shrink-0 flex-wrap gap-2"
          >
            {actions}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
