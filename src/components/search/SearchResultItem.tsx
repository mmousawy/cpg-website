'use client';

import Avatar from '@/components/auth/Avatar';
import BlurImage from '@/components/shared/BlurImage';
import type { SearchResult } from '@/types/search';
import { stripHtml } from '@/utils/stripHtml';
import clsx from 'clsx';
import Link from 'next/link';
import CalendarSVG from 'public/icons/calendar2.svg';
import FolderSVG from 'public/icons/folder.svg';
import { useEffect, useRef } from 'react';

interface SearchResultItemProps {
  result: SearchResult;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function SearchResultItem({ result, onSelect, isSelected = false }: SearchResultItemProps) {
  const itemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const handleClick = () => {
    onSelect?.();
  };

  // Member result - uses Avatar component like MemberCard
  if (result.entity_type === 'members') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <Avatar
          avatarUrl={result.image_url}
          fullName={result.title}
          size="md"
          hoverEffect
        />
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-medium text-sm leading-tight line-clamp-1"
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              className="mt-0.5 text-xs text-foreground/60 line-clamp-1"
            >
              {result.subtitle}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Album result - matches AlbumMiniCard styling
  if (result.entity_type === 'albums') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-2 border pr-3 transition-colors',
          isSelected
            ? 'border-primary bg-background-light text-primary'
            : 'border-border-color-strong bg-background-medium hover:border-primary hover:text-primary',
        )}
      >
        <div
          className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden bg-background"
        >
          {result.image_url ? (
            <BlurImage
              src={result.image_url}
              alt={result.title}
              fill
              sizes="128px"
              className="object-cover"
              blurhash={result.image_blurhash}
            />
          ) : (
            <FolderSVG
              className="size-6 text-foreground/30"
            />
          )}
        </div>
        <div
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span
            className="text-sm font-medium leading-none line-clamp-2"
          >
            {result.title}
          </span>
          {result.subtitle && (
            <span
              className="text-xs text-foreground/80"
            >
              {result.subtitle}
            </span>
          )}
        </div>
      </Link>
    );
  }

  // Photo result - square thumbnail like PhotoCard
  if (result.entity_type === 'photos') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-square w-14 bg-background"
        >
          {result.image_url ? (
            <BlurImage
              src={result.image_url}
              alt={result.title}
              fill
              sizes="128px"
              className="object-cover group-hover:brightness-110 transition-all"
              blurhash={result.image_blurhash}
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-background-medium"
            >
              <span
                className="text-xs text-foreground/30"
              >
                ?
              </span>
            </div>
          )}
        </div>
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-medium text-sm leading-tight line-clamp-1"
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              className="mt-1 text-xs text-foreground/60 line-clamp-1"
            >
              {result.subtitle}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Event result - with date/location info like EventsList
  if (result.entity_type === 'events') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-4/3 w-20 bg-background"
        >
          {result.image_url ? (
            <BlurImage
              src={result.image_url}
              alt={result.title}
              fill
              sizes="128px"
              className="object-cover group-hover:brightness-110 transition-all"
              blurhash={result.image_blurhash}
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-background-medium"
            >
              <CalendarSVG
                className="size-6 fill-foreground/20"
              />
            </div>
          )}
        </div>
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-semibold text-sm leading-tight line-clamp-1"
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              className="mt-1 text-xs text-foreground/60 line-clamp-2"
            >
              {result.subtitle}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Scene event result - community photography events
  if (result.entity_type === 'scene-events') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-4/3 w-20 bg-background"
        >
          {result.image_url ? (
            <BlurImage
              src={result.image_url}
              alt={result.title}
              fill
              sizes="128px"
              className="object-cover group-hover:brightness-110 transition-all"
              blurhash={result.image_blurhash}
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-background-medium"
            >
              <CalendarSVG
                className="size-6 fill-foreground/20"
              />
            </div>
          )}
        </div>
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-semibold text-sm leading-tight line-clamp-1"
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              className="mt-1 text-xs text-foreground/60 line-clamp-2"
            >
              {result.subtitle}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Challenge result - photo challenge with prompt
  if (result.entity_type === 'challenges') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-4/3 w-20 bg-background"
        >
          {result.image_url ? (
            <BlurImage
              src={result.image_url}
              alt={result.title}
              fill
              sizes="128px"
              className="object-cover group-hover:brightness-110 transition-all"
              blurhash={result.image_blurhash}
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-background-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6 text-foreground/20"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                />
              </svg>
            </div>
          )}
        </div>
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-semibold text-sm leading-tight line-clamp-1"
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              className="mt-1 text-xs text-foreground/60 line-clamp-2"
            >
              {stripHtml(result.subtitle)}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Tag result - simple pill style
  if (result.entity_type === 'tags') {
    return (
      <Link
        ref={itemRef}
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6h.008v.008H6V6Z"
            />
          </svg>
        </div>
        <div
          className="min-w-0 flex-1"
        >
          <p
            className="font-medium text-sm leading-tight"
          >
            {result.title}
          </p>
          <p
            className="mt-0.5 text-xs text-foreground/60"
          >
            {result.subtitle}
          </p>
        </div>
      </Link>
    );
  }

  // Fallback for unknown types
  return (
    <Link
      href={result.url || '#'}
      onClick={handleClick}
      className={clsx(
        'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
        isSelected
          ? 'border-primary bg-background'
          : 'border-border-color-strong bg-background-light hover:border-primary hover:bg-background',
      )}
    >
      <div
        className="min-w-0 flex-1"
      >
        <p
          className="font-medium text-sm line-clamp-1"
        >
          {result.title}
        </p>
        {result.subtitle && (
          <p
            className="mt-1 text-xs text-foreground/60 line-clamp-1"
          >
            {result.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
