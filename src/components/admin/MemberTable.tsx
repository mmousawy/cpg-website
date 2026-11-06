'use client';

import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Select from '@/components/shared/Select';
import type { AdminMember, AdminMemberStatusFilter } from '@/types/adminMember';
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';

import GavelSVG from 'public/icons/gavel.svg';
import TrashMiniSVG from 'public/icons/trash-mini.svg';
import UndoSVG from 'public/icons/undo.svg';

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, AdminMember>();

const PAGE_SIZE_OPTIONS = [
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
  { value: 'all', label: 'All' },
];

const SORT_FIELD_OPTIONS = [
  { value: 'created_at', label: 'Joined' },
  { value: 'last_logged_in', label: 'Last active' },
  { value: 'member', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'nickname', label: 'Nickname' },
  { value: 'status', label: 'Status' },
  { value: 'photos', label: 'Photos' },
  { value: 'views', label: 'Views' },
  { value: 'followers', label: 'Followers' },
];

interface MemberTableProps {
  members: AdminMember[];
  isLoading: boolean;
  search: string;
  filter: AdminMemberStatusFilter;
  onSuspend: (member: AdminMember) => void;
  onUnsuspend: (member: AdminMember) => void;
  onDelete: (member: AdminMember) => void;
  onCancelDeletion: (member: AdminMember) => void;
  actionLoading: string | null;
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) {
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
  return sorted === 'asc' ? (
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
  const date = new Date(dateString);
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    year: isCurrentYear ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCount(n: number) {
  return n.toLocaleString();
}

function truncate(text: string, max = 80) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function hrefFor(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function parseSocialLinks(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  const links: { label: string; url: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.url !== 'string' || !rec.url.trim()) continue;
    const url = rec.url.trim();
    const label = typeof rec.label === 'string' && rec.label.trim() ? rec.label.trim() : url;
    links.push({ label, url });
  }
  return links;
}

function rowTone(member: AdminMember) {
  if (member.deletion_scheduled_at) return 'bg-amber-500/5 hover:bg-amber-500/10';
  if (member.suspended_at) return 'bg-red-500/5 hover:bg-red-500/10';
  if (member.under_review_at) return 'bg-sky-500/5 hover:bg-sky-500/10';
  return 'bg-background-light hover:bg-background/50';
}

function memberStatusRank(member: AdminMember) {
  if (member.deletion_scheduled_at) return 3;
  if (member.suspended_at) return 2;
  if (member.under_review_at) return 1;
  return 0;
}

function matchesStatus(member: AdminMember, filter: AdminMemberStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'suspended') return Boolean(member.suspended_at);
  if (filter === 'under_review') return Boolean(member.under_review_at) && !member.suspended_at;
  return !member.suspended_at;
}

function matchesSearch(member: AdminMember, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const socials = parseSocialLinks(member.social_links)
    .map((link) => `${link.label} ${link.url}`)
    .join(' ');
  const haystack = [
    member.full_name,
    member.email,
    member.nickname,
    member.website,
    member.bio,
    member.suspended_reason,
    member.signup_signal?.ip_address,
    member.signup_signal?.user_agent,
    member.signup_signal?.accept_language,
    socials,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function stickyClass(id: string, kind: 'header' | 'cell') {
  const base = kind === 'header' ? 'md:bg-background' : 'md:bg-background-light';
  if (id === 'member') {
    return `md:sticky md:left-0 md:z-20 ${base} md:shadow-[4px_0_8px_rgba(0,0,0,0.25)]`;
  }
  if (id === 'actions') {
    return `md:sticky md:right-0 md:z-20 ${base} md:shadow-[-4px_0_8px_rgba(0,0,0,0.25)]`;
  }
  return '';
}

function StatusCell({ member }: { member: AdminMember }) {
  if (member.deletion_scheduled_at) {
    const d = new Date(new Date(member.deletion_scheduled_at).getTime() + 30 * 24 * 60 * 60 * 1000);
    return (
      <div>
        <span
          className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-600"
        >
          Deletion scheduled
        </span>
        <p
          className="mt-1 text-xs text-foreground/50"
          title={`Scheduled on ${new Date(member.deletion_scheduled_at).toLocaleDateString()}`}
        >
          {d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
          })}
        </p>
      </div>
    );
  }
  if (member.suspended_at) {
    return (
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
    );
  }
  if (member.under_review_at) {
    return (
      <div>
        <span
          className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-600"
        >
          Under review
        </span>
        <p
          className="mt-1 text-xs text-foreground/50"
        >
          {formatDate(member.under_review_at)}
        </p>
      </div>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-500"
    >
      Active
    </span>
  );
}

function LinksCell({ member }: { member: AdminMember }) {
  const socials = parseSocialLinks(member.social_links);
  if (!member.website && socials.length === 0 && !member.bio) {
    return (
      <span
        className="text-foreground/50"
      >
        —
      </span>
    );
  }
  return (
    <div
      className="space-y-1"
    >
      {member.website && (
        <a
          href={hrefFor(member.website)}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-primary hover:underline"
          title={member.website}
        >
          {member.website.replace(/^https?:\/\//i, '')}
        </a>
      )}
      {socials.length > 0 && (
        <div
          className="flex flex-wrap gap-x-2 gap-y-0.5"
        >
          {socials.map((link) => (
            <a
              key={link.url}
              href={hrefFor(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
              title={link.url}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      {member.bio && (
        <p
          className="text-xs text-foreground/60"
          title={member.bio}
        >
          {truncate(member.bio)}
        </p>
      )}
    </div>
  );
}

function SignupCell({ member }: { member: AdminMember }) {
  const signal = member.signup_signal;
  if (!signal) {
    return (
      <span
        className="text-foreground/50"
      >
        —
      </span>
    );
  }
  return (
    <div
      className="space-y-0.5"
    >
      <p
        className="font-mono text-xs"
      >
        {signal.ip_address || '—'}
      </p>
      {signal.accept_language && (
        <p
          className="truncate text-xs text-foreground/60"
          title={signal.accept_language}
        >
          {signal.accept_language}
        </p>
      )}
      {signal.user_agent && (
        <p
          className="truncate text-xs text-foreground/50"
          title={signal.user_agent}
        >
          {truncate(signal.user_agent, 48)}
        </p>
      )}
    </div>
  );
}

function ActionIconButton({
  label,
  disabledReason,
  disabled,
  onClick,
  tone,
  showLabel,
  icon,
}: {
  label: string;
  disabledReason?: string;
  disabled?: boolean;
  onClick: () => void;
  tone: 'suspend' | 'unsuspend' | 'delete' | 'cancel';
  showLabel?: boolean;
  icon: ReactNode;
}) {
  const tooltip = disabledReason ?? label;
  const toneClass = {
    suspend: 'text-yellow-600 hover:bg-yellow-500/15 hover:text-yellow-600',
    unsuspend: 'text-amber-600 hover:bg-amber-500/15 hover:text-amber-600',
    delete: 'text-red-500 hover:bg-red-500/15 hover:text-red-500',
    cancel: 'text-amber-600 hover:bg-amber-500/15 hover:text-amber-600',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      title={tooltip}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50',
        showLabel ? 'gap-1.5 px-3 py-1.5 text-xs font-medium' : 'size-8',
        toneClass,
      )}
    >
      {icon}
      {showLabel ? label : (
        <span
          className="sr-only"
        >
          {label}
        </span>
      )}
    </button>
  );
}

function ActionsCell({
  member,
  actionLoading,
  onSuspend,
  onUnsuspend,
  onDelete,
  onCancelDeletion,
  className,
  showLabels = false,
}: {
  member: AdminMember;
  actionLoading: string | null;
  onSuspend: (member: AdminMember) => void;
  onUnsuspend: (member: AdminMember) => void;
  onDelete: (member: AdminMember) => void;
  onCancelDeletion: (member: AdminMember) => void;
  className?: string;
  showLabels?: boolean;
}) {
  const busy = actionLoading === member.id;

  return (
    <div
      className={clsx('flex items-center gap-1', className ?? 'justify-end')}
    >
      {member.deletion_scheduled_at ? (
        <ActionIconButton
          label="Cancel deletion"
          disabled={busy}
          onClick={() => onCancelDeletion(member)}
          tone="cancel"
          showLabel={showLabels}
          icon={(
            <UndoSVG
              className="size-4 fill-current"
              aria-hidden
            />
          )}
        />
      ) : (
        <>
          {member.suspended_at ? (
            <ActionIconButton
              label="Unsuspend"
              disabled={busy}
              onClick={() => onUnsuspend(member)}
              tone="unsuspend"
              showLabel={showLabels}
              icon={(
                <UndoSVG
                  className="size-4 fill-current"
                  aria-hidden
                />
              )}
            />
          ) : (
            <ActionIconButton
              label="Suspend"
              disabledReason={member.is_admin ? 'Cannot suspend admins' : undefined}
              disabled={busy || member.is_admin === true}
              onClick={() => onSuspend(member)}
              tone="suspend"
              showLabel={showLabels}
              icon={(
                <GavelSVG
                  className="size-4 fill-current"
                  aria-hidden
                />
              )}
            />
          )}
          <ActionIconButton
            label="Delete"
            disabledReason={member.is_admin ? 'Cannot delete admins' : undefined}
            disabled={busy || member.is_admin === true}
            onClick={() => onDelete(member)}
            tone="delete"
            showLabel={showLabels}
            icon={(
              <TrashMiniSVG
                className="size-4 fill-current"
                aria-hidden
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function MemberCard({
  member,
  actionLoading,
  onSuspend,
  onUnsuspend,
  onDelete,
  onCancelDeletion,
}: {
  member: AdminMember;
  actionLoading: string | null;
  onSuspend: (member: AdminMember) => void;
  onUnsuspend: (member: AdminMember) => void;
  onDelete: (member: AdminMember) => void;
  onCancelDeletion: (member: AdminMember) => void;
}) {
  const socials = parseSocialLinks(member.social_links);
  const signal = member.signup_signal;

  return (
    <article
      className={clsx('rounded-lg border border-border-color p-4', rowTone(member))}
    >
      <div
        className="flex items-start gap-3"
      >
        <Avatar
          avatarUrl={member.avatar_url}
          fullName={member.full_name || member.email || undefined}
          size="sm"
        />
        <div
          className="min-w-0 flex-1"
        >
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
          {member.nickname ? (
            <Link
              href={`/@${member.nickname}`}
              className="text-sm text-primary hover:underline"
              target="_blank"
            >
              @
              {member.nickname}
            </Link>
          ) : null}
          <div
            className="mt-2"
          >
            <StatusCell
              member={member}
            />
          </div>
        </div>
      </div>

      <dl
        className="mt-3 space-y-1.5 text-sm"
      >
        <div
          className="break-all text-foreground/80"
        >
          {member.email || '—'}
        </div>
        {member.website && (
          <a
            href={hrefFor(member.website)}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-primary hover:underline"
          >
            {member.website.replace(/^https?:\/\//i, '')}
          </a>
        )}
        {socials.length > 0 && (
          <div
            className="flex flex-wrap gap-x-2 gap-y-0.5"
          >
            {socials.map((link) => (
              <a
                key={link.url}
                href={hrefFor(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        {member.bio && (
          <p
            className="text-xs text-foreground/60"
          >
            {truncate(member.bio)}
          </p>
        )}
        {signal?.ip_address && (
          <p
            className="font-mono text-xs text-foreground/70"
          >
            {signal.ip_address}
          </p>
        )}
        <p
          className="text-xs text-foreground/50"
        >
          Joined
          {' '}
          {formatDate(member.created_at)}
          {' · '}
          Active
          {' '}
          {formatDate(member.last_logged_in)}
        </p>
        <p
          className="text-xs text-foreground/50"
        >
          {formatCount(member.activity.photo_count)}
          {' photos · '}
          {formatCount(member.activity.album_count)}
          {' albums · '}
          {formatCount(member.activity.views_received)}
          {' views · '}
          {formatCount(member.activity.followers)}
          {' followers'}
        </p>
      </dl>

      <div
        className="mt-3"
      >
        <ActionsCell
          member={member}
          actionLoading={actionLoading}
          onSuspend={onSuspend}
          onUnsuspend={onUnsuspend}
          onDelete={onDelete}
          onCancelDeletion={onCancelDeletion}
          showLabels
        />
      </div>
    </article>
  );
}

export default function MemberTable({
  members,
  isLoading,
  search,
  filter,
  onSuspend,
  onUnsuspend,
  onDelete,
  onCancelDeletion,
  actionLoading,
}: MemberTableProps) {
  const data = useMemo(
    () => members.filter((member) => matchesStatus(member, filter) && matchesSearch(member, search)),
    [members, filter, search],
  );

  const columns = useMemo(
    () => helper.columns([
      helper.accessor((row) => row.full_name ?? '', {
        id: 'member',
        header: 'Member',
        sortFn: sortFn_alphanumeric,
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div
              className="flex items-center gap-3"
            >
              <Avatar
                avatarUrl={member.avatar_url}
                fullName={member.full_name || member.email || undefined}
                size="sm"
              />
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
          );
        },
      }),
      helper.accessor((row) => row.email ?? '', {
        id: 'email',
        header: 'Email',
        sortFn: sortFn_alphanumeric,
        cell: ({ getValue }) => getValue() || '—',
      }),
      helper.accessor((row) => row.nickname ?? '', {
        id: 'nickname',
        header: 'Nickname',
        sortFn: sortFn_alphanumeric,
        cell: ({ row }) => (row.original.nickname ? (
          <Link
            href={`/@${row.original.nickname}`}
            className="text-primary hover:underline"
            target="_blank"
          >
            @
            {row.original.nickname}
          </Link>
        ) : (
          <span
            className="text-foreground/50"
          >
            —
          </span>
        )),
      }),
      helper.accessor('created_at', {
        header: 'Joined',
        sortFn: sortFn_datetime,
        sortDescFirst: true,
        cell: ({ getValue }) => formatDate(getValue()),
      }),
      helper.accessor((row) => row.last_logged_in, {
        id: 'last_logged_in',
        header: 'Last Active',
        sortFn: sortFn_datetime,
        sortUndefined: 'last',
        sortDescFirst: true,
        cell: ({ getValue }) => formatDate(getValue()),
      }),
      helper.accessor((row) => memberStatusRank(row), {
        id: 'status',
        header: 'Status',
        sortFn: sortFn_basic,
        cell: ({ row }) => (
          <StatusCell
            member={row.original}
          />
        ),
      }),
      helper.accessor((row) => row.website ?? '', {
        id: 'links',
        header: 'Links',
        sortFn: sortFn_alphanumeric,
        cell: ({ row }) => (
          <LinksCell
            member={row.original}
          />
        ),
      }),
      helper.accessor((row) => row.signup_signal?.ip_address ?? '', {
        id: 'signup',
        header: 'Signup',
        sortFn: sortFn_alphanumeric,
        cell: ({ row }) => (
          <SignupCell
            member={row.original}
          />
        ),
      }),
      helper.accessor((row) => row.activity.photo_count, {
        id: 'photos',
        header: 'Photos',
        sortFn: sortFn_basic,
        sortDescFirst: true,
        cell: ({ getValue }) => formatCount(getValue()),
      }),
      helper.accessor((row) => row.activity.album_count, {
        id: 'albums',
        header: 'Albums',
        sortFn: sortFn_basic,
        sortDescFirst: true,
        cell: ({ getValue }) => formatCount(getValue()),
      }),
      helper.accessor((row) => row.activity.views_received, {
        id: 'views',
        header: 'Views',
        sortFn: sortFn_basic,
        sortDescFirst: true,
        cell: ({ getValue }) => formatCount(getValue()),
      }),
      helper.accessor((row) => row.activity.followers, {
        id: 'followers',
        header: 'Followers',
        sortFn: sortFn_basic,
        sortDescFirst: true,
        cell: ({ getValue }) => formatCount(getValue()),
      }),
      helper.accessor((row) => (row.newsletter_opt_in ? 1 : 0), {
        id: 'newsletter',
        header: 'Newsletter',
        sortFn: sortFn_basic,
        cell: ({ row }) => (row.original.newsletter_opt_in ? 'Yes' : 'No'),
      }),
      helper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <ActionsCell
            member={row.original}
            actionLoading={actionLoading}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
            onDelete={onDelete}
            onCancelDeletion={onCancelDeletion}
          />
        ),
      }),
    ]),
    [actionLoading, onCancelDeletion, onDelete, onSuspend, onUnsuspend],
  );

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    enableSortingRemoval: false,
    autoResetPageIndex: true,
    initialState: {
      sorting: [{ id: 'created_at', desc: true }],
      pagination: { pageIndex: 0, pageSize: 50 },
    },
  });

  const pageCount = table.getPageCount();
  const pagination = table.state.pagination;
  const sorting = table.state.sorting[0] ?? { id: 'created_at', desc: true };
  const pageSizeValue = Number.isFinite(pagination.pageSize) ? String(pagination.pageSize) : 'all';
  const filteredCount = table.getPrePaginatedRowModel().rows.length;
  const from = filteredCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(filteredCount, pagination.pageIndex * pagination.pageSize + table.getRowModel().rows.length);
  const rows = table.getRowModel().rows;

  return (
    <>
      {isLoading ? (
        <div
          className="flex items-center justify-center rounded-lg border border-border-color bg-background-light py-12"
        >
          <LoadingSpinner />
        </div>
      ) : filteredCount === 0 ? (
        <div
          className="rounded-lg border border-border-color bg-background-light py-12 text-center text-foreground/60"
        >
          No members found
        </div>
      ) : (
        <>
          <div
            className="mb-3 flex items-center gap-2 md:hidden"
          >
            <Select
              value={sorting.id}
              onValueChange={(id) => table.setSorting([{ id, desc: sorting.desc }])}
              options={SORT_FIELD_OPTIONS}
              fullWidth
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => table.setSorting([{ id: sorting.id, desc: !sorting.desc }])}
            >
              {sorting.desc ? 'Desc' : 'Asc'}
            </Button>
          </div>

          <div
            className="space-y-3 md:hidden"
          >
            {rows.map((row) => (
              <MemberCard
                key={row.id}
                member={row.original}
                actionLoading={actionLoading}
                onSuspend={onSuspend}
                onUnsuspend={onUnsuspend}
                onDelete={onDelete}
                onCancelDeletion={onCancelDeletion}
              />
            ))}
          </div>

          <div
            className="hidden overflow-x-auto rounded-lg border border-border-color bg-background-light md:block"
          >
            <table
              className="w-max min-w-full text-left text-sm"
            >
              <thead
                className="border-b border-border-color bg-background text-xs uppercase text-foreground/60 [&_th]:whitespace-nowrap"
              >
                {table.getHeaderGroups().map((group) => (
                  <tr
                    key={group.id}
                  >
                    {group.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`px-4 py-3 ${canSort ? 'cursor-pointer hover:text-foreground' : ''} ${header.id === 'actions' ? 'text-right' : ''} ${stickyClass(header.id, 'header')}`}
                          aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div
                            className={`flex items-center ${header.id === 'actions' ? 'justify-end' : ''}`}
                          >
                            <table.FlexRender
                              header={header}
                            />
                            {canSort && (
                              <SortIcon
                                sorted={sorted}
                              />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody
                className="divide-y divide-border-color"
              >
                {table.getRowModel().rows.map((row) => {
                  const member = row.original;
                  return (
                    <tr
                      key={row.id}
                      className={rowTone(member)}
                    >
                      {row.getAllCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 ${cell.column.id === 'member' || cell.column.id === 'email' || cell.column.id === 'nickname' || cell.column.id === 'created_at' || cell.column.id === 'last_logged_in' || cell.column.id === 'status' || cell.column.id === 'newsletter' || cell.column.id === 'actions' ? 'whitespace-nowrap' : ''} ${cell.column.id === 'photos' || cell.column.id === 'albums' || cell.column.id === 'views' || cell.column.id === 'followers' ? 'whitespace-nowrap tabular-nums' : ''} ${cell.column.id === 'links' ? 'min-w-[16rem] max-w-[20rem]' : ''} ${cell.column.id === 'signup' ? 'min-w-[14rem] max-w-[18rem]' : ''} ${cell.column.id === 'email' ? 'text-foreground/80' : ''} ${cell.column.id === 'created_at' || cell.column.id === 'last_logged_in' ? 'text-foreground/80' : ''} ${cell.column.id === 'actions' ? 'text-right' : ''} ${stickyClass(cell.column.id, 'cell')}`}
                        >
                          <table.FlexRender
                            cell={cell}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p
          className="text-sm text-foreground/60"
        >
          {filteredCount === 0
            ? 'No members to show'
            : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${filteredCount.toLocaleString()}`}
          {filteredCount !== members.length ? ` (filtered from ${members.length.toLocaleString()})` : ''}
        </p>
        <div
          className="flex flex-wrap items-center gap-2"
        >
          <Select
            value={pageSizeValue}
            onValueChange={(value) => {
              table.setPageSize(value === 'all' ? Number.POSITIVE_INFINITY : Number(value));
            }}
            options={PAGE_SIZE_OPTIONS}
            fullWidth={false}
            className="min-w-[120px]"
          />
          {pageCount > 1 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <span
                className="text-sm text-foreground/60"
              >
                Page
                {' '}
                {pagination.pageIndex + 1}
                {' '}
                of
                {' '}
                {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
