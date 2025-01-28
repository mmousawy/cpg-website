'use client';

import { CPGEvent } from '@/types/events';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';

import Image from 'next/image';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import { useEffect } from 'react';

export default function EventImage({ event, size }: { event: CPGEvent & { dimensions: ISizeCalculationResult }, size?: 'small' }) {
  useEffect(() => {
    let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
      gallery: `#gallery-${event.id}`,
      children: 'a',
      pswpModule: () => import('photoswipe'),
    });

    lightbox.init();

    return () => {
      lightbox?.destroy();
      lightbox = null;
    };
  }, [event.id]);
  
  if (size === 'small') {
    return (
      <a
        href={event.cover_image!}
        className="block"
        data-pswp-width={event.dimensions.width}
        data-pswp-height={event.dimensions.height}
        target="_blank"
        rel="noreferrer"
      >
        <Image
          width={320}
          height={240}
          alt='Event cover image'
          className='mb-4 w-full rounded-md max-sm:block sm:hidden'
          src={event.cover_image!}
        />
      </a>
    );
  }

  return (
    <a
      href={event.cover_image!}
      className="block size-60 shrink-0 max-sm:hidden"
      data-pswp-width={event.dimensions.width}
      data-pswp-height={event.dimensions.height}
      target="_blank"
      rel="noreferrer"
    >
      <Image
        width={640}
        height={640}
        alt='Event cover image'
        className='rounded-md object-cover'
        src={event.cover_image!}
      />
    </a>
  );
};
