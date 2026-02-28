'use client';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import { useAuth } from '@/hooks/useAuth';
import { getColorLabel } from '@/lib/colorDraw';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import ColorFullscreen from './ColorFullscreen';
import ColorSwatch from './ColorSwatch';
import ParticipantsList, { type ColorDrawParticipant } from './ParticipantsList';

const GUEST_NICKNAME_KEY = (eventId: number) => `colorDraw_guest_${eventId}`;

type ColorDrawClientProps = {
  eventId: number;
  initialDraws: ColorDrawParticipant[];
};

export default function ColorDrawClient({ eventId, initialDraws }: ColorDrawClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [draws, setDraws] = useState<ColorDrawParticipant[]>(initialDraws);
  const [fullscreenColor, setFullscreenColor] = useState<string | null>(null);
  const [guestNickname, setGuestNickname] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_NICKNAME_KEY(eventId));
    if (stored) setGuestNickname(stored);
  }, [eventId]);

  const myDraw = draws.find(
    (d) =>
      (user && d.user_id === user.id) ||
      (!user && d.guest_nickname && d.guest_nickname === guestNickname.trim()),
  );

  const canDraw = !myDraw;
  const canSwap = myDraw && !myDraw.swapped_at;

  const fetchDraws = useCallback(async () => {
    const res = await fetch(
      `/api/events/color-draw?event_id=${eventId}&_t=${Date.now()}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const { draws: nextDraws } = await res.json();
      setDraws(nextDraws || []);
    }
  }, [eventId]);

  const handleDraw = useCallback(async () => {
    setError(null);
    if (user) {
      setIsDrawing(true);
      try {
        const res = await fetch('/api/events/color-draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId }),
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
      const res = await fetch('/api/events/color-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, guest_nickname: nick }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(GUEST_NICKNAME_KEY(eventId), nick);
        await fetchDraws();
        router.refresh();
      } else {
        setError(data.error || 'Failed to draw color');
      }
    } finally {
      setIsDrawing(false);
    }
  }, [eventId, user, guestNickname, fetchDraws, router]);

  const handleSwap = useCallback(async () => {
    if (!myDraw || myDraw.swapped_at) return;
    setError(null);
    setIsDrawing(true);
    try {
      const res = await fetch('/api/events/color-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          swap: true,
          ...(!user && { guest_nickname: guestNickname.trim() }),
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
  }, [eventId, user, guestNickname, myDraw, fetchDraws, router]);

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
          {!user && (
            <div>
              <label
                htmlFor="guest-nickname"
                className="mb-1 block text-sm font-medium"
              >
                Your nickname
              </label>
              <Input
                id="guest-nickname"
                type="text"
                placeholder="e.g. Alex"
                value={guestNickname}
                onChange={(e) => setGuestNickname(e.target.value)}
                maxLength={50}
              />
            </div>
          )}
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
