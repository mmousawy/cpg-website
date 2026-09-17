'use client';

import type { ComponentType, ReactNode, SVGProps } from 'react';

type OnboardingSectionTitleProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
};

export default function OnboardingSectionTitle({
  icon: Icon,
  children,
}: OnboardingSectionTitleProps) {
  return (
    <h2 className="onboarding-step-title mb-2 sm:mb-4 flex items-center gap-2 text-lg font-semibold opacity-80 font-heading">
      <Icon
        className="size-5 shrink-0"
        aria-hidden
      />
      {children}
    </h2>
  );
}
