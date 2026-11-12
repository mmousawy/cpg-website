'use client';

import MemberHoverCard from '@/components/shared/MemberHoverCard';
import { parseMentionNicknames } from '@/lib/mentions/parseMentions';
import type { MentionProfile } from '@/lib/mentions/types';
import Link from 'next/link';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const URL_REGEX = /https?:\/\/[^\s<]+/g;
const MENTION_PATTERN = /@([a-z0-9-]{3,30})/gi;

const MentionDirectoryContext = createContext<Map<string, MentionProfile> | null>(null);

export function MentionDirectoryProvider({
  profiles,
  children,
}: {
  profiles: Map<string, MentionProfile>;
  children: ReactNode;
}) {
  return (
    <MentionDirectoryContext.Provider
      value={profiles}
    >
      {children}
    </MentionDirectoryContext.Provider>
  );
}

export function useMentionDirectory(texts: string[]) {
  const nicknames = useMemo(() => {
    const found = new Set<string>();
    for (const text of texts) {
      for (const nickname of parseMentionNicknames(text)) found.add(nickname);
    }
    return [...found].sort();
  }, [texts]);
  const key = nicknames.join(',');
  const [profiles, setProfiles] = useState<Map<string, MentionProfile>>(new Map());

  useEffect(() => {
    if (!key) {
      setProfiles(new Map());
      return;
    }
    let cancelled = false;
    fetch(`/api/members/mention-directory?nicknames=${encodeURIComponent(key)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || cancelled) return;
        const next = new Map<string, MentionProfile>();
        for (const profile of (data.profiles ?? []) as MentionProfile[]) {
          next.set(profile.nickname, profile);
        }
        setProfiles(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  return profiles;
}

function MentionLink({ profile }: { profile: MentionProfile }) {
  return (
    <MemberHoverCard
      nickname={profile.nickname}
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url}
    >
      <Link
        href={`/@${profile.nickname}`}
        className="font-medium text-primary hover:underline"
      >
        @{profile.nickname}
      </Link>
    </MemberHoverCard>
  );
}

export default function MentionText({
  text,
  authorId,
}: {
  text: string;
  authorId?: string | null;
}) {
  const directory = useContext(MentionDirectoryContext);
  const [localProfiles, setLocalProfiles] = useState<Map<string, MentionProfile> | null>(null);
  const profiles = directory ?? localProfiles ?? new Map<string, MentionProfile>();

  useEffect(() => {
    if (directory) return;
    const nicknames = parseMentionNicknames(text);
    if (nicknames.length === 0) return;
    let cancelled = false;
    fetch(`/api/members/mention-directory?nicknames=${encodeURIComponent(nicknames.join(','))}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || cancelled) return;
        const next = new Map<string, MentionProfile>();
        for (const profile of (data.profiles ?? []) as MentionProfile[]) {
          next.set(profile.nickname, profile);
        }
        setLocalProfiles(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [directory, text]);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  const source = text;
  const combined = new RegExp(`${URL_REGEX.source}|${MENTION_PATTERN.source}`, 'gi');
  for (const match of source.matchAll(combined)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(source.slice(cursor, index));
    const token = match[0];
    if (token.startsWith('http')) {
      nodes.push(
        <a
          key={`${index}-url`}
          href={token}
          target="_blank"
          rel="nofollow noreferrer noopener"
          className="text-accent underline break-all"
        >
          {token}
        </a>,
      );
    } else {
      const nickname = token.slice(1).toLowerCase();
      const profile = profiles.get(nickname);
      const linked = profile && (profile.allow_member_tags || profile.id === authorId);
      nodes.push(linked
        ? <MentionLink
            key={`${index}-${nickname}`}
            profile={profile}
        />
        : token);
    }
    cursor = index + token.length;
  }
  if (cursor < source.length) nodes.push(source.slice(cursor));
  return <>{nodes}</>;
}
