import { revalidateFeedback } from '@/app/actions/revalidate';
import type { FeedbackForReview, FeedbackStatus } from '@/types/feedback';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch feedback for admin review queue
 */
export function useFeedbackForReview(status: FeedbackStatus) {
  return useQuery({
    queryKey: ['feedback', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          submitter:profiles!feedback_user_id_fkey (
            id,
            nickname,
            full_name,
            avatar_url
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching feedback:', error);
        return null;
      }

      return (data || []) as FeedbackForReview[];
    },
  });
}

/**
 * Hook to fetch feedback counts by status
 */
export function useFeedbackCounts() {
  return useQuery({
    queryKey: ['feedback-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('status');

      if (error) {
        console.error('Error fetching feedback counts:', error);
        return { new: 0, read: 0, archived: 0 };
      }

      const counts = { new: 0, read: 0, archived: 0 };

      (data || []).forEach((row) => {
        if (row.status === 'new') counts.new++;
        else if (row.status === 'read') counts.read++;
        else if (row.status === 'archived') counts.archived++;
      });

      return counts;
    },
  });
}

/**
 * Hook to update feedback status and/or admin notes
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      status,
      adminNotes,
    }: {
      feedbackId: string;
      status?: FeedbackStatus;
      adminNotes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: { status?: FeedbackStatus; admin_notes?: string | null } = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;

      const { error } = await supabase
        .from('feedback')
        .update(updates)
        .eq('id', feedbackId);

      if (error) {
        throw new Error(error.message || 'Failed to update feedback');
      }

      return { feedbackId, status, adminNotes };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-counts'] });
      await revalidateFeedback();
    },
  });
}
