import clsx from 'clsx';

export type DevWorkbenchNavLinkVariant = 'mono' | 'sans';

export function devWorkbenchNavLinkClass(
  active: boolean,
  variant: DevWorkbenchNavLinkVariant = 'sans',
): string {
  const base = clsx(
    'flex items-center gap-2 rounded-md transition-colors duration-200 ease-out',
    variant === 'mono'
      ? 'py-1 pr-2 pl-1 font-mono text-xs'
      : 'py-1.5 pr-2 pl-1 text-sm',
  );

  if (active) {
    return clsx(base, 'bg-primary/15 text-primary font-medium');
  }

  return clsx(
    base,
    variant === 'mono'
      ? 'text-foreground/80 hover:bg-background'
      : 'text-foreground/90 hover:bg-background',
  );
}
