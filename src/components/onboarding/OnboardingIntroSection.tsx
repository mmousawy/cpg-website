'use client';

import Image from 'next/image';


export default function OnboardingIntroSection() {
  return (
    <div className="space-y-6">
      <div className="onboarding-rise-in overflow-hidden rounded-xl">
        <Image
          src="/welcome-splash.png"
          alt=""
          width={1536}
          height={1024}
          className="h-auto w-full"
          priority
        />
      </div>
      <p className="onboarding-rise-in onboarding-rise-in-delay-1 text-center text-base text-foreground/80 sm:text-lg">
        You're a few steps away from joining the group. We will walk you through the final steps to finish setting up your profile.
      </p>
    </div>
  );
}
