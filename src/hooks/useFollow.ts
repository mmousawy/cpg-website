'use client';

import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';

async function fetchFollowStatus(profileId: string): Promise<{ isFollowing: boolean }> {
  const response = await fetch(`/api/follows?profileId=${encodeURIComponent(profileId)}`);

  if (!response.ok) {
    throw new Error('Failed to load follow status');
  }

  return response.json();
}

export function useFollowStatus(profileId: string, enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['follow', profileId],
    queryFn: () => fetchFollowStatus(profileId),
    enabled: enabled && !!user && user.id !== profileId,
    staleTime: 30_000,
  });
}

export function useFollowMutation(profileId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (follow: boolean) => {
      const response = follow
        ? await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        })
        : await fetch(`/api/follows?profileId=${encodeURIComponent(profileId)}`, {
          method: 'DELETE',
        });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update follow status');
      }

      return response.json() as Promise<{ isFollowing: boolean }>;
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: ['follow', profileId] });
      const previous = queryClient.getQueryData<{ isFollowing: boolean }>(['follow', profileId]);
      queryClient.setQueryData(['follow', profileId], { isFollowing: follow });
      return { previous };
    },
    onError: (_error, _follow, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['follow', profileId], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['follow', profileId], { isFollowing: data.isFollowing });
      router.refresh();
    },
  });
}

export function useFollowLoginHref() {
  const pathname = usePathname();
  return `/login?redirectTo=${encodeURIComponent(pathname)}`;
}
