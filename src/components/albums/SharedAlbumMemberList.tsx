'use client';

import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import MemberHoverCard from '@/components/shared/MemberHoverCard';
import type { SharedAlbumMemberProfile } from '@/types/albums';
import Link from 'next/link';

import CloseMiniSVG from 'public/icons/close-mini.svg';
import PlusSVG from 'public/icons/plus.svg';

export type AlbumMemberListItem = {
  user_id: string;
  role: 'owner' | 'member';
  profiles?: SharedAlbumMemberProfile | null;
};

type SharedAlbumMemberListProps = {
  members: AlbumMemberListItem[];
  albumOwnerId: string;
  currentUserId: string | undefined;
  isOwner: boolean;
  onInviteClick: () => void;
  onRemoveMember?: (userId: string) => void;
  isRemoving?: boolean;
};

/** Unique photo owners, used as members when the album is not invite-only. */
export function membersFromPhotoContributors(
  photos: Array<{
    user_id: string | null;
    owner_profile?: SharedAlbumMemberProfile | null;
  }>,
  albumOwnerId?: string | null,
): AlbumMemberListItem[] {
  const seen = new Set<string>();
  const members: AlbumMemberListItem[] = [];
  for (const photo of photos) {
    const userId = photo.user_id;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    members.push({
      user_id: userId,
      role: albumOwnerId && userId === albumOwnerId ? 'owner' : 'member',
      profiles: photo.owner_profile ?? null,
    });
  }
  return members;
}

function getDisplayName(member: AlbumMemberListItem): string {
  const profile = member.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.nickname) return `@${profile.nickname}`;
  return 'Unknown';
}

function getProfileUrl(member: AlbumMemberListItem): string | null {
  const profile = member.profiles;
  if (profile?.nickname) return `/@${profile.nickname}`;
  return null;
}

export default function SharedAlbumMemberList({
  members,
  albumOwnerId,
  currentUserId,
  isOwner,
  onInviteClick,
  onRemoveMember,
  isRemoving,
}: SharedAlbumMemberListProps) {
  return (
    <div
      className="space-y-3"
    >
      <div
        className="flex items-center justify-between"
      >
        <h3
          className="text-sm font-semibold"
        >
          Members (
          {members.length}
          )
        </h3>
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onInviteClick}
            icon={<PlusSVG
              className="size-4"
            />}
          >
            Invite members
          </Button>
        )}
      </div>

      <div
        className="rounded-lg border border-border-color bg-background-light max-h-64 overflow-y-auto"
      >
        {members.length === 0 ? (
          <div
            className="p-4 text-center text-sm text-foreground/80"
          >
            No members yet
          </div>
        ) : (
          <ul
            className="divide-y divide-border-color"
          >
            {members.map((member) => {
              const displayName = getDisplayName(member);
              const profileUrl = getProfileUrl(member);
              const isOwnerMember = member.role === 'owner';
              const isCurrentUser = currentUserId === member.user_id;
              const canRemove = isOwner && !isOwnerMember && onRemoveMember;

              return (
                <li
                  key={member.user_id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Avatar
                    avatarUrl={member.profiles?.avatar_url}
                    fullName={member.profiles?.full_name}
                    nickname={member.profiles?.nickname}
                    size="sm"
                  />
                  <div
                    className="min-w-0 flex-1 flex flex-col"
                  >
                    {profileUrl && member.profiles?.nickname ? (
                      <MemberHoverCard
                        nickname={member.profiles.nickname}
                        fullName={member.profiles.full_name}
                        avatarUrl={member.profiles.avatar_url}
                      >
                        <Link
                          href={profileUrl}
                          className="font-medium text-foreground hover:text-primary truncate block"
                        >
                          {displayName}
                        </Link>
                      </MemberHoverCard>
                    ) : (
                      <span
                        className="font-medium truncate block"
                      >
                        {displayName}
                      </span>
                    )}
                    <span
                      className="text-xs text-foreground/80"
                    >
                      {isOwnerMember ? 'Owner' : 'Member'}
                      {isCurrentUser && ' (you)'}
                    </span>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => onRemoveMember(member.user_id)}
                      disabled={isRemoving}
                      className="shrink-0 rounded p-1 text-foreground/80 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                      title={`Remove ${displayName}`}
                    >
                      <CloseMiniSVG
                        className="size-5"
                      />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
