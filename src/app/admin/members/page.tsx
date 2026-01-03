'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

import Button from '@/components/shared/Button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

type Member = {
  id: string
  email: string | null
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  is_admin: boolean | null
  created_at: string | null
  last_logged_in: string | null
  suspended_at: string | null
  suspended_reason: string | null
}

type SortField = 'email' | 'full_name' | 'nickname' | 'created_at' | 'last_logged_in' | 'suspended_at'

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'suspend' | 'delete' | 'unsuspend'; member: Member } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        search,
        filter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '50',
      })

      const response = await fetch(`/api/admin/members?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members')
      }

      setMembers(data.members)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [search, filter, sortBy, sortOrder, page])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleAction = async (action: 'suspend' | 'unsuspend' | 'delete', member: Member) => {
    setActionLoading(member.id)

    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/members?userId=${member.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete user')
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
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to ${action} user`)
        }
      }

      // Refresh the list
      await fetchMembers()
      setConfirmDialog(null)
      setSuspendReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return (
        <svg className="ml-1 h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'asc' ? (
      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="bg-background px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Members</h1>
          <p className="text-sm text-foreground/60">{total} total members</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border-color bg-background-light p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or nickname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-color bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/60">Status:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'all' | 'active' | 'suspended')
              setPage(1)
            }}
            className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm font-[family-name:var(--font-geist-sans)] focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-color bg-background-light">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-foreground/60">
            No members found
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-color bg-background text-xs uppercase text-foreground/60">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Email
                    <SortIcon field="email" />
                  </div>
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => handleSort('nickname')}
                >
                  <div className="flex items-center">
                    Nickname
                    <SortIcon field="nickname" />
                  </div>
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Joined
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => handleSort('last_logged_in')}
                >
                  <div className="flex items-center">
                    Last Active
                    <SortIcon field="last_logged_in" />
                  </div>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {members.map((member) => (
                <tr 
                  key={member.id} 
                  className={clsx(
                    'hover:bg-background/50',
                    member.suspended_at && 'bg-red-500/5'
                  )}
                >
                  {/* Avatar + Name */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-primary/20">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                            {(member.full_name || member.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {member.full_name || '(No name)'}
                          {member.is_admin && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/50">ID: {member.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/80">
                    {member.email || '—'}
                  </td>

                  {/* Nickname */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {member.nickname ? (
                      <Link 
                        href={`/@${member.nickname}`}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        @{member.nickname}
                      </Link>
                    ) : (
                      <span className="text-foreground/50">—</span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/70">
                    {formatDate(member.created_at)}
                  </td>

                  {/* Last Active */}
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/70">
                    {formatDate(member.last_logged_in)}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {member.suspended_at ? (
                      <div>
                        <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-500">
                          Suspended
                        </span>
                        {member.suspended_reason && (
                          <p className="mt-1 max-w-[200px] truncate text-xs text-foreground/50" title={member.suspended_reason}>
                            {member.suspended_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-500">
                        Active
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {member.suspended_at ? (
                        <button
                          onClick={() => setConfirmDialog({ type: 'unsuspend', member })}
                          disabled={actionLoading === member.id}
                          className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDialog({ type: 'suspend', member })}
                          disabled={actionLoading === member.id || member.is_admin === true}
                          className="rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-500/20 disabled:opacity-50"
                          title={member.is_admin ? 'Cannot suspend admins' : undefined}
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDialog({ type: 'delete', member })}
                        disabled={actionLoading === member.id || member.is_admin === true}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                        title={member.is_admin ? 'Cannot delete admins' : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-foreground/60">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border-color bg-background-light p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {confirmDialog.type === 'delete' && 'Delete Member'}
              {confirmDialog.type === 'suspend' && 'Suspend Member'}
              {confirmDialog.type === 'unsuspend' && 'Unsuspend Member'}
            </h3>

            <p className="mb-4 text-foreground/70">
              {confirmDialog.type === 'delete' && (
                <>
                  Are you sure you want to permanently delete{' '}
                  <strong>{confirmDialog.member.full_name || confirmDialog.member.email}</strong>?
                  This action cannot be undone.
                </>
              )}
              {confirmDialog.type === 'suspend' && (
                <>
                  Are you sure you want to suspend{' '}
                  <strong>{confirmDialog.member.full_name || confirmDialog.member.email}</strong>?
                  They will not be able to access their account.
                </>
              )}
              {confirmDialog.type === 'unsuspend' && (
                <>
                  Are you sure you want to unsuspend{' '}
                  <strong>{confirmDialog.member.full_name || confirmDialog.member.email}</strong>?
                  They will regain access to their account.
                </>
              )}
            </p>

            {confirmDialog.type === 'suspend' && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  Reason (optional)
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter a reason for suspension..."
                  className="w-full rounded-lg border border-border-color bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmDialog(null)
                  setSuspendReason('')
                }}
                disabled={actionLoading === confirmDialog.member.id}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.type === 'delete' ? 'danger' : 'primary'}
                onClick={() => handleAction(confirmDialog.type, confirmDialog.member)}
                loading={actionLoading === confirmDialog.member.id}
              >
                {confirmDialog.type === 'delete' && 'Delete'}
                {confirmDialog.type === 'suspend' && 'Suspend'}
                {confirmDialog.type === 'unsuspend' && 'Unsuspend'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

