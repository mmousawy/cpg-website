'use client';

import { CPGEvent } from '@/types/events';

import Image from 'next/image';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import { useEffect } from 'react';

type ImageDimensions = {
  width: number;
  height: number;
};

export default function EventImage({ event, size, excludeFromGallery }: { event: CPGEvent & { dimensions: ImageDimensions }, size?: 'small', excludeFromGallery?: boolean }) {
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
    const imageElement = (
      <Image
        width={320}
        height={240}
        alt='Event cover image'
        className='mb-4 w-full rounded-md max-sm:block sm:hidden'
        src={event.cover_image!}
      />
    );

    if (excludeFromGallery) {
      return imageElement;
    }

    return (
      <a
        href={event.cover_image!}
        className="block"
        data-pswp-width={event.dimensions.width}
        data-pswp-height={event.dimensions.height}
        target="_blank"
        rel="noreferrer"
      >
        {imageElement}
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
