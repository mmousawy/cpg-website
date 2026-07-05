'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

const processedPathnames = new Set<string>();

type MarkSeenByLinkResponse = {
  success: boolean;
  markedIds: string[];
  error?: string;
};

/**
 * Hook that automatically marks notifications as seen when the user
 * navigates to a page that matches a notification's link.
 *
 * This provides a better UX by not requiring users to manually
 * mark notifications as read - visiting the content is enough.
 */
export function useAutoMarkNotificationsSeen() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastCheckedPathname = useRef<string | null>(null);
  const isMarkingRef = useRef(false);

  useEffect(() => {
    // Only run for authenticated users
    if (!user?.id) return;

    // Skip if we already checked this pathname
    if (lastCheckedPathname.current === pathname) return;
    lastCheckedPathname.current = pathname;

    // Deduplicate across remounts in the same client session
    if (processedPathnames.has(pathname)) return;

    // Prevent duplicate requests while one is already pending
    if (isMarkingRef.current) return;

    // Skip paths that don't typically have associated notifications
    const skipPaths = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/onboarding',
      '/members',
      '/account/activity', // Don't auto-mark on the activity page itself
      '/admin',
    ];

    if (skipPaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    // Mark notifications with matching link as seen
    const markSeen = async () => {
      isMarkingRef.current = true;
      processedPathnames.add(pathname);

      const response = await fetch('/api/notifications/mark-seen-by-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pathname }),
      });

      const result: MarkSeenByLinkResponse = await response.json();

      if (result.success && result.markedIds.length > 0) {
        // Dispatch events to update UI in other components
        result.markedIds.forEach((id) => {
          window.dispatchEvent(new CustomEvent('notifications:mark-seen', {
            detail: { notificationId: id },
          }));
        });
      }

      isMarkingRef.current = false;
    };

    markSeen().catch(() => {
      isMarkingRef.current = false;
    });
  }, [pathname, user?.id]);
}
