'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import type { Tables } from '@/database.types';
import Button from '@/components/shared/Button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

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

interface MemberTableProps {
  members: Member[];
  isLoading: boolean;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onSuspend: (member: Member) => void;
  onUnsuspend: (member: Member) => void;
  onDelete: (member: Member) => void;
  actionLoading: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field) {
    return (
      <svg
        className="ml-1 h-4 w-4 opacity-30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }
  return sortOrder === 'asc' ? (
    <svg
      className="ml-1 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  ) : (
    <svg
      className="ml-1 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MemberTable({
  members,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onSuspend,
  onUnsuspend,
  onDelete,
  actionLoading,
  page,
  totalPages,
  onPageChange,
}: MemberTableProps) {
  return (
    <>
      {/* Table */}
      <div
        className="overflow-x-auto rounded-lg border border-border-color bg-background-light"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12"
          >
            <LoadingSpinner />
          </div>
        ) : members.length === 0 ? (
          <div
            className="py-12 text-center text-foreground/60"
          >
            No members found
          </div>
        ) : (
          <table
            className="w-full text-left text-sm"
          >
            <thead
              className="border-b border-border-color bg-background text-xs uppercase text-foreground/60"
            >
              <tr>
                <th
                  className="px-4 py-3"
                >
                  Member
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => onSort('email')}
                >
                  <div
                    className="flex items-center"
                  >
                    Email
                    <SortIcon
                      field="email"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => onSort('nickname')}
                >
                  <div
                    className="flex items-center"
                  >
                    Nickname
                    <SortIcon
                      field="nickname"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => onSort('created_at')}
                >
                  <div
                    className="flex items-center"
                  >
                    Joined
                    <SortIcon
                      field="created_at"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-foreground"
                  onClick={() => onSort('last_logged_in')}
                >
                  <div
                    className="flex items-center"
                  >
                    Last Active
                    <SortIcon
                      field="last_logged_in"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3"
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-right"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y divide-border-color"
            >
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={clsx('hover:bg-background/50', member.suspended_at && 'bg-red-500/5')}
                >
                  {/* Avatar + Name */}
                  <td
                    className="whitespace-nowrap px-4 py-3"
                  >
                    <div
                      className="flex items-center gap-3"
                    >
                      <div
                        className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-primary/20"
                      >
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-sm font-bold text-primary"
                          >
                            {(member.full_name || member.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div
                          className="font-medium"
                        >
                          {member.full_name || '(No name)'}
                          {member.is_admin && (
                            <span
                              className="ml-2 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs text-foreground/50"
                        >
                          ID:
                          {member.id.slice(0, 8)}
                          ...
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td
                    className="whitespace-nowrap px-4 py-3 text-foreground/80"
                  >
                    {member.email || '—'}
                  </td>

                  {/* Nickname */}
                  <td
                    className="whitespace-nowrap px-4 py-3"
                  >
                    {member.nickname ? (
                      <Link
                        href={`/@${member.nickname}`}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        @
                        {member.nickname}
                      </Link>
                    ) : (
                      <span
                        className="text-foreground/50"
                      >
                        —
                      </span>
                    )}
                  </td>

                  {/* Joined */}
                  <td
                    className="whitespace-nowrap px-4 py-3 text-foreground/70"
                  >
                    {formatDate(member.created_at)}
                  </td>

                  {/* Last Active */}
                  <td
                    className="whitespace-nowrap px-4 py-3 text-foreground/70"
                  >
                    {formatDate(member.last_logged_in)}
                  </td>

                  {/* Status */}
                  <td
                    className="whitespace-nowrap px-4 py-3"
                  >
                    {member.suspended_at ? (
                      <div>
                        <span
                          className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-500"
                        >
                          Suspended
                        </span>
                        {member.suspended_reason && (
                          <p
                            className="mt-1 max-w-[200px] truncate text-xs text-foreground/50"
                            title={member.suspended_reason}
                          >
                            {member.suspended_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-500"
                      >
                        Active
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="whitespace-nowrap px-4 py-3 text-right"
                  >
                    <div
                      className="flex items-center justify-end gap-2"
                    >
                      {member.suspended_at ? (
                        <button
                          onClick={() => onUnsuspend(member)}
                          disabled={actionLoading === member.id}
                          className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => onSuspend(member)}
                          disabled={actionLoading === member.id || member.is_admin === true}
                          className="rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-500/20 disabled:opacity-50"
                          title={member.is_admin ? 'Cannot suspend admins' : undefined}
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(member)}
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
        <div
          className="mt-4 flex items-center justify-between"
        >
          <p
            className="text-sm text-foreground/60"
          >
            Page
            {' '}
            {page}
            {' '}
            of
            {' '}
            {totalPages}
          </p>
          <div
            className="flex gap-2"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
