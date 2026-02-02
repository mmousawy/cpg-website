'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

import Avatar, { SIZE_MAP } from '@/components/auth/Avatar';
import Popover from './Popover';

const DEFAULT_MAX_VISIBLE_AVATARS = 12;
const DEFAULT_MAX_VISIBLE_AVATARS_MOBILE = 4;

export interface AvatarPerson {
  id: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  nickname?: string | null;
}

interface StackedAvatarsPopoverProps {
  /** List of people to display */
  people: AvatarPerson[];
  /** Singular label (e.g., "attendee", "like") */
  singularLabel: string;
  /** Plural label (e.g., "attendees", "likes") */
  pluralLabel: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Popover title format - receives count and label */
  popoverTitle?: (count: number, label: string) => string;
  /** Whether to show loading skeleton */
  isLoading?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Show count inline next to avatars */
  showInlineCount?: boolean;
  /** Disable popover interaction (just show avatars + count) */
  disablePopover?: boolean;
  /** Size of the avatars */
  avatarSize?: keyof typeof SIZE_MAP;
  /** Show count on mobile (default: false, hidden on mobile) */
  showCountOnMobile?: boolean;
  /** Max visible avatars on desktop (default: 12) */
  maxVisibleAvatars?: number;
  /** Max visible avatars on mobile (default: 4) */
  maxVisibleAvatarsMobile?: number;
}

/**
 * Stacked avatars that expand into a popover showing all people.
 * Used for attendees, likers, etc.
 */
export default function StackedAvatarsPopover({
  people,
  singularLabel,
  pluralLabel,
  emptyMessage = 'No one yet',
  popoverTitle,
  isLoading = false,
  className,
  showInlineCount = true,
  disablePopover = false,
  avatarSize = 'xxs',
  showCountOnMobile = false,
  maxVisibleAvatars = DEFAULT_MAX_VISIBLE_AVATARS,
  maxVisibleAvatarsMobile = DEFAULT_MAX_VISIBLE_AVATARS_MOBILE,
}: StackedAvatarsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const count = people.length;
  const label = count === 1 ? singularLabel : pluralLabel;
  const visiblePeople = people.slice(0, maxVisibleAvatars);
  const visiblePeopleMobile = people.slice(0, maxVisibleAvatarsMobile);
  const hasPeople = count > 0;
  const hiddenCount = count - maxVisibleAvatars;
  const hiddenCountMobile = count - maxVisibleAvatarsMobile;

  // Show skeleton avatars when loading
  const showSkeletonAvatars = isLoading && visiblePeople.length === 0;

  // Default popover title
  const title = popoverTitle
    ? popoverTitle(count, label)
    : `${count} ${label}`;

  // Shared content for avatars + count
  const avatarsContent = (
    <>
      <div
        className="flex items-center"
      >
        {showSkeletonAvatars ? (
          // Loading skeleton avatars
          [...Array(Math.min(3, 3))].map((_, i) => (
            <div
              key={i}
              className={clsx(
                'size-6 rounded-full bg-border-color',
                'ring-2 ring-background',
                i > 0 && '-ml-2',
                'animate-pulse',
              )}
            />
          ))
        ) : (
          <>
            {/* Desktop: show up to 5 avatars + count badge */}
            <div
              className="max-sm:hidden flex items-center"
            >
              {visiblePeople.map((person, index) => (
                <div
                  key={person.id}
                  className={clsx(
                    'relative rounded-full ring-2 ring-background bg-border-color',
                    index > 0 && '-ml-2',
                  )}
                  style={{ zIndex: index + 1 }}
                >
                  <Avatar
                    avatarUrl={person.avatarUrl}
                    fullName={person.fullName}
                    size={avatarSize}
                  />
                </div>
              ))}
              {hiddenCount > 0 && (
                <span
                  className={clsx(
                    'relative -ml-1.5 flex items-center justify-center rounded-full',
                    'bg-background-medium ring-2 ring-background',
                    'text-[10px] font-semibold text-foreground/80',
                    SIZE_MAP[avatarSize].wrapper,
                  )}
                  style={{ zIndex: maxVisibleAvatars + 1 }}
                >
                  +
                  {hiddenCount}
                </span>
              )}
            </div>
            {/* Mobile: show up to 3 avatars + count badge */}
            <div
              className="sm:hidden flex items-center"
            >
              {visiblePeopleMobile.map((person, index) => (
                <div
                  key={person.id}
                  className={clsx(
                    'relative rounded-full ring-2 ring-background bg-border-color',
                    index > 0 && '-ml-2',
                  )}
                  style={{ zIndex: index + 1 }}
                >
                  <Avatar
                    avatarUrl={person.avatarUrl}
                    fullName={person.fullName}
                    size={avatarSize}
                  />
                </div>
              ))}
              {hiddenCountMobile > 0 && (
                <span
                  className={clsx(
                    'relative -ml-1.5 flex items-center justify-center rounded-full',
                    'bg-background-medium ring-2 ring-background',
                    'text-[10px] font-semibold text-foreground/80',
                    SIZE_MAP[avatarSize].wrapper,
                  )}
                  style={{ zIndex: maxVisibleAvatarsMobile + 1 }}
                >
                  +
                  {hiddenCountMobile}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Count and label */}
      {showInlineCount && (
        <span
          className={clsx(
            'block text-xs font-medium text-foreground/70',
            !showCountOnMobile && 'max-sm:hidden',
          )}
        >
          {count > 0 ? `${count} ${label}` : emptyMessage}
        </span>
      )}
    </>
  );

  // If popover is disabled, just render the content as a div
  if (disablePopover) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1.5',
          hasPeople ? 'opacity-100' : 'opacity-60',
          className,
        )}
        aria-label={`${count} ${label}`}
      >
        {avatarsContent}
      </div>
    );
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      align="left"
      disabled={!hasPeople}
      trigger={
        <button
          type="button"
          disabled={!hasPeople}
          tabIndex={hasPeople ? 0 : -1}
          className={clsx(
            'flex! items-center gap-1.5 rounded-md',
            'transition-opacity duration-300 ease-out',
            'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            hasPeople ? 'opacity-100' : 'opacity-60 cursor-default',
            className,
          )}
          aria-label={`${count} ${label}`}
        >
          {avatarsContent}
        </button>
      }
    >
      <div
        className="p-2.5 max-h-96 overflow-y-auto"
      >
        <h4
          className="text-xs font-semibold mb-2 text-foreground"
        >
          {title}
        </h4>

        {isLoading ? (
          <div
            className="space-y-2"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-1.5"
              >
                <div
                  className="size-8 rounded-full bg-border-color animate-pulse"
                />
                <div
                  className="flex-1 space-y-1"
                >
                  <div
                    className="h-3 w-24 bg-border-color animate-pulse rounded"
                  />
                  <div
                    className="h-2 w-16 bg-border-color animate-pulse rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <p
            className="text-xs text-foreground/60"
          >
            {emptyMessage}
          </p>
        ) : (
          <div
            className="space-y-1"
          >
            {people.map((person) => (
              person.nickname ? (
                <Link
                  key={person.id}
                  href={`/@${person.nickname}`}
                  className="group flex items-center gap-2 p-1.5 rounded hover:bg-background transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Avatar
                    avatarUrl={person.avatarUrl}
                    fullName={person.fullName}
                    size="xs"
                    hoverEffect
                  />
                  <div
                    className="flex-1 min-w-0"
                  >
                    <p
                      className="text-xs font-medium truncate"
                    >
                      {person.fullName || 'Anonymous'}
                    </p>
                    <p
                      className="text-xs text-foreground/60 truncate"
                    >
                      @
                      {person.nickname}
                    </p>
                  </div>
                </Link>
              ) : (
                <div
                  key={person.id}
                  className="flex items-center gap-2 p-1.5"
                >
                  <Avatar
                    avatarUrl={person.avatarUrl}
                    fullName={person.fullName}
                    size="xs"
                  />
                  <div
                    className="flex-1 min-w-0"
                  >
                    <p
                      className="text-xs font-medium truncate"
                    >
                      {person.fullName || 'Anonymous'}
                    </p>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </Popover>
  );
}
