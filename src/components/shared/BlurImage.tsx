'use client';

import Image, { type ImageProps } from 'next/image';
import { useMemo, useState } from 'react';

import { blurhashToDataURL } from '@/utils/decodeBlurhash';
import { getBlurPlaceholderUrl } from '@/utils/supabaseImageLoader';

type BlurImageProps = Omit<ImageProps, 'onLoad'> & {
  /** Blurhash string for instant placeholder (no network request) */
  blurhash?: string | null;
  /** Disable blur placeholder */
  noBlur?: boolean;
};

/**
 * Image component with blur placeholder for Supabase-hosted images.
 *
 * If `blurhash` is provided: Decodes to data URL for instant placeholder (no network)
 * Otherwise: Fetches tiny version from Supabase (requires network)
 *
 * Images fade in smoothly when loaded.
 */
export default function BlurImage({
  src,
  alt,
  className = '',
  blurhash,
  noBlur = false,
  fill,
  ...props
}: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const srcString = typeof src === 'string' ? src : (src as any)?.src;

  // Get image dimensions for aspect ratio
  const imgWidth = typeof props.width === 'number' ? props.width : parseInt(String(props.width), 10);
  const imgHeight = typeof props.height === 'number' ? props.height : parseInt(String(props.height), 10);

  // Decode blurhash with correct aspect ratio - works on both server (SSR) and client
  const blurhashDataUrl = useMemo(() => {
    if (blurhash && !noBlur) {
      // Calculate decode dimensions maintaining aspect ratio (max 64px on longest side)
      let decodeWidth = 64;
      let decodeHeight = 64;
      if (imgWidth && imgHeight && imgWidth > 0 && imgHeight > 0) {
        if (imgWidth > imgHeight) {
          decodeWidth = 64;
          decodeHeight = Math.round((imgHeight / imgWidth) * 64);
        } else {
          decodeHeight = 64;
          decodeWidth = Math.round((imgWidth / imgHeight) * 64);
        }
      }
      return blurhashToDataURL(blurhash, decodeWidth, decodeHeight);
    }
    return null;
  }, [blurhash, noBlur, imgWidth, imgHeight]);

  // Fall back to Supabase tiny image if no blurhash
  const blurUrl = noBlur ? null : (blurhashDataUrl || getBlurPlaceholderUrl(srcString));

  // If no blur placeholder available, render normal Image with fade
  if (!blurUrl) {
    return (
      <Image
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        fill={fill}
        onLoadingComplete={() => setIsLoaded(true)}
        {...props}
      />
    );
  }

  // For fill layout - blur stays behind, main image fades in on top
  if (fill) {
    return (
      <>
        {/* Background color - instant fallback */}
        <div
          className={`${className} absolute inset-0 bg-neutral-200 dark:bg-neutral-800`}
          aria-hidden="true"
        />

        {/* Blur placeholder - loads on top of background */}
        {blurhashDataUrl ? (
          <div
            className={`${className} blur-md absolute inset-0`}
            style={{
              backgroundImage: `url(${blurhashDataUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden="true"
          />
        ) : (
          <Image
            src={blurUrl}
            alt=""
            aria-hidden="true"
            fill
            className={`${className} blur-md`}
            priority
            quality={30}
            sizes="64px"
          />
        )}

        {/* Main image - fades in on top when loaded */}
        <Image
          src={src}
          alt={alt}
          fill
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadingComplete={() => setIsLoaded(true)}
          {...props}
        />
      </>
    );
  }

  // For sized images: use a wrapper with the blur as background, main image on top
  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{
        width: imgWidth ? `${imgWidth}px` : undefined,
        maxWidth: '100%',
      }}
    >
      {/* Blur placeholder as background div - matches the main image dimensions */}
      {blurhashDataUrl ? (
        <div
          className="blur-md w-full"
          style={{
            backgroundImage: `url(${blurhashDataUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            aspectRatio: imgWidth && imgHeight ? `${imgWidth} / ${imgHeight}` : undefined,
          }}
          aria-hidden="true"
        />
      ) : blurUrl ? (
        <Image
          src={blurUrl}
          alt=""
          aria-hidden="true"
          width={props.width}
          height={props.height}
          className={`blur-md ${className}`}
          priority
          quality={30}
          sizes="64px"
        />
      ) : (
        <div
          className="w-full bg-neutral-200 dark:bg-neutral-800"
          style={{
            aspectRatio: imgWidth && imgHeight ? `${imgWidth} / ${imgHeight}` : undefined,
          }}
          aria-hidden="true"
        />
      )}

      {/* Main image - absolutely positioned on top, fades in */}
      <Image
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoadingComplete={() => setIsLoaded(true)}
        {...props}
      />
    </span>
  );
}
