'use client';

import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import type { AdminMemberStatusFilter } from '@/types/adminMember';

interface MemberSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: AdminMemberStatusFilter;
  onFilterChange: (value: AdminMemberStatusFilter) => void;
  includeUnderReview?: boolean;
}

export default function MemberSearchFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  includeUnderReview = false,
}: MemberSearchFiltersProps) {
  return (
    <div
      className="mb-6 flex flex-col gap-4 rounded-lg border border-border-color bg-background-light p-4 sm:flex-row sm:items-center"
    >
      <div
        className="flex-1"
      >
        <Input
          type="text"
          placeholder="Search by name, email, or nickname..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div
        className="flex items-center gap-2"
      >
        <label
          className="text-sm text-foreground/60"
        >
          Status:
        </label>
        <Select
          value={filter}
          onValueChange={(value) => onFilterChange(value as AdminMemberStatusFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            ...(includeUnderReview
              ? [{ value: 'under_review', label: 'Under review' }]
              : []),
            { value: 'suspended', label: 'Suspended' },
          ]}
          fullWidth={false}
          className="min-w-[140px]"
        />
      </div>
    </div>
  );
}
