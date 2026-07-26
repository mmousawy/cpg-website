import BlurImage from './BlurImage';
import { HERO_BLURHASH_HEIGHT, HERO_BLURHASH_WIDTH } from '@/config/heroImages';
import { MOBILE_PRELOAD_WIDTH } from '@/utils/supabaseImageLoader';

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
      className="object-cover object-[center_30%] brightness-75"
      fetchPriority="high"
      loading="eager"
      preload
      sizes={`(max-width: 768px) ${MOBILE_PRELOAD_WIDTH}px, (max-width: 1200px) 75vw, 1200px`}
      quality={92}
      blurhash={blurhash}
      blurhashWidth={HERO_BLURHASH_WIDTH}
      blurhashHeight={HERO_BLURHASH_HEIGHT}
    />
  );
}
