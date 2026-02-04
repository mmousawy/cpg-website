'use client';

import Image, { type ImageProps } from 'next/image';
import { useMemo, useState } from 'react';

import { blurhashToDataURL, getBlurhashDimensions } from '@/utils/decodeBlurhash';
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
      const dims = getBlurhashDimensions(imgWidth || 0, imgHeight || 0, 64);
      return blurhashToDataURL(blurhash, dims.width, dims.height);
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
        className={`${className} transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
            className={`${className} absolute inset-0`}
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
            className={`${className}`}
            preload
            quality={30}
            sizes="64px"
          />
        )}

        {/* Main image - fades in on top when loaded */}
        <Image
          src={src}
          alt={alt}
          fill
          className={`${className} transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadingComplete={() => setIsLoaded(true)}
          {...props}
        />
      </>
    );
  }

  // For sized images: use a wrapper with the blur as background, main image on top
  // Only set explicit width if no responsive width class (w-full, w-auto, etc.) is provided
  const hasResponsiveWidth = /\bw-(full|auto|screen|\d+|px|\[)/.test(className);

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={hasResponsiveWidth ? undefined : {
        width: imgWidth ? `${imgWidth}px` : undefined,
        maxWidth: '100%',
      }}
    >
      {/* Blur placeholder as background div - matches the main image dimensions */}
      {blurhashDataUrl ? (
        <div
          className="w-full"
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
          className={`${className}`}
          preload
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
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoadingComplete={() => setIsLoaded(true)}
        {...props}
      />
    </span>
  );
}
