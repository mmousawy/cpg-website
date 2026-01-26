'use client';

import NotificationToast from '@/components/notifications/NotificationToast';
import { useAuth } from '@/hooks/useAuth';
import type { NotificationWithActor } from '@/types/notifications';
import { supabase } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Track shown toast IDs to prevent duplicates
const shownToastIds = new Set<string>();

// Track last sound play time to debounce sound effects
let lastSoundPlayTime = 0;
const NOTIFICATION_SOUND_WINDOW_MS = 3000; // 3 seconds

/**
 * Play notification sound effect (debounced - only once per 3 seconds)
 */
function handleNotificationSound(): void {
  const now = Date.now();

  // Only play if more than 3 seconds have passed since last sound
  if (now - lastSoundPlayTime < NOTIFICATION_SOUND_WINDOW_MS) {
    return;
  }

  lastSoundPlayTime = now;

  try {
    const audio = new Audio('/cpg-notification.mp3');
    audio.volume = 0.7; // Set volume to 70%
    audio.play().catch((error) => {
      // Silently fail if audio can't play (e.g., user hasn't interacted with page)
      console.debug('Could not play notification sound:', error);
    });
  } catch (error) {
    console.debug('Error creating audio:', error);
  }
}

/**
 * Hook that subscribes to Supabase Realtime for new notifications
 * and displays toast notifications when they arrive.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as NotificationWithActor;

          // Skip if already shown
          if (shownToastIds.has(newNotification.id)) {
            return;
          }

          // Fetch full notification with actor details
          const { data: fullNotification, error } = await supabase
            .from('notifications')
            .select('*, actor:profiles!notifications_actor_id_fkey(nickname, avatar_url, full_name)')
            .eq('id', newNotification.id)
            .single();

          if (error || !fullNotification) {
            return;
          }

          // Mark as shown
          shownToastIds.add(fullNotification.id);

          // Play notification sound effect
          handleNotificationSound();

          // Show toast - auto-dismiss after 10 seconds
          toast.custom(
            (t) => (
              <NotificationToast
                notification={fullNotification as NotificationWithActor}
                toastId={t}
              />
            ),
            {
              duration: 10000,
              onDismiss: () => {
                shownToastIds.delete(fullNotification.id);
              },
            },
          );

          // Trigger a refresh event so NotificationButton updates its count
          window.dispatchEvent(new CustomEvent('notifications:refresh'));
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
}
