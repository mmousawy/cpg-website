import HomeBelowFoldLoader from '@/components/home/HomeBelowFoldLoader';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { createMetadata } from '@/utils/metadata';

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
      <HomeBelowFoldLoader />
    </>
  );
}
