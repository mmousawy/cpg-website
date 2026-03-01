'use client';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import { useAuth } from '@/hooks/useAuth';
import { getColorLabel } from '@/lib/colorDraw';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ColorFullscreen from './ColorFullscreen';
import ColorSwatch from './ColorSwatch';
import ParticipantsList, { type ColorDrawParticipant } from './ParticipantsList';

const GUEST_NICKNAME_KEY = (challengeId: string) => `colorDraw_guest_${challengeId}`;

type ColorDrawClientProps = {
  challengeId: string;
  initialDraws: ColorDrawParticipant[];
  isEnded: boolean;
};

export default function ColorDrawClient({ challengeId, initialDraws, isEnded }: ColorDrawClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [draws, setDraws] = useState<ColorDrawParticipant[]>(initialDraws);

  // Guest join is only allowed when the URL has ?guest=KEY (key must match server env)
  const guestKey = searchParams.get('guest');
  const allowGuest = useMemo(() => !!guestKey, [guestKey]);
  const [fullscreenColor, setFullscreenColor] = useState<string | null>(null);
  const [guestNickname, setGuestNickname] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_NICKNAME_KEY(challengeId));
    if (stored) setGuestNickname(stored);
  }, [challengeId]);

  const myDraw = draws.find(
    (d) =>
      (user && d.user_id === user.id) ||
      (!user && d.guest_nickname && d.guest_nickname === guestNickname.trim()),
  );

  const canDraw = !myDraw && !isEnded;
  const canSwap = myDraw && !myDraw.swapped_at && !isEnded;

  const fetchDraws = useCallback(async () => {
    const res = await fetch(
      `/api/challenges/color-draw?challenge_id=${challengeId}&_t=${Date.now()}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const { draws: nextDraws } = await res.json();
      setDraws(nextDraws || []);
    }
  }, [challengeId]);

  const handleDraw = useCallback(async () => {
    setError(null);
    if (user) {
      setIsDrawing(true);
      try {
        const res = await fetch('/api/challenges/color-draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge_id: challengeId }),
        });
        const data = await res.json();
        if (res.ok) {
          await fetchDraws();
          router.refresh();
        } else {
          setError(data.error || 'Failed to draw color');
        }
      } finally {
        setIsDrawing(false);
      }
      return;
    }

    const nick = guestNickname.trim();
    if (!nick) {
      setError('Please enter a nickname');
      return;
    }
    setIsDrawing(true);
    try {
      const res = await fetch('/api/challenges/color-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          guest_nickname: nick,
          guest_key: guestKey,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(GUEST_NICKNAME_KEY(challengeId), nick);
        await fetchDraws();
        router.refresh();
      } else {
        setError(data.error || 'Failed to draw color');
      }
    } finally {
      setIsDrawing(false);
    }
  }, [challengeId, user, guestNickname, guestKey, fetchDraws, router]);

  const handleSwap = useCallback(async () => {
    if (!myDraw || myDraw.swapped_at) return;
    setError(null);
    setIsDrawing(true);
    try {
      const res = await fetch('/api/challenges/color-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          swap: true,
          ...(!user && {
            guest_nickname: guestNickname.trim(),
            guest_key: guestKey,
          }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDraws();
        router.refresh();
      } else {
        setError(data.error || 'Failed to swap color');
      }
    } finally {
      setIsDrawing(false);
    }
  }, [challengeId, user, guestNickname, guestKey, myDraw, fetchDraws, router]);

  return (
    <div
      className="space-y-6"
    >
      <ColorFullscreen
        color={fullscreenColor || ''}
        isOpen={!!fullscreenColor}
        onClose={() => setFullscreenColor(null)}
      />

      {canDraw && (
        <div
          className="space-y-3"
        >
          {!user && !allowGuest && (
            <p
              className="text-sm text-foreground/70"
            >
              Sign in to draw a color and join as a participant.
            </p>
          )}
          {!user && allowGuest && (
            <div
              className="flex items-center gap-2"
            >
              <div
                className="max-w-[75%]"
              >
                <label
                  htmlFor="guest-nickname"
                  className="mb-1 block text-sm font-medium"
                >
                  Join as a guest
                </label>
                <Input
                  id="guest-nickname"
                  type="text"
                  placeholder="Enter your name here..."
                  value={guestNickname}
                  onChange={(e) => setGuestNickname(e.target.value)}
                  maxLength={50}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleDraw}
                loading={isDrawing}
                disabled={!guestNickname.trim()}
                className="self-end"
              >
                Draw your color
              </Button>
            </div>
          )}
          {user && (
            <div
              className="flex items-center gap-4"
            >
              <p>
                You are joining as
                {' '}
                {profile?.nickname ? `@${profile.nickname}` : 'Participant'}
              </p>
              <Button
                variant="primary"
                onClick={handleDraw}
                loading={isDrawing}
                disabled={!user && !guestNickname.trim()}
              >
                Draw your color
              </Button>
            </div>
          )}
        </div>
      )}

      {!myDraw && isEnded && (
        <p
          className="text-sm text-foreground/70"
        >
          Color draw has ended. You can still view participants below.
        </p>
      )}

      {myDraw && (
        <div
          className="rounded-xl border border-border-color bg-background-light p-4"
        >
          <p
            className="mb-2 text-sm font-medium text-foreground/70"
          >
            Your color
          </p>
          <div
            className="flex items-center gap-2"
          >
            <ColorSwatch
              color={myDraw.color}
              size="md"
              onClick={() => setFullscreenColor(myDraw.color)}
            />
            <span
              className="text-lg font-semibold cursor-pointer"
              onClick={() => setFullscreenColor(myDraw.color)}
            >
              {getColorLabel(myDraw.color)}
            </span>
            {canSwap && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSwap}
                loading={isDrawing}
                className="ml-2"
              >
                Swap
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <ErrorMessage>
        {error}
      </ErrorMessage>}

      <div>
        <h3
          className="mb-3 text-lg font-semibold"
        >
          Participants (
          {draws.length}
          )
        </h3>
        <ParticipantsList
          draws={draws}
          onColorClick={(color) => setFullscreenColor(color)}
        />
      </div>
    </div>
  );
}
