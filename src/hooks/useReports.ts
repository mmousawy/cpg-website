import { revalidateReports } from '@/app/actions/revalidate';
import type { ReportForReview, ReportStatus } from '@/types/reports';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch reports for admin review queue
 */
export function useReportsForReview(status: ReportStatus) {
  return useQuery({
    queryKey: ['reports', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey (
            id,
            nickname,
            full_name,
            avatar_url
          ),
          reviewer:profiles!reports_reviewed_by_fkey (
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
    },
  });
}

/**
 * Hook to fetch report counts by status
 */
export function useReportCounts() {
  return useQuery({
    queryKey: ['report-counts'],
    queryFn: async () => {
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
    },
  });
}

/**
 * Hook to resolve a single report
 */
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      adminNotes,
      resolutionType,
    }: {
      reportId: string;
      status: 'resolved' | 'dismissed';
      adminNotes?: string;
      resolutionType?: string;
    }) => {
      const res = await fetch('/api/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          status,
          adminNotes,
          resolutionType,
        }),
      });

      const body = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message || 'Failed to resolve report');
      }

      return { reportId, status };
    },
    onSuccess: async () => {
      // Invalidate all report queries
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      // Invalidate report counts
      queryClient.invalidateQueries({ queryKey: ['report-counts'] });
      // Revalidate server cache
      await revalidateReports();
    },
  });
}

/**
 * Hook to bulk resolve reports
 */
export function useBulkResolveReports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportIds,
      status,
      adminNotes,
      resolutionType,
    }: {
      reportIds: string[];
      status: 'resolved' | 'dismissed';
      adminNotes?: string;
      resolutionType?: string;
    }) => {
      const res = await fetch('/api/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportIds,
          status,
          adminNotes,
          resolutionType,
        }),
      });

      const body = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message || 'Failed to resolve reports');
      }

      return { reportIds, status };
    },
    onSuccess: async () => {
      // Invalidate all report queries
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      // Invalidate report counts
      queryClient.invalidateQueries({ queryKey: ['report-counts'] });
      // Revalidate server cache
      await revalidateReports();
    },
  });
}
