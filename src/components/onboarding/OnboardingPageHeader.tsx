'use client';

import LogoSVG from 'public/cpg-logo.svg';

type OnboardingPageHeaderProps = {
  titleLine1: string;
  titleLine2: string;
};

/** Intro-only welcome heading (not shown on later wizard steps). */
export default function OnboardingPageHeader({ titleLine1, titleLine2 }: OnboardingPageHeaderProps) {
  return (
    <header className="onboarding-page-title-in mb-8 text-center">
      <LogoSVG
        className="mx-auto mb-4 block size-16 sm:mb-5 sm:size-20"
        aria-hidden
      />
      <h1 className="text-3xl font-bold font-heading sm:text-4xl">
        <span className="block">{titleLine1}</span>
        <span className="block">{titleLine2}</span>
      </h1>
    </header>
  );
}
