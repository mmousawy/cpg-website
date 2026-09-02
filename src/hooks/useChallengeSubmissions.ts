import { revalidateChallenge, revalidatePhoto, revalidatePhotos } from '@/app/actions/revalidate';
import type { SubmissionForReview, SubmissionWithDetails } from '@/types/challenges';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Fetch user's submissions to a specific challenge
 */
async function fetchMySubmissionsForChallenge(
  userId: string,
  challengeId: string,
): Promise<SubmissionWithDetails[]> {
  const { data, error } = await supabase
    .from('challenge_submissions')
    .select(
      `
      *,
      photo:photos (id, short_id, url, width, height, title, blurhash),
      challenge:challenges (id, slug, title),
      user:profiles!challenge_submissions_user_id_fkey (nickname, full_name, avatar_url)
    `,
    )
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch submissions');
  }

  return (data || []) as SubmissionWithDetails[];
}

/**
 * Hook to fetch user's submissions for a specific challenge
 */
export function useMySubmissionsForChallenge(
  userId: string | undefined,
  challengeId: string | undefined,
) {
  return useQuery({
    queryKey: ['my-challenge-submissions', userId, challengeId],
    queryFn: () => fetchMySubmissionsForChallenge(userId!, challengeId!),
    enabled: !!userId && !!challengeId,
  });
}

/**
 * Fetch all of user's submissions across all challenges
 */
async function fetchAllMySubmissions(userId: string): Promise<SubmissionWithDetails[]> {
  const { data, error } = await supabase
    .from('challenge_submissions')
    .select(
      `
      *,
      photo:photos (id, short_id, url, width, height, title, blurhash),
      challenge:challenges (id, slug, title, cover_image_url, image_blurhash, ends_at, is_active),
      user:profiles!challenge_submissions_user_id_fkey (nickname, full_name, avatar_url)
    `,
    )
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch submissions');
  }

  return (data || []) as SubmissionWithDetails[];
}

/**
 * Hook to fetch all of user's submissions
 */
export function useAllMySubmissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-submissions', userId],
    queryFn: () => fetchAllMySubmissions(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to submit photos to a challenge
 */
export function useSubmitToChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      photoIds,
    }: {
      challengeId: string;
      photoIds: string[];
    }) => {
      const res = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          photoIds,
        }),
      });

      const body = await res.json().catch(() => ({})) as {
        submittedCount?: number;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(body.message || 'Failed to submit to challenge');
      }

      return body.submittedCount ?? 0;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['my-challenge-submissions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['my-submissions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge', variables.challengeId],
      });
    },
  });
}

/**
 * Hook to withdraw a pending submission
 */
export function useWithdrawSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from('challenge_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('status', 'pending'); // Can only withdraw pending

      if (error) {
        throw new Error(error.message || 'Failed to withdraw submission');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['my-challenge-submissions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['my-submissions'],
      });
    },
  });
}

/**
 * Hook to review a submission (admin)
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
      rejectionReason,
      challengeSlug,
      photoShortId,
    }: {
      submissionId: string;
      status: 'accepted' | 'rejected';
      rejectionReason?: string;
      challengeSlug: string;
      photoShortId: string;
    }) => {
      const res = await fetch('/api/challenges/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: [submissionId],
          status,
          rejectionReason,
          challengeSlug,
        }),
      });

      const body = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message || 'Failed to review submission');
      }

      return { challengeSlug, photoShortId };
    },
    onSuccess: async (data) => {
      // Revalidate server-side cache for the challenge detail page
      await revalidateChallenge(data.challengeSlug);
      // Revalidate the specific photo's cache
      await revalidatePhoto(data.photoShortId);

      queryClient.invalidateQueries({
        queryKey: ['challenge-submissions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge-photos'],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge'],
      });
      // Invalidate photos query so manage grid shows updated challenge badges
      // Note: This uses a broad prefix match but only affects client-side React Query cache
      queryClient.invalidateQueries({
        queryKey: ['photos'],
      });
    },
  });
}

/**
 * Hook to bulk review submissions (admin)
 */
export function useBulkReviewSubmissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionIds,
      status,
      rejectionReason,
      challengeSlug,
      photoShortIds,
    }: {
      submissionIds: string[];
      status: 'accepted' | 'rejected';
      rejectionReason?: string;
      challengeSlug: string;
      photoShortIds: string[];
    }) => {
      const res = await fetch('/api/challenges/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds,
          status,
          rejectionReason,
          challengeSlug,
        }),
      });

      const body = await res.json().catch(() => ({})) as {
        count?: number;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(body.message || 'Failed to review submissions');
      }

      return { count: body.count ?? submissionIds.length, challengeSlug, photoShortIds };
    },
    onSuccess: async (data) => {
      // Revalidate server-side cache for the challenge detail page
      await revalidateChallenge(data.challengeSlug);
      // Revalidate specific photos' cache
      await revalidatePhotos(data.photoShortIds);

      queryClient.invalidateQueries({
        queryKey: ['challenge-submissions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge-photos'],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge'],
      });
      // Invalidate photos query so manage grid shows updated challenge badges
      // Note: This uses a broad prefix match but only affects client-side React Query cache
      queryClient.invalidateQueries({
        queryKey: ['photos'],
      });
    },
  });
}

/**
 * Fetch submissions for review (admin)
 */
async function fetchSubmissionsForReview(
  challengeId: string,
  status: 'pending' | 'accepted' | 'rejected',
): Promise<SubmissionForReview[]> {
  const { data, error } = await supabase
    .from('challenge_submissions')
    .select(
      `
      *,
      photo:photos (id, short_id, url, width, height, title, blurhash),
      user:profiles!challenge_submissions_user_id_fkey (id, nickname, full_name, avatar_url)
    `,
    )
    .eq('challenge_id', challengeId)
    .eq('status', status)
    .order('submitted_at', { ascending: status === 'pending' }); // Oldest first for pending

  if (error) {
    console.error('Error fetching submissions for review:', error);
    throw new Error(error.message || 'Failed to fetch submissions');
  }

  return (data || []) as SubmissionForReview[];
}

/**
 * Hook to fetch submissions for review (admin)
 */
export function useSubmissionsForReview(
  challengeId: string | undefined,
  status: 'pending' | 'accepted' | 'rejected' = 'pending',
) {
  return useQuery({
    queryKey: ['challenge-submissions', challengeId, status],
    queryFn: () => fetchSubmissionsForReview(challengeId!, status),
    enabled: !!challengeId,
  });
}
