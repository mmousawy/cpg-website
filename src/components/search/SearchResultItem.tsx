'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/components/auth/Avatar';
import CalendarSVG from 'public/icons/calendar2.svg';
import FolderSVG from 'public/icons/folder.svg';
import type { SearchResult } from '@/types/search';

interface SearchResultItemProps {
  result: SearchResult;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function SearchResultItem({ result, onSelect, isSelected = false }: SearchResultItemProps) {
  const handleClick = () => {
    onSelect?.();
  };

  // Member result - uses Avatar component like MemberCard
  if (result.entity_type === 'members') {
    return (
      <Link
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
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
            <Image
              src={result.image_url}
              alt={result.title}
              fill
              sizes="64px"
              className="object-cover"
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
              className="text-xs text-foreground/70"
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
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-square w-14 bg-background"
        >
          {result.image_url ? (
            <Image
              src={result.image_url}
              alt={result.title}
              fill
              sizes="56px"
              className="object-cover group-hover:brightness-110 transition-all"
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
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded aspect-4/3 w-20 bg-background"
        >
          {result.image_url ? (
            <Image
              src={result.image_url}
              alt={result.title}
              fill
              sizes="80px"
              className="object-cover group-hover:brightness-110 transition-all"
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

  // Tag result - simple pill style
  if (result.entity_type === 'tags') {
    return (
      <Link
        href={result.url || '#'}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-background'
            : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
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
          : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
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
