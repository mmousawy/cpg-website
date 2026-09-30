import { HomeBelowFoldContent } from '@/components/home/HomeBelowFoldContent';
import { HomeBelowFoldE2ESwap } from '@/components/home/HomeBelowFoldE2ESwap';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getHomePageData } from '@/lib/data/home';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

export const metadata = {
  ...createMetadata({
    title: 'Photography meetups & community in the Netherlands',
    description: 'A community for analog and digital photographers. Join us for monthly meetups, photo challenges, and skill-sharing talks in the Netherlands.',
    canonical: '/',
    keywords: ['photography', 'photography meetups', 'Netherlands', 'photo walks', 'photography community'],
  }),
  title: {
    absolute: 'Photography meetups & community in the Netherlands - Creative Photography Group',
  },
};

export default function Home() {
  return (
    <>
      <HomeHeroSection />
      <div
        id="home-below-fold"
      >
        <CachedHomeBelowFold
          includeTestContent={false}
        />
      </div>
      {/* Header read stays outside the cached shell so `/` can prerender. */}
      <Suspense
        fallback={null}
      >
        <HomeBelowFoldE2E />
      </Suspense>
    </>
  );
}

async function HomeBelowFoldE2E() {
  const includeTestContent = await getIncludeTestContent();
  if (!includeTestContent) return null;

  return (
    <HomeBelowFoldE2ESwap>
      <CachedHomeBelowFold
        includeTestContent
      />
    </HomeBelowFoldE2ESwap>
  );
}

async function CachedHomeBelowFold({ includeTestContent }: { includeTestContent: boolean }) {
  'use cache';
  cacheLife('home');
  cacheTag('home');

  const data = await getHomePageData(includeTestContent);
  return (
    <HomeBelowFoldContent
      {...data}
    />
  );
}
