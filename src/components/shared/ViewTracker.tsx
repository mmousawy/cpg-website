'use client';

import { useViewTracker } from '@/hooks/useViewTracker';

/**
 * Client component that tracks views for photos and albums.
 * Renders nothing - just triggers the view tracking hook.
 * Used in server components that need client-side view tracking.
 */
export default function ViewTracker({ type, id }: { type: 'photo' | 'album'; id: string }) {
  useViewTracker(type, id);
  return null; // Renders nothing
}
