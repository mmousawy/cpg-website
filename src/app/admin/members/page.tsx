'use client';

import { useCallback, useEffect, useState } from 'react';
import MemberConfirmDialog from '@/components/admin/MemberConfirmDialog';
import MemberSearchFilters from '@/components/admin/MemberSearchFilters';
import MemberTable from '@/components/admin/MemberTable';
import type { Tables } from '@/database.types';

type Member = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'is_admin'
  | 'created_at'
  | 'last_logged_in'
  | 'suspended_at'
  | 'suspended_reason'
>;

type SortField = 'email' | 'full_name' | 'nickname' | 'created_at' | 'last_logged_in' | 'suspended_at';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'suspend' | 'delete' | 'unsuspend';
    member: Member;
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search,
        filter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '50',
      });

      const response = await fetch(`/api/admin/members?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members');
      }

      setMembers(data.members);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [search, filter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleAction = async (action: 'suspend' | 'unsuspend' | 'delete', member: Member) => {
    setActionLoading(member.id);

    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/members?userId=${member.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete user');
        }
      } else {
        const response = await fetch('/api/admin/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.id,
            action,
            reason: action === 'suspend' ? suspendReason : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${action} user`);
        }
      }

      // Refresh the list
      await fetchMembers();
      setConfirmDialog(null);
      setSuspendReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="bg-background px-2 py-8"
    >
      {/* Header */}
      <div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Manage members
          </h1>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            {total}
            {' '}
            total members
          </p>
        </div>
      </div>

      <MemberSearchFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />

      {/* Error message */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <MemberTable
        members={members}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onSuspend={(member) => setConfirmDialog({ type: 'suspend', member })}
        onUnsuspend={(member) => setConfirmDialog({ type: 'unsuspend', member })}
        onDelete={(member) => setConfirmDialog({ type: 'delete', member })}
        actionLoading={actionLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <MemberConfirmDialog
          type={confirmDialog.type}
          member={confirmDialog.member}
          suspendReason={suspendReason}
          onSuspendReasonChange={setSuspendReason}
          onConfirm={() => handleAction(confirmDialog.type, confirmDialog.member)}
          onCancel={() => {
            setConfirmDialog(null);
            setSuspendReason('');
          }}
          isLoading={actionLoading === confirmDialog.member.id}
        />
      )}
    </div>
  );
}
