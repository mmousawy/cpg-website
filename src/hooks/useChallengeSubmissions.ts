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
      challenge:challenges (id, slug, title)
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
      photo:photos (id, url, width, height, title, blurhash),
      challenge:challenges (id, slug, title, cover_image_url, image_blurhash, ends_at, is_active)
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
      const { data, error } = await supabase.rpc('submit_to_challenge', {
        p_challenge_id: challengeId,
        p_photo_ids: photoIds,
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit to challenge');
      }

      const submittedCount = data as number;

      // Notify admins about the new submission (fire and forget)
      fetch('/api/challenges/notify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          photoIds,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            console.error('Notify admins failed:', res.status, text);
          }
        })
        .catch((err) => {
          // Log but don't fail the submission
          console.error('Failed to notify admins:', err);
        });

      return submittedCount;
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
      const { error } = await supabase.rpc('review_challenge_submission', {
        p_submission_id: submissionId,
        p_status: status,
        p_rejection_reason: rejectionReason ?? undefined,
      });

      if (error) {
        throw new Error(error.message || 'Failed to review submission');
      }

      // Send notification to user (fire-and-forget)
      fetch('/api/challenges/notify-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: [submissionId],
          status,
          rejectionReason,
          challengeSlug,
        }),
      }).catch((err) => console.error('Failed to send notification:', err));

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
      const { data, error } = await supabase.rpc('bulk_review_challenge_submissions', {
        p_submission_ids: submissionIds,
        p_status: status,
        p_rejection_reason: rejectionReason ?? undefined,
      });

      if (error) {
        throw new Error(error.message || 'Failed to review submissions');
      }

      // Send notifications to users (fire-and-forget)
      fetch('/api/challenges/notify-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds,
          status,
          rejectionReason,
          challengeSlug,
        }),
      }).catch((err) => console.error('Failed to send notifications:', err));

      return { count: data as number, challengeSlug, photoShortIds };
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
