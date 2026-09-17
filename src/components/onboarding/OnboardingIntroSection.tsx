'use client';

import BlurImage from '@/components/shared/BlurImage';

const WELCOME_SPLASH_BLURHASH = 'UoIX,BI[R*s:_Nbco0j]E-s:oeWXA1WAj@j[';

export default function OnboardingIntroSection() {
  return (
    <div className="space-y-6">
      <div className="onboarding-rise-in overflow-hidden rounded-xl">
        <BlurImage
          src="/welcome-splash.webp"
          alt=""
          width={1200}
          height={800}
          className="h-auto w-full"
          sizes="(max-width: 640px) calc(100vw - 1.5rem), 36rem"
          quality={80}
          blurhash={WELCOME_SPLASH_BLURHASH}
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
