'use client';

import MemberHoverCard from '@/components/shared/MemberHoverCard';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import type { MentionProfile } from '@/lib/mentions/types';
import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export type PhotoMemberTag = {
  id: string;
  profileId: string;
  nickname: string;
  fullName: string | null;
  avatarUrl: string | null;
  x: number;
  y: number;
};

const TAGS_EVENT = 'cpg-photo-member-tags';

export function notifyPhotoMemberTags(photoId: string) {
  window.dispatchEvent(new CustomEvent(TAGS_EVENT, { detail: photoId }));
}

function usePhotoMemberTags(photoId: string | undefined) {
  const [tags, setTags] = useState<PhotoMemberTag[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!photoId) return;
    const response = await fetch(`/api/photos/${photoId}/member-tags`);
    if (!response.ok) return;
    const data = await response.json();
    setTags(data.tags ?? []);
    setCanEdit(Boolean(data.canEdit));
    setViewerId(data.viewerId ?? null);
  }, [photoId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === photoId) void load();
    };
    window.addEventListener(TAGS_EVENT, onChange);
    return () => window.removeEventListener(TAGS_EVENT, onChange);
  }, [load, photoId]);

  return { tags, canEdit, viewerId, reload: load };
}

function TagDot({ tag }: { tag: PhotoMemberTag }) {
  return (
    <span
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%`, pointerEvents: 'auto' }}
    >
      <MemberHoverCard
        nickname={tag.nickname}
        fullName={tag.fullName}
        avatarUrl={tag.avatarUrl}
      >
        <button
          type="button"
          aria-label={`Tagged ${tag.nickname}`}
          className="size-4 rounded-full border-2 border-white bg-primary shadow"
          onClick={(event) => event.stopPropagation()}
        />
      </MemberHoverCard>
    </span>
  );
}

export function PhotoMemberTagLayer({ photoId }: { photoId: string }) {
  const { tags, canEdit } = usePhotoMemberTags(photoId);
  const [tagMode, setTagMode] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { results, loading } = useMentionSearch(point && query ? query : null);

  useEffect(() => {
    if (!tagMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTagMode(false);
        setPoint(null);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tagMode]);

  const placeTag = async (profile: MentionProfile) => {
    if (!point) return;
    setError(null);
    const response = await fetch(`/api/photos/${photoId}/member-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id, x: point.x, y: point.y }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setPoint(null);
      setQuery('');
      setError(data.message || 'Could not tag that member');
      return;
    }
    setPoint(null);
    setQuery('');
    setTagMode(false);
    notifyPhotoMemberTags(photoId);
  };

  return (
    <>
      <div
        className={clsx('absolute inset-0', tagMode && 'cursor-crosshair')}
        style={{ pointerEvents: tagMode ? 'auto' : 'none' }}
        onClick={(event) => {
          if (!tagMode) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
          setPoint({ x, y });
          setQuery('');
          setHighlightedIndex(0);
        }}
      >
        {tags.map((tag) => <TagDot
          key={tag.id}
          tag={tag}
        />)}
        {point ? (
          <span
            className="absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, pointerEvents: 'none' }}
          />
        ) : null}
      </div>
      {canEdit ? (
        <button
          type="button"
          className="absolute right-2 top-2 z-20 rounded bg-black/60 px-2 py-1 text-xs text-white"
          style={{ pointerEvents: 'auto' }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setTagMode((current) => !current);
            setPoint(null);
            setError(null);
          }}
        >
          {tagMode ? 'Done tagging' : 'Tag people'}
        </button>
      ) : null}
      {error && !point ? (
        <p
          className="absolute left-2 top-2 z-20 max-w-xs rounded bg-black/70 px-2 py-1 text-xs text-white"
          style={{ pointerEvents: 'none' }}
        >
          {error}
        </p>
      ) : null}
      {tagMode && !point ? (
        <p
          className="absolute bottom-2 left-2 z-20 rounded bg-black/60 px-2 py-1 text-xs text-white"
          style={{ pointerEvents: 'none' }}
        >
          Click the photo to place a tag. Escape cancels.
        </p>
      ) : null}
      {point ? (
        <div
          className="absolute z-30 w-56 rounded-md border border-border-color bg-background p-2 shadow-lg"
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            pointerEvents: 'auto',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value.replace(/^@/, ''));
              setHighlightedIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && results.length > 0) {
                event.preventDefault();
                setHighlightedIndex((index) => (index + 1) % results.length);
              } else if (event.key === 'ArrowUp' && results.length > 0) {
                event.preventDefault();
                setHighlightedIndex((index) => (index - 1 + results.length) % results.length);
              } else if (event.key === 'Enter' && results[highlightedIndex]) {
                event.preventDefault();
                void placeTag(results[highlightedIndex]);
              } else if (event.key === 'Escape') {
                setPoint(null);
              }
            }}
            placeholder="Nickname"
            className="w-full rounded border border-border-color bg-background-medium px-2 py-1 text-sm"
          />
          {error ? <p
            className="mt-1 text-xs text-red-500"
          >{error}</p> : null}
          <div
            className="mt-1 max-h-48 overflow-y-auto"
          >
            {loading ? <p
              className="px-1 py-1 text-xs text-foreground/60"
            >Searching…</p> : null}
            {results.map((profile, index) => (
              <button
                key={profile.id}
                type="button"
                className={clsx(
                  'block w-full truncate rounded px-1 py-1 text-left text-sm',
                  index === highlightedIndex ? 'bg-background-medium' : 'hover:bg-background-medium',
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  void placeTag(profile);
                }}
              >
                {profile.full_name || profile.nickname}
                <span
                  className="ml-1 text-xs text-foreground/70"
                >@{profile.nickname}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function PhotoMemberTagList({ photoId }: { photoId: string }) {
  const { tags, canEdit, viewerId } = usePhotoMemberTags(photoId);
  if (tags.length === 0) return null;

  const removeTag = async (profileId: string) => {
    const response = await fetch(`/api/photos/${photoId}/member-tags?profileId=${profileId}`, {
      method: 'DELETE',
    });
    if (response.ok) notifyPhotoMemberTags(photoId);
  };

  return (
    <div
      className="mb-4"
    >
      <p
        className="mb-1.5 text-xs font-medium text-foreground/80"
      >People</p>
      <ul
        className="space-y-1"
      >
        {tags.map((tag) => {
          const canRemove = canEdit || tag.profileId === viewerId;
          return (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <MemberHoverCard
                nickname={tag.nickname}
                fullName={tag.fullName}
                avatarUrl={tag.avatarUrl}
              >
                <Link
                  href={`/@${tag.nickname}`}
                  className="hover:text-primary"
                >
                  @{tag.nickname}
                </Link>
              </MemberHoverCard>
              {canRemove ? (
                <button
                  type="button"
                  className="text-xs text-foreground/60 hover:text-foreground"
                  onClick={() => { void removeTag(tag.profileId); }}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
