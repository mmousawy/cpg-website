'use client';

import clsx from 'clsx';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import { useEffect, useRef, useState } from 'react';
import BlurImage from '../shared/BlurImage';
import LoadingSpinner from '../shared/LoadingSpinner';

type PhotoWithLightboxProps = {
  url: string;
  title: string;
  width: number;
  height: number;
  blurhash: string;
  isInAlbum?: boolean;
};

export default function PhotoWithLightbox({ url, title, width, height, blurhash, isInAlbum = false }: PhotoWithLightboxProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!galleryRef.current) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: galleryRef.current,
      children: 'a',
      pswpModule: () => import('photoswipe'),
    });

    lightbox.init();

    return () => {
      lightbox.destroy();
    };
  }, []);

  // Show spinner after 200ms delay (avoid flash for fast loads)
  useEffect(() => {
    if (isLoaded) return;

    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <div
      id="gallery"
      className="flex w-full text-center relative"
      ref={galleryRef}
    >
      {/* Loading spinner - shows after 200ms, fades out when loaded */}
      <div
        className={clsx(
          'absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300',
          showSpinner && !isLoaded ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="rounded-full bg-black/40 dark:bg-black/60 p-2 shadow-lg backdrop-blur-sm"
        >
          <LoadingSpinner
            className="border-white/90 border-t-transparent border-[3px] size-6!"
          />
        </div>
      </div>

      <a
        href={url}
        data-pswp-src={url}
        data-pswp-width={width}
        data-pswp-height={height}
        className="m-auto cursor-zoom-in!"
      >
        <BlurImage
          src={url}
          alt={title}
          width={width}
          height={height}
          blurhash={blurhash}
          contain
          unoptimized
          onLoad={() => setIsLoaded(true)}
          className={clsx(
            isInAlbum ? 'max-h-[calc(100vh-154px)] sm:max-h-[calc(100vh-172px)] lg:max-h-[calc(100vh-218px)]'
                      : 'max-h-[calc(100vh-90px)] sm:max-h-[calc(100vh-106px)] lg:max-h-[calc(100vh-138px)] ',
          )}
          style={{
            aspectRatio: `${width}/${height}`,
          }}
        />
      </a>
    </div>
  );
}
