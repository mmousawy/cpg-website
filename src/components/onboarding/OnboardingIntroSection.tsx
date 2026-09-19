'use client';

import BlurImage from '@/components/shared/BlurImage';

export default function OnboardingIntroSection() {
  return (
    <div className="space-y-6">
      <div className="onboarding-rise-in relative left-1/2 w-[calc(100vw+50px)] -translate-x-1/2 overflow-hidden md:w-[min(60rem,calc(100vw-6rem))] md:rounded-xl">
        <BlurImage
          src="/welcome-splash.webp"
          alt=""
          width={1512}
          height={780}
          className="h-auto w-full"
          sizes="(max-width: 767px) calc(100vw + 50px), min(960px, calc(100vw - 6rem))"
          quality={80}
          noBlur
          preload
          fetchPriority="high"
          loading="eager"
        />
      </div>
      <p className="onboarding-rise-in onboarding-rise-in-delay-1 text-center text-base text-foreground/80 sm:text-lg">
        You're a few steps away from joining the group. We will walk you through the final steps to finish setting up your profile.
      </p>
    </div>
  );
}
