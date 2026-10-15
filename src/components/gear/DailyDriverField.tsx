'use client';

import { useCallback, useMemo } from 'react';

import AutocompleteInput from '@/components/shared/AutocompleteInput';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import { resolveGearLabelCasing } from '@/lib/gear/canonicalGearItem';
import GearCategoryIconBadge from '@/components/gear/GearCategoryIconBadge';
import type { GearCategory } from '@/lib/gear/types';

export type DailyDriverFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  category: GearCategory;
  value: string;
  onCommit: (text: string, catalogId: string | null) => void;
  peerItems: Array<{ name: string; category: GearCategory; catalogId: string | null }>;
};

export default function DailyDriverField({
  id,
  label,
  placeholder,
  category,
  value,
  onCommit,
  peerItems,
}: DailyDriverFieldProps) {
  const { results, loading } = useGearCatalogSearch(value, category);
  const suggestions = useMemo(() => results.map((r) => r.name), [results]);
  const commitValue = useCallback(
    (text: string, catalogId: string | null, catalogLabel?: string | null) => {
      const resolved = resolveGearLabelCasing({
        text,
        category,
        catalogId,
        catalogLabel,
        peerItems,
      });
      onCommit(resolved.name, resolved.catalogId);
    },
    [category, onCommit, peerItems],
  );

  return (
    <div
      className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
    >
      <label
        className="flex shrink-0 items-center gap-2 text-sm font-medium md:w-40 lg:w-44"
        htmlFor={id}
      >
        <GearCategoryIconBadge
          category={category}
        />
        <span
          className="min-w-0"
        >
          {label}
        </span>
      </label>
      <AutocompleteInput
        id={id}
        value={value}
        onChange={(v) => {
          onCommit(v, null);
        }}
        suggestions={suggestions}
        disableFilter
        loading={loading}
        placeholder={placeholder}
        containerClassName="w-full min-w-0 md:flex-1"
        onSelect={(s) => {
          const hit = results.find((r) => r.name === s)
            ?? results.find((r) => r.name.toLowerCase() === s.toLowerCase());
          commitValue(hit?.name ?? s, hit?.id ?? null, hit?.name);
        }}
        onSubmit={(text) => {
          const hit = results.find((r) => r.name.toLowerCase() === text.toLowerCase());
          commitValue(text, hit?.id ?? null, hit?.name);
        }}
      />
    </div>
  );
}
