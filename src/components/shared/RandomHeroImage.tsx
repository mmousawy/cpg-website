'use client';

import Image from 'next/image';
import { useState } from 'react';

// Static imports - enables blur placeholder and immutable CDN caching
import hero1 from 'public/gallery/home-hero1.jpg';
import hero2 from 'public/gallery/home-hero2.jpg';
import hero3 from 'public/gallery/home-hero3.jpg';
import hero4 from 'public/gallery/home-hero4.jpg';
import hero5 from 'public/gallery/home-hero5.jpg';
import hero6 from 'public/gallery/home-hero6.jpg';
import hero7 from 'public/gallery/home-hero7.jpg';

const heroImages = [hero1, hero2, hero3, hero4, hero5, hero6, hero7] as const;

export default function RandomHeroImage() {
  // Use lazy initializer for random image - runs once on mount
  // suppressHydrationWarning handles SSR/client mismatch
  const [heroImage] = useState(
    () => heroImages[Math.floor(Math.random() * heroImages.length)],
  );

  // Track if image has loaded (for fade-in animation)
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      src={heroImage}
      alt="Creative Photography Group meetup"
      fill
      placeholder="blur"
      className={`object-cover object-[center_30%] brightness-75 transition-opacity duration-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      priority
      sizes="60vw"
      quality={85}
      onLoad={() => setIsLoaded(true)}
      suppressHydrationWarning
    />
  );
}
