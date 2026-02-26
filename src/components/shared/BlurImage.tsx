'use client';

import Image, { type ImageProps } from 'next/image';
import { useLayoutEffect, useEffect, useCallback, useMemo, useRef, useState } from 'react';

import { blurhashToDataURL, getBlurhashDimensions } from '@/utils/decodeBlurhash';
import { getBlurPlaceholderUrl } from '@/utils/supabaseImageLoader';

// SPA-level cache: tracks image src strings that have been fully loaded during
// this JS context. Once an image loads, subsequent renders (e.g. navigating back)
// can skip the fade because the browser will serve it from memory/disk cache.
const loadedImages = typeof window !== 'undefined' ? new Set<string>() : null;

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

  // Cache key must uniquely identify the actual fetched resource.
  // The same base URL produces very different fetches depending on props:
  // - The custom loader appends ?width=X&quality=Y based on `sizes`/`width`
  // - `unoptimized` bypasses the loader entirely (raw full-size file)
  // Without this, a 72px thumbnail would "poison" the cache for a 2400px hero.
  const isUnoptimized = !!props.unoptimized;
  const cacheKey = srcString
    ? `${srcString}|s=${props.sizes || ''}|w=${props.width || ''}|q=${props.quality || ''}|u=${isUnoptimized ? 1 : 0}`
    : null;

  // Three visual states: 'loading' | 'fade-in' | 'visible'
  // - loading: image not loaded yet (opacity-0, blur placeholder visible)
  // - fade-in: image loaded from network, CSS animation 0→1 (300ms)
  // - visible: fully visible, no animation (cached or animation done)
  const [currentSrc, setCurrentSrc] = useState(srcString);
  const [loadState, setLoadState] = useState<'loading' | 'fade-in' | 'visible'>('loading');
  const hasCalledOnLoad = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onLoadPropRef = useRef(onLoadProp);
  useEffect(() => { onLoadPropRef.current = onLoadProp; }, [onLoadProp]);

  // Reset state when src changes (during render, not in effect)
  if (srcString !== currentSrc) {
    setCurrentSrc(srcString);
    setLoadState('loading');
  }

  // Callback ref — stores the underlying <img> element so the layout effect
  // can check img.complete as a safety net.
  const imgCallbackRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
  }, []);

  // Before paint: determine the correct initial state for this image.
  // Runs after callback refs are set, so imgRef.current is available.
  //
  // Priority:
  // 1. SPA cache hit → 'visible' (instant, no animation)
  // 2. img.complete (SSR-preloaded, already decoded) → 'fade-in'
  // 3. Otherwise → stay 'loading', wait for onLoad
  useIsomorphicLayoutEffect(() => {
    const known = !!(cacheKey && loadedImages?.has(cacheKey));
    if (known) {
      hasCalledOnLoad.current = true;
      setLoadState('visible');
      return;
    }

    // Not in SPA cache. Check if the browser already loaded this image
    // (happens with SSR + preload — the image finishes before React hydrates).
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      hasCalledOnLoad.current = true;
      if (cacheKey) loadedImages?.add(cacheKey);
      setLoadState('fade-in');
      onLoadPropRef.current?.();
      return;
    }

    // Image not ready yet — reset and wait for onLoad handler.
    hasCalledOnLoad.current = false;
  }, [currentSrc, cacheKey]);

  // Handler for image load - fires when the <img> element actually finishes loading.
  const handleImageLoad = useCallback(() => {
    if (hasCalledOnLoad.current) {
      // Already handled (SPA cache or layout effect safety net). Still notify parent.
      onLoadProp?.();
      return;
    }
    hasCalledOnLoad.current = true;

    // Remember this image for future navigations
    if (cacheKey) loadedImages?.add(cacheKey);

    // Always fade in. The SPA cache (checked in the layout effect above) is the
    // only reliable way to skip the fade — timing heuristics are unreliable because
    // SSR-preloaded images fire onLoad almost instantly during hydration even though
    // they were fetched from the network.
    setLoadState('fade-in');

    // Call external onLoad callback
    onLoadProp?.();
  }, [cacheKey, onLoadProp]);

  // Transition to 'visible' once the fade-in animation completes.
  // This lets us safely remove the blurhash background after the fade finishes,
  // avoiding a Chrome compositing bug where the background bleeds through image edges.
  const handleAnimationEnd = useCallback(() => {
    if (loadState === 'fade-in') {
      setLoadState('visible');
    }
  }, [loadState]);

  // Map loadState to CSS class.
  // Uses a CSS @keyframes animation for fade-in (works in a single React commit)
  // instead of CSS transitions which are unreliable with React's batched rendering.
  const opacityClass =
    loadState === 'visible' ? 'opacity-100' :
    loadState === 'fade-in' ? 'animate-fade-in-fast' :
    'opacity-0';

  const isLoaded = loadState !== 'loading';

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
        ref={imgCallbackRef}
        src={src}
        alt={alt || ''}
        className={`${className} ${opacityClass}`}
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
          ref={imgCallbackRef}
          src={src}
          alt={alt || ''}
          fill
          className={`${className} ${opacityClass}`}
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
        className={`block relative overflow-hidden ${className}`}
        style={passedStyle}
      >
        {/* Blurhash placeholder as a separate layer behind the image */}
        {blurhashDataUrl && (
          <span
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${blurhashDataUrl})`,
              backgroundSize: '100% 100%',
            }}
            aria-hidden="true"
          />
        )}
        <Image
          ref={imgCallbackRef}
          src={src}
          alt={alt || ''}
          className={`${opacityClass} relative z-10`}
          onLoad={handleImageLoad}
          onAnimationEnd={handleAnimationEnd}
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
        ref={imgCallbackRef}
        src={src}
        alt={alt || ''}
        className={`absolute inset-0 w-full h-full object-cover ${opacityClass}`}
        onLoad={handleImageLoad}
        {...props}
      />
    </span>
  );
}
