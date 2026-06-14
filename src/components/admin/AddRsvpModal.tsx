'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface MemberResult {
  id: string;
  full_name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AddRsvpModalProps {
  eventId: number;
  onAdded: () => void;
  onClose: () => void;
}

export default function AddRsvpModal({ eventId, onAdded, onClose }: AddRsvpModalProps) {
  const modalContext = useContext(ModalContext);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCloseRef = useRef(onClose);
  const onAddedRef = useRef(onAdded);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onAddedRef.current = onAdded; }, [onAdded]);

  // Debounced member search
  useEffect(() => {
    if (selectedMember) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setMembers([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const res = await fetch(
          `/api/admin/search-members?q=${encodeURIComponent(query)}&event_id=${eventId}`,
        );
        const data = await res.json() as { members: MemberResult[] };

        setMembers(data.members ?? []);
      } catch {
        setMembers([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, eventId, selectedMember]);

  const suggestions = useMemo(
    () => members.map((m) => m.id),
    [members],
  );

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const handleSelect = useCallback((id: string) => {
    const member = memberById[id];

    if (member) {
      setSelectedMember(member);
      setQuery(`${member.full_name ?? ''} (@${member.nickname ?? member.email ?? ''})`);
      setMembers([]);
    }
  }, [memberById]);

  const handleClear = () => {
    setSelectedMember(null);
    setQuery('');
    setMembers([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    setError(null);

    const res = await fetch('/api/admin/manage-rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, user_id: selectedMember.id }),
    });

    if (res.ok) {
      onAddedRef.current();
      onCloseRef.current();
    } else {
      const data = await res.json() as { message?: string };
      setError(data.message ?? 'Failed to add RSVP');
    }

    setIsSubmitting(false);
  };

  // Sync modal footer buttons
  const footerContent = useMemo(
    () => (
      <div
        className="flex items-center justify-end gap-2"
      >
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedMember || isSubmitting}
        >
          {isSubmitting ? 'Adding…' : 'Add to RSVP list'}
        </Button>
      </div>
    ),
    [selectedMember, isSubmitting],
  );

  useEffect(() => {
    if (!modalContext) return;

    modalContext.setFooter(footerContent);

    return () => {
      if (modalContext) {
        modalContext.setFooter(null);
      }
    };
  }, [modalContext, footerContent]);

  return (
    <div>
      <div>
        <label
          htmlFor="member-search"
          className="mb-1.5 block text-sm font-medium"
        >
          Search for member
        </label>
        <div
          className="flex gap-2 w-full"
        >
          <AutocompleteInput
            id="member-search"
            value={query}
            onChange={(v) => {
              setQuery(v);
              if (selectedMember) setSelectedMember(null);
            }}
            suggestions={suggestions}
            disableFilter
            inlineSuggestions
            fullWidth
            containerClassName="flex-1"
            placeholder="Search by name, nickname, or email…"
            disabled={isSubmitting}
            renderSuggestion={(id, highlighted) => {
              const m = memberById[id];

              if (!m) return id;

              return (
                <span
                  className={`flex flex-col ${highlighted ? '' : ''}`}
                >
                  <span
                    className="font-medium"
                  >
                    {m.full_name ?? m.email ?? 'Unknown'}
                  </span>
                  <span
                    className="text-xs text-foreground/60"
                  >
                    {m.nickname ? `@${m.nickname}` : ''}
                    {m.nickname && m.email ? ' · ' : ''}
                    {m.email}
                  </span>
                </span>
              );
            }}
            onSelect={handleSelect}
          />
          {selectedMember && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>

        {isSearching && (
          <p
            className="mt-1.5 text-xs text-foreground/50"
          >Searching...</p>
        )}

        {!isSearching && query.trim() && !selectedMember && members.length === 0 && (
          <p
            className="mt-1.5 text-xs text-foreground/50"
          >No matching members found</p>
        )}
      </div>

      {selectedMember && (
        <div
          className="rounded-lg border border-border-color bg-background p-3 mt-4"
        >
          <p
            className="text-sm font-medium"
          >{selectedMember.full_name ?? selectedMember.email}</p>
          {selectedMember.nickname && (
            <p
              className="text-xs text-foreground/60"
            >@{selectedMember.nickname}</p>
          )}
          {selectedMember.email && (
            <p
              className="text-xs text-foreground/60"
            >{selectedMember.email}</p>
          )}
        </div>
      )}

      {error && (
        <div
          className="mt-4"
        >
          <ErrorMessage
            variant="compact"
          >{error}</ErrorMessage>
        </div>
      )}
    </div>
  );
}
