'use client';

import Link from 'next/link';
import Avatar from '@/components/auth/Avatar';
import ColorSwatch from './ColorSwatch';
import { getColorLabel } from '@/lib/colorDraw';

export type ColorDrawParticipant = {
  id: string;
  challenge_id: string;
  user_id: string | null;
  guest_nickname: string | null;
  color: string;
  swapped_at: string | null;
  created_at: string;
  profiles: {
    avatar_url: string | null;
    full_name: string | null;
    nickname: string | null;
  } | null;
};

type ParticipantsListProps = {
  draws: ColorDrawParticipant[];
  onColorClick?: (color: string) => void;
};

export default function ParticipantsList({ draws, onColorClick }: ParticipantsListProps) {
  if (!draws || draws.length === 0) {
    return (
      <div
        className="text-sm font-semibold text-foreground/70"
      >
        No participants yet — draw your color to join!
      </div>
    );
  }

  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {draws.map((draw) => {
        const label = getColorLabel(draw.color);
        const isGuest = !draw.user_id;
        const displayName = isGuest
          ? `Guest: ${draw.guest_nickname || 'Unknown'}`
          : draw.profiles?.nickname ? `@${draw.profiles.nickname}` : 'Participant';

        return (
          <li
            key={draw.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-color bg-background-light px-3 py-2"
          >
            <div
              className="flex min-w-0 shrink items-center gap-2"
            >
              <ColorSwatch
                color={draw.color}
                size="md"
                onClick={onColorClick ? () => onColorClick(draw.color) : undefined}
              />
              <span
                className="text-sm font-medium"
              >
                {label}
              </span>
            </div>
            <div
              className="min-w-0 shrink"
            >
              {isGuest ? (
                <span
                  className="block truncate text-sm font-medium text-foreground/90"
                >
                  {displayName}
                </span>
              ) : (
                <Link
                  href={draw.profiles?.nickname ? `/@${draw.profiles.nickname}` : '#'}
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Avatar
                    avatarUrl={draw.profiles?.avatar_url}
                    fullName={draw.profiles?.full_name}
                    nickname={draw.profiles?.nickname}
                    size="xs"
                  />
                  <span
                    className="truncate text-sm font-medium"
                  >
                    {displayName}
                  </span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
