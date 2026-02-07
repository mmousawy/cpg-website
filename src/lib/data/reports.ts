import { createClient } from '@/utils/supabase/server';
import type { ReportForReview, ReportStatus } from '@/types/reports';

/**
 * Get reports for admin review queue
 */
export async function getReportsForReview(status: ReportStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey (
        id,
        nickname,
        full_name,
        avatar_url
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: true }); // Oldest first

  if (error) {
    console.error('Error fetching reports:', error);
    return null;
  }

  return (data || []) as ReportForReview[];
}

/**
 * Get report counts by status for badges
 */
export async function getReportCounts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('status');

  if (error) {
    console.error('Error fetching report counts:', error);
    return {
      pending: 0,
      resolved: 0,
      dismissed: 0,
    };
  }

  const counts = {
    pending: 0,
    resolved: 0,
    dismissed: 0,
  };

  (data || []).forEach((report) => {
    if (report.status === 'pending') counts.pending++;
    else if (report.status === 'resolved') counts.resolved++;
    else if (report.status === 'dismissed') counts.dismissed++;
  });

  return counts;
}
