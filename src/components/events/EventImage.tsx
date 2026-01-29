import Link from 'next/link';

import BlurImage from '@/components/shared/BlurImage';
import { CPGEvent } from '@/types/events';

export default function EventImage({ event, size, tabIndex }: { event: CPGEvent, size?: 'small', tabIndex?: number } & Omit<React.ComponentProps<typeof Link>, 'href'>) {
  const imageSrc = event.cover_image;
  if (!imageSrc) return null;

  if (size === 'small') {
    return (
      <Link
        href={`/events/${event.slug}`}
        className="block"
        tabIndex={tabIndex}
      >
        <BlurImage
          width={560}
          height={300}
          sizes="(max-width: 560px) 100vw, 560px"
          alt={event.title || 'Event cover image'}
          className='mb-4 w-full max-w-full rounded-md'
          src={imageSrc}
          blurhash={event.image_blurhash}
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block w-60 shrink-0 max-sm:hidden h-auto self-start"
      tabIndex={tabIndex}
    >
      <BlurImage
        width={480}
        height={272}
        sizes="240px"
        loading='eager'
        quality={85}
        alt={event.title || 'Event cover image'}
        className='size-full rounded-md object-cover h-34 hover:brightness-90 transition-all duration-200'
        src={imageSrc}
        blurhash={event.image_blurhash}
      />
    </Link>
  );
}
