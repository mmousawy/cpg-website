'use client';

import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import type { SharedAlbumRequest } from '@/types/albums';

import CloseMiniSVG from 'public/icons/close-mini.svg';

type AlbumRequestsPanelProps = {
  requests: SharedAlbumRequest[];
  onAccept: (request: SharedAlbumRequest) => void;
  onDecline: (request: SharedAlbumRequest) => void;
  isResolving: boolean;
};

function getDisplayName(req: SharedAlbumRequest): string {
  const profile = req.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.nickname) return `@${profile.nickname}`;
  return 'Unknown';
}

export default function AlbumRequestsPanel({
  requests,
  onAccept,
  onDecline,
  isResolving,
}: AlbumRequestsPanelProps) {
  // Only show join requests (type='request') — invites are resolved by the invited user
  const joinRequests = requests.filter((r) => r.type === 'request');
  const pendingInvites = requests.filter((r) => r.type === 'invite');

  if (joinRequests.length === 0 && pendingInvites.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-3"
    >
      {joinRequests.length > 0 && (
        <>
          <h3
            className="text-sm font-semibold"
          >
            Join requests
          </h3>
          <div
            className="rounded-lg border border-border-color bg-background-light max-h-64 overflow-y-auto"
          >
            <ul
              className="divide-y divide-border-color"
            >
              {joinRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <Avatar
                      avatarUrl={req.profiles?.avatar_url}
                      fullName={req.profiles?.full_name}
                      nickname={req.profiles?.nickname}
                      size="sm"
                    />
                    <div
                      className="min-w-0"
                    >
                      <span
                        className="font-medium block truncate"
                      >
                        {getDisplayName(req)}
                      </span>
                      <span
                        className="text-xs text-foreground/60"
                      >
                        Requested to join
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex gap-2 shrink-0"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDecline(req)}
                      disabled={isResolving}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onAccept(req)}
                      disabled={isResolving}
                    >
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {pendingInvites.length > 0 && (
        <>
          <h3
            className="text-sm font-semibold"
          >
            Pending invites
          </h3>
          <div
            className="rounded-lg border border-border-color bg-background-light max-h-64 overflow-y-auto"
          >
            <ul
              className="divide-y divide-border-color"
            >
              {pendingInvites.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <Avatar
                      avatarUrl={req.profiles?.avatar_url}
                      fullName={req.profiles?.full_name}
                      nickname={req.profiles?.nickname}
                      size="sm"
                    />
                    <div
                      className="min-w-0"
                    >
                      <span
                        className="font-medium block truncate"
                      >
                        {getDisplayName(req)}
                      </span>
                      <span
                        className="text-xs text-foreground/60"
                      >
                        Invited — waiting for response
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDecline(req)}
                    disabled={isResolving}
                    className="shrink-0 rounded p-1 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    title={`Revoke invite for ${getDisplayName(req)}`}
                  >
                    <CloseMiniSVG
                      className="size-4"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
