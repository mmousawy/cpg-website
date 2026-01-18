import Image from 'next/image';

interface HeroImageProps {
  src: string;
}

/**
 * Hero image component that displays a provided image with optimal LCP settings
 * Image selection should be done server-side to ensure immediate discovery
 */
export default function HeroImage({ src }: HeroImageProps) {
  return (
    <Image
      src={src}
      alt="Creative Photography Group meetup"
      fill
      className="object-cover object-[center_30%] brightness-75"
      priority
      fetchPriority="high"
      sizes="100vw"
      quality={85}
    />
  );
}
