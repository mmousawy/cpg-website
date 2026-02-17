import type { SharedAlbumMember, SharedAlbumRequest } from '@/types/albums';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { revalidateAlbum, revalidateAlbumBySlug } from '@/app/actions/revalidate';

type JoinResult = { status: 'joined' | 'requested' | 'already_member' | 'already_requested' };
type InviteResult = { created: number; skipped_existing_member: number; skipped_pending: number };

async function fetchMembers(albumId: string): Promise<SharedAlbumMember[]> {
  const { data, error } = await supabase
    .from('shared_album_members')
    .select(`
      id,
      album_id,
      user_id,
      role,
      joined_at,
      created_at,
      profile:profiles!shared_album_members_user_id_fkey(nickname, full_name, avatar_url)
    `)
    .eq('album_id', albumId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message || 'Failed to fetch members');
  return (data ?? []).map((row) => ({
    ...row,
    profiles: (row as { profile?: unknown }).profile ?? null,
  })) as unknown as SharedAlbumMember[];
}

async function fetchRequests(albumId: string): Promise<SharedAlbumRequest[]> {
  const { data, error } = await supabase
    .from('shared_album_requests')
    .select(`
      id,
      album_id,
      user_id,
      type,
      initiated_by,
      status,
      created_at,
      resolved_at,
      profile:profiles!shared_album_requests_user_id_fkey(nickname, full_name, avatar_url)
    `)
    .eq('album_id', albumId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch requests');
  return (data ?? []).map((row) => ({
    ...row,
    profiles: (row as { profile?: unknown }).profile ?? null,
  })) as unknown as SharedAlbumRequest[];
}

async function fetchMyMembership(
  albumId: string,
  userId: string,
): Promise<SharedAlbumMember | null> {
  const { data, error } = await supabase
    .from('shared_album_members')
    .select('*')
    .eq('album_id', albumId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to fetch membership');
  return data as SharedAlbumMember | null;
}

export function useSharedAlbumMembers(albumId: string | undefined) {
  return useQuery({
    queryKey: ['shared-album-members', albumId],
    queryFn: () => fetchMembers(albumId!),
    enabled: !!albumId,
  });
}

export function useSharedAlbumRequests(albumId: string | undefined) {
  return useQuery({
    queryKey: ['shared-album-requests', albumId],
    queryFn: () => fetchRequests(albumId!),
    enabled: !!albumId,
  });
}

export function useMySharedAlbumMembership(albumId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['shared-album-membership', albumId, userId],
    queryFn: () => fetchMyMembership(albumId!, userId!),
    enabled: !!albumId && !!userId,
  });
}

async function notifyAlbumRequest(params: {
  type: string;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  ownerNickname: string;
  [key: string]: unknown;
}) {
  try {
    await fetch('/api/albums/requests/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.error('Failed to send album notification:', err);
  }
}

export function useJoinSharedAlbum(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
  options?: { albumTitle?: string; ownerId?: string },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!albumId) throw new Error('Album ID required');
      const { data, error } = await supabase.rpc('join_shared_album', { p_album_id: albumId });
      if (error) throw new Error(error.message || 'Failed to join album');
      return data as JoinResult;
    },
    onSuccess: (result, _, context) => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['shared-album-members', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-requests', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-membership', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
        revalidateAlbum(ownerNickname, albumSlug);
      }
      if (
        result?.status === 'requested'
        && albumId
        && options?.albumTitle
        && options?.ownerId
        && ownerNickname
      ) {
        notifyAlbumRequest({
          type: 'shared_album_request_received',
          albumId,
          albumTitle: options.albumTitle,
          albumSlug,
          ownerNickname,
          ownerId: options.ownerId,
        });
      }
    },
  });
}

export function useLeaveSharedAlbum(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!albumId) throw new Error('Album ID required');
      const { error } = await supabase.rpc('leave_shared_album', { p_album_id: albumId });
      if (error) throw new Error(error.message || 'Failed to leave album');
    },
    onSuccess: () => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['shared-album-members', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-membership', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
        revalidateAlbum(ownerNickname, albumSlug);
      }
    },
  });
}

export function useInviteToSharedAlbum(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
  options?: { albumTitle?: string },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!albumId) throw new Error('Album ID required');
      const { data, error } = await supabase.rpc('invite_to_shared_album', {
        p_album_id: albumId,
        p_user_ids: userIds,
      });
      if (error) throw new Error(error.message || 'Failed to invite');
      return data as InviteResult;
    },
    onSuccess: async (result, userIds) => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['shared-album-requests', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
      }
      if (
        albumId
        && ownerNickname
        && result.created > 0
        && options?.albumTitle
        && userIds
      ) {
        for (const inviteeId of userIds) {
          await notifyAlbumRequest({
            type: 'shared_album_invite_received',
            albumId,
            albumTitle: options.albumTitle,
            albumSlug,
            ownerNickname,
            inviteeId,
          });
        }
      }
    },
  });
}

export function useResolveAlbumRequest(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
  options?: { albumTitle?: string; ownerId?: string },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      requestId: number;
      action: 'accept' | 'decline';
      targetUserId?: string;
      requestType?: 'invite' | 'request';
    }) => {
      const { error } = await supabase.rpc('resolve_album_request', {
        p_request_id: variables.requestId,
        p_action: variables.action,
      });
      if (error) throw new Error(error.message || 'Failed to resolve request');
      return variables;
    },
    onSuccess: async (data, variables) => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['shared-album-members', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-requests', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-membership', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
        revalidateAlbum(ownerNickname, albumSlug);
      }
      if (
        albumId
        && ownerNickname
        && options?.albumTitle
        && data.targetUserId
      ) {
        if (data.requestType === 'invite' && data.action === 'accept' && options.ownerId) {
          await notifyAlbumRequest({
            type: 'shared_album_invite_accepted',
            albumId,
            albumTitle: options.albumTitle,
            albumSlug,
            ownerNickname,
            ownerId: options.ownerId,
            accepterId: data.targetUserId,
          });
        } else if (data.requestType === 'request') {
          await notifyAlbumRequest({
            type: data.action === 'accept' ? 'shared_album_request_accepted' : 'shared_album_request_declined',
            albumId,
            albumTitle: options.albumTitle,
            albumSlug,
            ownerNickname,
            userId: data.targetUserId,
          });
        }
      }
    },
  });
}

export function useRemoveAlbumMember(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!albumId) throw new Error('Album ID required');
      const { error } = await supabase.rpc('remove_album_member', {
        p_album_id: albumId,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message || 'Failed to remove member');
    },
    onSuccess: () => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['shared-album-members', albumId] });
        queryClient.invalidateQueries({ queryKey: ['shared-album-membership', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
        revalidateAlbum(ownerNickname, albumSlug);
      }
    },
  });
}
