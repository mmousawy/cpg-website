'use client';

import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import Input from '@/components/shared/Input';
import type { SearchResult } from '@/types/search';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

type InviteMembersModalProps = {
  albumId: string;
  existingMemberIds: string[];
  pendingUserIds: string[];
  onInvite: (userIds: string[]) => Promise<{ created: number; skipped_existing_member: number; skipped_pending: number }>;
  onClose: () => void;
};

export default function InviteMembersModal({
  albumId,
  existingMemberIds,
  pendingUserIds,
  onInvite,
  onClose,
}: InviteMembersModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMembers = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&types=members&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchMembers]);

  const memberResults = results.filter((r) => r.entity_type === 'members');
  const excludeIds = new Set([...existingMemberIds, ...pendingUserIds]);
  const inviteableResults = memberResults.filter((r) => !excludeIds.has(r.entity_id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onInvite(Array.from(selectedIds));
      if (result.created > 0) {
        onClose();
      } else if (result.skipped_existing_member > 0 || result.skipped_pending > 0) {
        setError('All selected users are already members or have a pending invite.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4"
    >
      <p
        className="text-sm text-foreground/70"
      >
        Search for members to invite to this album. Only closed albums require invites.
      </p>

      <Input
        type="search"
        placeholder="Search by name or nickname..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {error && (
        <div
          className="rounded-md bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      <div
        className="max-h-64 overflow-y-auto rounded-lg border border-border-color bg-background-light"
      >
        {isSearching ? (
          <div
            className="p-4 text-center text-sm text-foreground/70"
          >
            Searching...
          </div>
        ) : query.trim().length < 2 ? (
          <div
            className="p-4 text-center text-sm text-foreground/70"
          >
            Type at least 2 characters to search
          </div>
        ) : inviteableResults.length === 0 ? (
          <div
            className="p-4 text-center text-sm text-foreground/70"
          >
            {memberResults.length === 0 ? 'No members found' : 'All results are already members or have pending invites'}
          </div>
        ) : (
          <ul
            className="divide-y divide-border-color"
          >
            {inviteableResults.map((r) => (
              <li
                key={r.entity_id}
                className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-background/50"
                onClick={() => toggleSelect(r.entity_id)}
              >
                <Checkbox
                  checked={selectedIds.has(r.entity_id)}
                  onChange={() => toggleSelect(r.entity_id)}
                />
                {r.image_url ? (
                  <Image
                    src={r.image_url}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-medium text-primary"
                  >
                    {r.title?.slice(0, 2).toUpperCase() ?? '?'}
                  </div>
                )}
                <div
                  className="min-w-0 flex-1"
                >
                  <span
                    className="font-medium block truncate"
                  >
                    {r.title}
                  </span>
                  {r.subtitle && (
                    <span
                      className="text-xs text-foreground/60 truncate block"
                    >
                      {r.subtitle}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="flex justify-end gap-2"
      >
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={selectedIds.size === 0 || isSubmitting}
          loading={isSubmitting}
        >
          Invite (
          {selectedIds.size}
          )
        </Button>
      </div>
    </div>
  );
}
