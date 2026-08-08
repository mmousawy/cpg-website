'use client';

import SearchInput from '@/components/search/SearchInput';
import SearchResultItem from '@/components/search/SearchResultItem';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useFollowList } from '@/hooks/useFollowList';
import type { FollowListType } from '@/types/follows';
import type { SearchResult } from '@/types/search';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import CloseSVG from 'public/icons/close.svg';

type FollowListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  type: FollowListType;
};

function memberToSearchResult(member: {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
}): SearchResult {
  const displayName = member.full_name || (member.nickname ? `@${member.nickname}` : 'Member');
  return {
    entity_type: 'members',
    entity_id: member.id,
    title: displayName,
    subtitle: member.nickname ? `@${member.nickname}` : '',
    image_url: member.avatar_url,
    image_blurhash: null,
    url: member.nickname ? `/@${encodeURIComponent(member.nickname)}` : null,
    rank: 0,
  };
}

export default function FollowListModal({
  isOpen,
  onClose,
  profileId,
  type,
}: FollowListModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);

  const {
    query,
    setQuery,
    members,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    reset,
  } = useFollowList({
    profileId,
    type,
    enabled: isOpen,
  });

  const title = type === 'followers' ? 'Followers' : 'Following';
  const emptyMessage = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';
  const results = useMemo(() => members.map(memberToSearchResult), [members]);
  const isSearching = query.trim().length >= 2;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      modalRef.current?.close();
      const trapTimerId = setTimeout(() => setIsTrapped(false), 0);
      return () => clearTimeout(trapTimerId);
    }

    modalRef.current?.show();
    const trapTimerId = setTimeout(() => setIsTrapped(true), 16);
    return () => clearTimeout(trapTimerId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadMore, members.length]);

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        'fixed inset-0 z-50 overflow-auto',
        'flex size-full max-h-none max-w-none p-4 max-sm:p-2',
        'bg-black/40 backdrop-blur-sm',
        'transition-[visibility,opacity] duration-300',
      ])}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          onDeactivate: handleClose,
          fallbackFocus: () => modalRef.current || document.body,
        }}
      >
        <div
          className={clsx([
            isOpen ? 'scale-100' : 'scale-95',
            'w-full max-w-xl',
            'relative m-auto',
            'max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]',
            'flex flex-col',
            'rounded-2xl border border-border-color bg-background-light shadow-xl shadow-black/25',
            'transition-transform duration-300',
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="shrink-0 border-b border-border-color p-4"
          >
            <div
              className="mb-3 flex items-center justify-between gap-4"
            >
              <h2
                className="text-lg font-semibold font-heading"
              >
                {title}
              </h2>
              <button
                className="shrink-0 rounded-full border border-border-color-strong p-1 hover:bg-background transition-colors"
                onClick={handleClose}
                aria-label={`Close ${title.toLowerCase()} list`}
              >
                <CloseSVG
                  className="size-5 fill-foreground"
                />
              </button>
            </div>
            <SearchInput
              value={query}
              onChange={setQuery}
              autoFocus={isOpen}
              placeholder="Search members..."
            />
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 bg-black/10"
          >
            {isLoading ? (
              <div
                className="flex min-h-22.5 items-center justify-center"
              >
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div
                className="flex min-h-22.5 items-center justify-center text-center text-sm text-foreground/60"
              >
                {error}
              </div>
            ) : results.length === 0 ? (
              <div
                className="flex min-h-22.5 items-center justify-center text-center text-foreground/60"
              >
                {isSearching ? 'No members found' : emptyMessage}
              </div>
            ) : (
              <div
                className="flex flex-col gap-2"
              >
                {results.map((result) => (
                  <SearchResultItem
                    key={result.entity_id}
                    result={result}
                    onSelect={handleClose}
                  />
                ))}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex justify-center py-4"
                  >
                    {isLoadingMore && <LoadingSpinner />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </FocusTrap>
    </dialog>
  );
}
