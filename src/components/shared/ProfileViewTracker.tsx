'use client';

import { recordView } from '@/utils/recordView';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Silent profile view tracking for public profile subpages (home, photos, albums, gear).
 */
export default function ProfileViewTracker({ profileId }: { profileId: string }) {
  const pathname = usePathname();
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const trackKey = `profile:${profileId}:${pathname}`;
    if (trackedKey.current === trackKey) return;
    trackedKey.current = trackKey;

    recordView('profile', profileId);

    return () => {
      trackedKey.current = null;
    };
  }, [profileId, pathname]);

  return null;
}
