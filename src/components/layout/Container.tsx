import clsx from 'clsx';
import { ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode
  className?: string
  variant?: 'default' | 'centered' | 'form' | 'gradient'
  padding?: 'sm' | 'md' | 'lg'
  id?: string
}

export default function Container({
  children,
  className,
  variant = 'default',
  padding = 'md',
  id,
}: ContainerProps) {
  const baseStyles = 'rounded-xl md:rounded-2xl fill-foreground text-foreground shadow-lg shadow-[#00000007]';

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6 max-sm:p-4',
    lg: 'p-8 max-sm:p-6',
  };

  const variantStyles = {
    default: 'border-[0.0625rem] border-border-color bg-background-light',
    centered: 'border-[0.0625rem] border-border-color bg-background-light flex min-h-28 justify-center items-center',
    form: 'border-[0.0625rem] border-border-color bg-background-light',
    gradient: 'container-gradient',
  };

  return (
    <div
      id={id}
      className={clsx(
        baseStyles,
        paddingStyles[padding],
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
