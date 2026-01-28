import BlurImage from './BlurImage';

interface HeroImageProps {
  src: string;
}

/**
 * Hero image component that displays a provided image with optimal LCP settings
 * Image selection should be done server-side to ensure immediate discovery
 */
export default function HeroImage({ src }: HeroImageProps) {
  return (
    <BlurImage
      src={src}
      alt="Creative Photography Group meetup"
      fill
      className="object-cover object-[center_30%] brightness-75"
      fetchPriority="high"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1200px"
      quality={85}
    />
  );
}
