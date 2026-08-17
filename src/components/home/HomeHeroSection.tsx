import HeroImage from '@/components/shared/HeroImage';
import { HERO_IMAGES } from '@/config/heroImages';
import { getUpcomingEvents } from '@/lib/data/events';

const heroImages = HERO_IMAGES;

export async function HomeHeroSection() {
  const { serverNow } = await getUpcomingEvents(1);

  const serverDate = new Date(serverNow);
  const yearStart = new Date(serverDate.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((serverNow - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const heroImage = heroImages[dayOfYear % heroImages.length];

  return (
    <div
      className="relative h-[clamp(16rem,22svw,20rem)] w-full bg-background-light"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+5rem)] overflow-hidden"
      >
        <HeroImage
          src={heroImage.src}
          blurhash={heroImage.blurhash}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+5rem)]"
      >
        <div
          className="absolute inset-0 scrim-gradient-mask-strong"
        />

        <div
          className="absolute inset-0 scrim-gradient-overlay-strong"
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 px-2 sm:px-8"
      >
        <div
          className="flex flex-col items-center mx-auto max-w-screen-md"
        >
          <p
            className="mb-2 px-4 text-5xl md:text-7xl font-heading hero-title-shadow sm:mb-3 text-center"
          >
            Photography, together.
          </p>
          <h1
            className="inline-grid max-sm:grid-rows-2 sm:grid-cols-2 mb-4 px-4 max-w-2xl font-(family-name:--font-geist-sans)! text-lg opacity-80 sm:text-xl hero-title-shadow font-medium"
          >
            Creative Photography Group <span
              className="flex items-center max-sm:justify-center"
            ><span
              className="max-sm:hidden mx-2"
            >&mdash;</span> Shoot. Share. Explore.</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
