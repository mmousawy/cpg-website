'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { blurhashToDataURL, getBlurhashDimensions } from '@/utils/decodeBlurhash';
import { getBlurPlaceholderUrl } from '@/utils/supabaseImageLoader';

// Threshold in ms - if image loads faster than this, it's likely from browser cache
const CACHE_LOAD_THRESHOLD_MS = 100;

// Safe useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type BlurImageProps = Omit<ImageProps, 'onLoad'> & {
  /** Blurhash string for instant placeholder (no network request) */
  blurhash?: string | null;
  /** Disable blur placeholder */
  noBlur?: boolean;
  /** Use object-contain instead of object-cover (for sized images) */
  contain?: boolean;
  /** Callback when image finishes loading */
  onLoad?: () => void;
};

/**
 * Image component with blur placeholder for Supabase-hosted images.
 *
 * If `blurhash` is provided: Decodes to data URL for instant placeholder (no network)
 * Otherwise: Fetches tiny version from Supabase (requires network)
 *
 * Images fade in smoothly when loaded (unless loaded from browser cache).
 */
export default function BlurImage({
  src,
  alt,
  className = '',
  blurhash,
  noBlur = false,
  fill,
  contain = false,
  onLoad: onLoadProp,
  ...props
}: BlurImageProps) {
  const srcString = typeof src === 'string' ? src : (src as any)?.src;

  // Track the current src to detect changes and reset state
  const [currentSrc, setCurrentSrc] = useState(srcString);
  const [isLoaded, setIsLoaded] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const mountTime = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const hasCalledOnLoad = useRef(false);

  // Reset state when src changes (during render, not in effect)
  if (srcString !== currentSrc) {
    setCurrentSrc(srcString);
    setIsLoaded(false);
    setSkipTransition(false);
  }

  // Set mount time synchronously after render (before paint) and check for cached images
  useIsomorphicLayoutEffect(() => {
    // Reset refs for new image
    mountTime.current = Date.now();
    hasCalledOnLoad.current = false;

    // Check if image is already complete (browser cache hit)
    if (imageRef.current?.complete && imageRef.current?.naturalWidth > 0) {
      hasCalledOnLoad.current = true;
      setSkipTransition(true);
      setIsLoaded(true);
    }
  }, [currentSrc]); // Re-run when src changes

  // Handler for image load - detects browser cache via timing
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Store ref to the image element
    imageRef.current = e.currentTarget;

    // Prevent double-calling
    if (hasCalledOnLoad.current) return;
    hasCalledOnLoad.current = true;

    const now = Date.now();
    const loadTime = mountTime.current > 0 ? now - mountTime.current : 0;
    const isCached = loadTime < CACHE_LOAD_THRESHOLD_MS;

    if (isCached) {
      // Image loaded very quickly - from browser cache, show instantly
      setSkipTransition(true);
      setIsLoaded(true);
    } else {
      // Image took time to load - use fade-in transition
      requestAnimationFrame(() => {
        setIsLoaded(true);
      });
    }

    // Call external onLoad callback
    onLoadProp?.();
  };

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
        alt={alt || ''}
        className={`${className} ${skipTransition ? '' : 'transition-opacity duration-300'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        fill={fill}
        onLoad={handleImageLoad}
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
          alt={alt || ''}
          fill
          className={`${className} ${skipTransition ? '' : 'transition-opacity duration-300'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleImageLoad}
          {...props}
        />
      </>
    );
  }

  // For sized images: use a wrapper with the blur as background, main image on top
  // Only set explicit width if no responsive width class AND not using contain mode
  const hasResponsiveWidth = /\bw-(full|auto|screen|\d+|px|\[)/.test(className);

  // Merge passed style prop with wrapper styles
  const passedStyle = (props as any).style || {};

  // For contain mode: simpler structure where image drives the sizing
  if (contain) {
    return (
      <span
        className={`block relative ${className}`}
        style={{
          backgroundImage: blurhashDataUrl ? `url(${blurhashDataUrl})` : undefined,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          ...passedStyle,
        }}
      >
        <Image
          src={src}
          alt={alt || ''}
          className={`${skipTransition ? '' : 'transition-opacity duration-300'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleImageLoad}
          {...props}
        />
      </span>
    );
  }

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{
        ...(hasResponsiveWidth ? {} : {
          width: imgWidth ? `${imgWidth}px` : undefined,
          maxWidth: '100%',
        }),
        ...passedStyle,
      }}
    >
      {/* Blur placeholder as background div - matches the main image dimensions */}
      {blurhashDataUrl ? (
        <div
          className={`w-full ${isLoaded ? 'invisible' : ''}`}
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
          className={`${className} ${isLoaded ? 'invisible' : ''}`}
          preload
          quality={30}
          sizes="64px"
        />
      ) : (
        <div
          className={`w-full bg-neutral-200 dark:bg-neutral-800 ${isLoaded ? 'invisible' : ''}`}
          style={{
            aspectRatio: imgWidth && imgHeight ? `${imgWidth} / ${imgHeight}` : undefined,
          }}
          aria-hidden="true"
        />
      )}

      {/* Main image - absolutely positioned on top, fades in */}
      <Image
        src={src}
        alt={alt || ''}
        className={`absolute inset-0 w-full h-full object-cover ${skipTransition ? '' : 'transition-opacity duration-300'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleImageLoad}
        {...props}
      />
    </span>
  );
}
