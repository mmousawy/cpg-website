'use client';

import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import type { SharedAlbumMember } from '@/types/albums';
import Link from 'next/link';

import PlusSVG from 'public/icons/plus.svg';
import CloseMiniSVG from 'public/icons/close-mini.svg';

type SharedAlbumMemberListProps = {
  members: SharedAlbumMember[];
  albumOwnerId: string;
  currentUserId: string | undefined;
  isOwner: boolean;
  onInviteClick: () => void;
  onRemoveMember?: (userId: string) => void;
  isRemoving?: boolean;
};

function getDisplayName(member: SharedAlbumMember): string {
  const profile = member.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.nickname) return `@${profile.nickname}`;
  return 'Unknown';
}

function getProfileUrl(member: SharedAlbumMember): string | null {
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
            className="p-4 text-center text-sm text-foreground/70"
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
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <Avatar
                    avatarUrl={member.profiles?.avatar_url}
                    fullName={member.profiles?.full_name}
                    nickname={member.profiles?.nickname}
                    size="sm"
                  />
                  <div
                    className="min-w-0 flex-1"
                  >
                    {profileUrl ? (
                      <Link
                        href={profileUrl}
                        className="font-medium text-foreground hover:text-primary truncate block"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span
                        className="font-medium truncate block"
                      >
                        {displayName}
                      </span>
                    )}
                    <span
                      className="text-xs text-foreground/60"
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
                      className="shrink-0 rounded p-1 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                      title={`Remove ${displayName}`}
                    >
                      <CloseMiniSVG
                        className="size-4"
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
