'use client';

import MemberSearchFilters from '@/components/admin/MemberSearchFilters';
import Button from '@/components/shared/Button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StatsDonutChart from '@/components/stats/StatsDonutChart';
import type { AdminMemberStatsRow } from '@/types/stats';
import { formatFileSize } from '@/utils/formatFileSize';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SortField =
  | 'created_at'
  | 'last_logged_in'
  | 'nickname'
  | 'email'
  | 'storage_bytes'
  | 'photo_count'
  | 'views_received'
  | 'followers';

type MemberStatsExplorerProps = {
  preferenceCharts?: {
    themes: { label: string; value: number }[];
    albumCardStyles: { label: string; value: number }[];
    defaultLicenses: { label: string; value: number }[];
    topInterests: { label: string; value: number }[];
    emailOptOuts: { label: string; value: number }[];
  };
};

function exportMembersCsv(members: AdminMemberStatsRow[]) {
  const headers = [
    'nickname', 'email', 'photos', 'albums', 'storage_bytes', 'views', 'likes',
    'followers', 'theme', 'newsletter_opt_in',
  ];
  const rows = members.map((m) => [
    m.nickname ?? '',
    m.email ?? '',
    m.photo_count,
    m.album_count,
    m.storage_bytes,
    m.views_received,
    m.likes_received,
    m.followers,
    m.theme ?? '',
    m.newsletter_opt_in,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'member-stats.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function MemberStatsExplorer({ preferenceCharts }: MemberStatsExplorerProps) {
  const [members, setMembers] = useState<AdminMemberStatsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<SortField>('storage_bytes');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        filter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '50',
      });
      const res = await fetch(`/api/admin/members/stats?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members as AdminMemberStatsRow[]);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search, filter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const sortIndicator = (field: SortField) => sortBy === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '';

  const preferenceSection = useMemo(() => {
    if (!preferenceCharts) return null;
    return (
      <div
        className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <StatsDonutChart title="Theme" items={preferenceCharts.themes} />
        <StatsDonutChart title="Album card style" items={preferenceCharts.albumCardStyles} />
        <StatsDonutChart title="Default license" items={preferenceCharts.defaultLicenses} />
        <StatsDonutChart title="Top interests" items={preferenceCharts.topInterests} />
        <StatsDonutChart title="Email opt-outs" items={preferenceCharts.emailOptOuts} />
      </div>
    );
  }, [preferenceCharts]);

  return (
    <div>
      {preferenceSection}

      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p
          className="text-sm text-foreground/70"
        >
          {total.toLocaleString()} members
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => exportMembersCsv(members)}
          disabled={members.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <MemberSearchFilters
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
      />

      {isLoading ? (
        <div
          className="flex justify-center py-12"
        >
          <LoadingSpinner />
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border border-border-color"
        >
          <table
            className="min-w-full text-sm"
          >
            <thead
              className="bg-background-light text-left text-xs font-medium text-foreground/70"
            >
              <tr>
                <th className="p-3">Member</th>
                <th
                  className="p-3 cursor-pointer hover:text-primary"
                  onClick={() => handleSort('photo_count')}
                >
                  Photos{sortIndicator('photo_count')}
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-primary"
                  onClick={() => handleSort('storage_bytes')}
                >
                  Storage{sortIndicator('storage_bytes')}
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-primary"
                  onClick={() => handleSort('views_received')}
                >
                  Views{sortIndicator('views_received')}
                </th>
                <th className="p-3">Likes</th>
                <th
                  className="p-3 cursor-pointer hover:text-primary"
                  onClick={() => handleSort('followers')}
                >
                  Followers{sortIndicator('followers')}
                </th>
                <th className="p-3">Theme</th>
                <th className="p-3">Newsletter</th>
                <th
                  className="p-3 cursor-pointer hover:text-primary"
                  onClick={() => handleSort('last_logged_in')}
                >
                  Last login{sortIndicator('last_logged_in')}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-border-color hover:bg-background-light/50"
                >
                  <td className="p-3">
                    {member.nickname ? (
                      <Link
                        href={`/@${member.nickname}`}
                        className="font-medium hover:text-primary"
                      >
                        @{member.nickname}
                      </Link>
                    ) : (
                      member.email ?? '—'
                    )}
                    {member.suspended_at && (
                      <span
                        className="ml-2 text-xs text-red-600"
                      >
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="p-3">{member.photo_count}</td>
                  <td className="p-3">{formatFileSize(member.storage_bytes)}</td>
                  <td className="p-3">{member.views_received.toLocaleString()}</td>
                  <td className="p-3">{member.likes_received.toLocaleString()}</td>
                  <td className="p-3">{member.followers.toLocaleString()}</td>
                  <td className="p-3">{member.theme ?? 'system'}</td>
                  <td className="p-3">{member.newsletter_opt_in ? 'Yes' : 'No'}</td>
                  <td className="p-3 text-foreground/70">
                    {member.last_logged_in
                      ? new Date(member.last_logged_in).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-2"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span
            className="text-sm text-foreground/70"
          >
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
