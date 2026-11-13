'use client';

import MemberHoverCard from '@/components/shared/MemberHoverCard';
import MentionSuggestionList from '@/components/shared/MentionSuggestionList';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import { useSession } from '@/hooks/useSession';
import { parseMentionNicknames } from '@/lib/mentions/parseMentions';
import type { MentionProfile } from '@/lib/mentions/types';
import { nicknameSchema } from '@/utils/nickname';
import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MENTION_CLASS = 'rounded-sm bg-primary/15 px-0.5 font-medium text-primary';
const MENTION_DROPDOWN_WIDTH_PX = 224; // matches w-56

type MentionFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
};

type DropdownPosition = { top: number; left: number; width: number };

function serializeEditor(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? '').replace(/\u00a0/g, ' ');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.mention) {
      out += `@${node.dataset.mention}`;
      return;
    }
    if (node.tagName === 'BR') {
      out += '\n';
      return;
    }
    const block = node.tagName === 'DIV' || node.tagName === 'P';
    if (block && node !== root && out.length > 0 && !out.endsWith('\n')) out += '\n';
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out;
}

function getCaretOffset(root: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.endContainer)) return serializeEditor(root).length;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().replace(/\u00a0/g, ' ').length;
}

function setCaretOffset(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  while (node) {
    const length = (node.textContent ?? '').replace(/\u00a0/g, ' ').length;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, remaining));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function paintEditor(
  root: HTMLElement,
  value: string,
  linkable: Map<string, MentionProfile>,
  selfId?: string | null,
) {
  root.replaceChildren();
  if (!value) return;
  const nicknames = new Set(parseMentionNicknames(value));
  const pattern = /@([a-z0-9-]{3,30})/gi;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    const nickname = match[1].toLowerCase();
    const profile = linkable.get(nickname);
    const tokenIsMention = nicknames.has(nickname)
      && profile
      && (profile.allow_member_tags || profile.id === selfId)
      && nicknameSchema.safeParse(nickname).success;
    if (!tokenIsMention) continue;
    if (index > cursor) root.append(document.createTextNode(value.slice(cursor, index)));
    const span = document.createElement('span');
    span.dataset.mention = nickname;
    span.contentEditable = 'false';
    span.className = MENTION_CLASS;
    span.textContent = `@${nickname}`;
    root.append(span);
    cursor = index + match[0].length;
  }
  if (cursor < value.length) root.append(document.createTextNode(value.slice(cursor)));
}

function activeMentionQuery(value: string, caret: number): { query: string; start: number } | null {
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s([{"'])@([a-z0-9-]{0,30})$/i);
  if (!match) return null;
  return { query: match[2].toLowerCase(), start: before.length - match[2].length - 1 };
}

/** True when the caret is on or directly after a committed mention chip (not while typing @…). */
function caretOnCommittedMention(root: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const { endContainer, endOffset, collapsed } = selection.getRangeAt(0);
  const onMention = (node: Node | null) => {
    if (!node) return false;
    if (node instanceof HTMLElement && node.dataset.mention) return true;
    return node instanceof Element && Boolean(node.closest?.('[data-mention]'));
  };

  if (onMention(endContainer)) return true;
  if (endContainer.nodeType === Node.TEXT_NODE && onMention(endContainer.parentElement)) return true;

  if (collapsed && endContainer === root) {
    const prev = root.childNodes[endOffset - 1];
    if (prev instanceof HTMLElement && prev.dataset.mention) return true;
  }

  if (collapsed && endContainer.nodeType === Node.TEXT_NODE && endOffset === 0) {
    const prev = endContainer.previousSibling;
    if (prev instanceof HTMLElement && prev.dataset.mention) return true;
  }

  return false;
}

export default function MentionField({
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  rows = 2,
  id,
  className,
  autoFocus = false,
  onFocus,
}: MentionFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hoverProxyRef = useRef<HTMLSpanElement>(null);
  const [hoverMention, setHoverMention] = useState<{ profile: MentionProfile; rect: DOMRect } | null>(null);
  const focusedRef = useRef(false);
  const appliedRef = useRef({ value: '', linkKey: '' });
  const [linkable, setLinkable] = useState<Map<string, MentionProfile>>(new Map());
  const [query, setQuery] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const { user } = useSession();
  const { results, loading } = useMentionSearch(query && query.length > 0 ? query : null);
  const locked = disabled || readOnly;

  const linkKey = [...linkable.keys()].sort().join(',');

  const refreshQuery = useCallback(() => {
    const root = editorRef.current;
    if (!root || !focusedRef.current) {
      setQuery(null);
      return;
    }
    if (caretOnCommittedMention(root)) {
      setQuery(null);
      return;
    }
    const text = serializeEditor(root);
    const found = activeMentionQuery(text, getCaretOffset(root));
    setQuery(found && found.query.length > 0 ? found.query : null);
    const selection = window.getSelection();
    const rect = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0).getBoundingClientRect()
      : root.getBoundingClientRect();
    setDropdownPosition({
      top: (rect.bottom || root.getBoundingClientRect().bottom) + 4,
      left: rect.left || root.getBoundingClientRect().left,
      width: MENTION_DROPDOWN_WIDTH_PX,
    });
  }, []);

  const checkedNicknamesRef = useRef(new Set<string>());

  useEffect(() => {
    const nicknames = parseMentionNicknames(value).filter((nickname) => !checkedNicknamesRef.current.has(nickname));
    if (nicknames.length === 0) return;
    nicknames.forEach((nickname) => checkedNicknamesRef.current.add(nickname));
    let cancelled = false;
    fetch(`/api/members/mention-directory?nicknames=${encodeURIComponent(nicknames.join(','))}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setLinkable((current) => {
          const next = new Map(current);
          for (const profile of (data.profiles ?? []) as MentionProfile[]) {
            next.set(profile.nickname, profile);
          }
          return next;
        });
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [value]);

  useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const domValue = serializeEditor(root);
    if (focusedRef.current && domValue === value && appliedRef.current.linkKey === linkKey) {
      return;
    }
    const caret = focusedRef.current ? getCaretOffset(root) : null;
    paintEditor(root, value, linkable, user?.id);
    if (caret != null) setCaretOffset(root, caret);
    appliedRef.current = { value, linkKey };
  }, [value, linkable, linkKey, user?.id]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const proxy = hoverProxyRef.current;
    if (!proxy || !hoverMention) return;
    proxy.style.left = `${hoverMention.rect.left}px`;
    proxy.style.top = `${hoverMention.rect.top}px`;
    proxy.style.width = `${hoverMention.rect.width}px`;
    proxy.style.height = `${hoverMention.rect.height}px`;
    proxy.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, buttons: 0 }));
  }, [hoverMention]);

  const commitProfile = (profile: MentionProfile) => {
    const root = editorRef.current;
    if (!root) return;
    const text = serializeEditor(root);
    const caret = getCaretOffset(root);
    const found = activeMentionQuery(text, caret);
    if (!found) return;
    const next = `${text.slice(0, found.start)}@${profile.nickname} ${text.slice(caret)}`;
    const nextCaret = found.start + profile.nickname.length + 2;
    setLinkable((current) => {
      const map = new Map(current);
      map.set(profile.nickname, profile);
      return map;
    });
    paintEditor(root, next, new Map(linkable).set(profile.nickname, profile), user?.id);
    setCaretOffset(root, nextCaret);
    appliedRef.current = { value: next, linkKey: [...linkable.keys(), profile.nickname].sort().join(',') };
    onChange(next);
    setQuery(null);
    setHighlightedIndex(0);
  };

  const minHeight = `${rows * 1.25 + 1}rem`;

  return (
    <div
      className="relative"
    >
      {value === '' && placeholder ? (
        <span
          className="pointer-events-none absolute left-3 top-2 text-sm text-foreground/40"
        >
          {placeholder}
        </span>
      ) : null}
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-autocomplete="list"
        contentEditable={!locked}
        suppressContentEditableWarning
        className={clsx(
          'whitespace-pre-wrap rounded border border-border-color bg-background-medium px-3 py-2 text-sm',
          'focus-visible:border-primary focus-visible:outline-none',
          locked && 'cursor-not-allowed bg-background/50 text-foreground/50',
          className,
        )}
        style={{ minHeight }}
        onFocus={() => {
          focusedRef.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          focusedRef.current = false;
          setQuery(null);
        }}
        onInput={() => {
          const root = editorRef.current;
          if (!root) return;
          const next = serializeEditor(root);
          appliedRef.current = { value: next, linkKey };
          onChange(next);
          refreshQuery();
          const found = activeMentionQuery(next, getCaretOffset(root));
          if (found && nicknameSchema.safeParse(found.query).success) {
            const exact = results.find((profile) => profile.nickname === found.query);
            if (exact && next.slice(found.start + found.query.length + 1, found.start + found.query.length + 2) === ' ') {
              // Space-commit is handled in keydown so the dropdown selection stays explicit.
            }
          }
        }}
        onKeyDown={(event) => {
          if (query && results.length > 0 && event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((index) => (index + 1) % results.length);
            return;
          }
          if (query && results.length > 0 && event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index) => (index - 1 + results.length) % results.length);
            return;
          }
          if (query && event.key === 'Escape') {
            event.preventDefault();
            setQuery(null);
            return;
          }
          if (query && results.length > 0 && event.key === 'Enter') {
            event.preventDefault();
            const profile = results[highlightedIndex] ?? results[0];
            if (profile) commitProfile(profile);
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            document.execCommand('insertText', false, '\n');
            return;
          }
          if (event.key === ' ' && query && nicknameSchema.safeParse(query).success) {
            const exact = results.filter((profile) => profile.nickname === query);
            if (exact.length === 1) {
              event.preventDefault();
              commitProfile(exact[0]);
            }
          }
        }}
        onMouseDown={(event) => {
          const mention = event.target instanceof Element
            ? event.target.closest('[data-mention]')
            : null;
          if (!(mention instanceof HTMLElement)) return;
          event.preventDefault();
          setQuery(null);
        }}
        onMouseUp={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-mention]')) {
            setQuery(null);
            return;
          }
          refreshQuery();
        }}
        onKeyUp={refreshQuery}
        onMouseOver={(event) => {
          const target = event.target instanceof Element
            ? event.target.closest('[data-mention]')
            : null;
          if (!(target instanceof HTMLElement) || !target.dataset.mention) return;
          const profile = linkable.get(target.dataset.mention);
          if (!profile) return;
          const rect = target.getBoundingClientRect();
          const proxy = hoverProxyRef.current;
          if (proxy && hoverMention?.profile.nickname === profile.nickname) {
            proxy.style.left = `${rect.left}px`;
            proxy.style.top = `${rect.top}px`;
            proxy.style.width = `${rect.width}px`;
            proxy.style.height = `${rect.height}px`;
            proxy.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, buttons: 0 }));
            return;
          }
          setHoverMention({ profile, rect });
        }}
        onMouseOut={(event) => {
          const target = event.target instanceof Element
            ? event.target.closest('[data-mention]')
            : null;
          if (!(target instanceof HTMLElement)) return;
          const next = event.relatedTarget;
          if (next instanceof Node && target.contains(next)) return;
          hoverProxyRef.current?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
        }}
      />
      {hoverMention ? (
        <MemberHoverCard
          nickname={hoverMention.profile.nickname}
          fullName={hoverMention.profile.full_name}
          avatarUrl={hoverMention.profile.avatar_url}
        >
          <span
            ref={hoverProxyRef}
            aria-hidden
            className="pointer-events-none fixed"
            style={{
              left: hoverMention.rect.left,
              top: hoverMention.rect.top,
              width: hoverMention.rect.width,
              height: hoverMention.rect.height,
            }}
          />
        </MemberHoverCard>
      ) : null}
      <MentionSuggestionList
        results={results}
        loading={loading}
        highlightedIndex={highlightedIndex}
        position={query ? position : null}
        onHighlight={setHighlightedIndex}
        onSelect={commitProfile}
      />
    </div>
  );
}
