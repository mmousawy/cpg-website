import BlurImage from './BlurImage';
import { HERO_BLURHASH_HEIGHT, HERO_BLURHASH_WIDTH } from '@/config/heroImages';

interface HeroImageProps {
  src: string;
  blurhash?: string | null;
}

/**
 * Hero image component that displays a provided image with optimal LCP settings
 * Image selection should be done server-side to ensure immediate discovery
 */
export default function HeroImage({ src, blurhash }: HeroImageProps) {
  return (
    <BlurImage
      src={src}
      alt="Creative Photography Group meetup"
      fill
      className="object-cover object-[center_30%]"
      fetchPriority="high"
      loading="eager"
      preload
      sizes="100vw"
      quality={80}
      blurhash={blurhash}
      blurhashWidth={HERO_BLURHASH_WIDTH}
      blurhashHeight={HERO_BLURHASH_HEIGHT}
      fadeIn={false}
    />
  );
}
