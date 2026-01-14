'use client';

import Image from 'next/image';
import { useState } from 'react';

const heroImages = [
  '/gallery/home-hero1.jpg',
  '/gallery/home-hero2.jpg',
  '/gallery/home-hero3.jpg',
  '/gallery/home-hero4.jpg',
  '/gallery/home-hero5.jpg',
  '/gallery/home-hero6.jpg',
  '/gallery/home-hero7.jpg',
];

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
