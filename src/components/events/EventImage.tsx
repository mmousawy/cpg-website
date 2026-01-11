import Image from 'next/image';
import Link from 'next/link';

import { CPGEvent } from '@/types/events';

export default function EventImage({ event, size }: { event: CPGEvent, size?: 'small' }) {
  const imageSrc = event.cover_image || event.image_url;
  if (!imageSrc) return null;

  if (size === 'small') {
    return (
      <Link
        href={`/events/${event.slug}`}
        className="block"
      >
        <Image
          width={320}
          height={240}
          alt={event.title || 'Event cover image'}
          className='mb-4 w-full rounded-md max-sm:block sm:hidden'
          src={imageSrc}
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block size-60 shrink-0 max-sm:hidden"
    >
      <Image
        width={640}
        height={640}
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 640px"
        loading='eager'
        quality={85}
        alt={event.title || 'Event cover image'}
        className='size-full rounded-md object-cover h-48'
        src={imageSrc}
      />
    </Link>
  );
}
