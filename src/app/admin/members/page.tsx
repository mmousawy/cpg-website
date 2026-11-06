'use client';

import MemberConfirmDialog from '@/components/admin/MemberConfirmDialog';
import MemberSearchFilters from '@/components/admin/MemberSearchFilters';
import MemberTable from '@/components/admin/MemberTable';
import { pagePadding } from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import type { AdminMember, AdminMemberStatusFilter } from '@/types/adminMember';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';

const FETCH_PAGE_SIZE = 200;

async function fetchAllMembers(): Promise<AdminMember[]> {
  const all: AdminMember[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: FETCH_PAGE_SIZE.toString(),
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    const response = await fetch(`/api/admin/members?${params}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch members');
    }
    all.push(...(data.members as AdminMember[]));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminMemberStatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'suspend' | 'delete' | 'unsuspend' | 'cancel-deletion';
    member: AdminMember;
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchMembers = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchAllMembers();
      setMembers(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleAction = async (action: 'suspend' | 'unsuspend' | 'delete' | 'cancel-deletion', member: AdminMember) => {
    setActionLoading(member.id);

    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/members?userId=${member.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to schedule user deletion');
        }
      } else if (action === 'cancel-deletion') {
        const response = await fetch('/api/admin/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.id,
            action: 'cancel-deletion',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to cancel deletion');
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
      className={clsx('flex justify-center', pagePadding)}
    >
      <div
        className="w-full"
      >
        <PageHeading
          title="Manage members"
          description={`${members.length} total members`}
        />

        <MemberSearchFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          includeUnderReview
          onFilterChange={setFilter}
        />

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
          search={search}
          filter={filter}
          onSuspend={(member) => setConfirmDialog({ type: 'suspend', member })}
          onUnsuspend={(member) => setConfirmDialog({ type: 'unsuspend', member })}
          onDelete={(member) => setConfirmDialog({ type: 'delete', member })}
          onCancelDeletion={(member) => setConfirmDialog({ type: 'cancel-deletion', member })}
          actionLoading={actionLoading}
        />

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
    </div>
  );
}
