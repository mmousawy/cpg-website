import { revalidateScene } from '@/app/actions/revalidate';
import type { SceneEventFormData } from '@/types/scene';
import { supabase } from '@/utils/supabase/client';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export type SceneEventInterest = {
  user_id: string;
  profile: {
    nickname: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

async function fetchSceneEventInterests(sceneEventId: string): Promise<{
  interests: SceneEventInterest[];
  count: number;
  userIsInterested: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error } = await supabase
    .from('scene_event_interests')
    .select(
      `
      user_id,
      profile:profiles!scene_event_interests_user_id_fkey(nickname, avatar_url, full_name, suspended_at, deletion_scheduled_at)
    `,
    )
    .eq('scene_event_id', sceneEventId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  type ProfileRow = {
    nickname: string | null;
    avatar_url: string | null;
    full_name: string | null;
    suspended_at: string | null;
    deletion_scheduled_at: string | null;
  };

  const active = (rows || []).filter((r) => {
    const p = r.profile as ProfileRow | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  });

  const userIsInterested = user
    ? active.some((r) => r.user_id === user.id)
    : false;

  return {
    interests: active.map((r) => ({
      user_id: r.user_id,
      profile: r.profile
        ? {
          nickname: (r.profile as ProfileRow).nickname,
          avatar_url: (r.profile as ProfileRow).avatar_url,
          full_name: (r.profile as ProfileRow).full_name,
        }
        : null,
    })),
    count: active.length,
    userIsInterested,
  };
}

type SubmitResponse = {
  event: { id: string; slug: string; title: string; created_at: string };
  duplicate_warning?: boolean;
  existing_slug?: string;
};

/**
 * Hook to submit a new scene event
 */
export function useSubmitSceneEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SceneEventFormData): Promise<SubmitResponse> => {
      const res = await fetch('/api/scene/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to add event');
      }

      return json;
    },
    onSuccess: async () => {
      await revalidateScene();
      queryClient.invalidateQueries({ queryKey: ['scene'] });
    },
  });
}

/**
 * Hook to update a scene event (owner or admin)
 */
export function useUpdateSceneEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: SceneEventFormData;
    }) => {
      const res = await fetch(`/api/scene/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update event');
      }

      return json as { event: { id: string; slug: string; title: string } };
    },
    onSuccess: async (_data, variables) => {
      await revalidateScene();
      queryClient.invalidateQueries({ queryKey: ['scene'] });
      queryClient.invalidateQueries({
        queryKey: ['scene-event-interest', variables.eventId],
      });
    },
  });
}

/**
 * Hook for admin to soft-delete a scene event
 */
export function useDeleteSceneEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('scene_events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) {
        throw new Error(error.message || 'Failed to delete event');
      }
    },
    onSuccess: async () => {
      await revalidateScene();
      queryClient.invalidateQueries({ queryKey: ['scene'] });
    },
  });
}

/**
 * Hook for fetching scene event interests (who's interested)
 */
export function useSceneEventInterest(
  sceneEventId: string | undefined,
  options?: {
    initialCount?: number;
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: ['scene-event-interest', sceneEventId],
    queryFn: () => fetchSceneEventInterests(sceneEventId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!sceneEventId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to toggle interest in a scene event
 */
export function useToggleSceneEventInterest(sceneEventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scene/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneEventId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update interest');
      }

      return json as { interested: boolean; count: number };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['scene-event-interest', sceneEventId],
      });
      const prev = queryClient.getQueryData<{
        interests: SceneEventInterest[];
        count: number;
        userIsInterested: boolean;
      }>(['scene-event-interest', sceneEventId]);

      queryClient.setQueryData(
        ['scene-event-interest', sceneEventId],
        (old: { interests: SceneEventInterest[]; count: number; userIsInterested: boolean } | undefined) => {
          if (!old) return old;
          const currentlyInterested = old.userIsInterested;
          return {
            ...old,
            userIsInterested: !currentlyInterested,
            count: currentlyInterested
              ? Math.max(0, old.count - 1)
              : old.count + 1,
          };
        },
      );

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(
          ['scene-event-interest', sceneEventId],
          context.prev,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['scene-event-interest', sceneEventId],
      });
      queryClient.invalidateQueries({ queryKey: ['scene'] });
    },
  });
}
