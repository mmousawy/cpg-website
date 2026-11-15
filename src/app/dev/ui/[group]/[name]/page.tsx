import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isStoryboardDev } from '@/dev/ui/isStoryboardDev';
import StoryboardCanvas from '@/dev/ui/StoryboardCanvas';
import { resolveStoryboardSlug } from '@/dev/ui/resolveStoryboardSlug';
import StoryboardSubcategoryCanvas from '@/dev/ui/StoryboardSubcategoryCanvas';
import { getCatalogEntry, getUiGroupById } from '@/dev/ui/registry';

type PageProps = {
  params: Promise<{ group: string; name: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { group, name: slug } = await params;
  return {
    title: `${slug} — Storyboard`,
    robots: { index: false, follow: false },
  };
}

export default async function DevUiStoryPage({ params }: PageProps) {
  if (!isStoryboardDev()) {
    notFound();
  }

  const { group: groupId, name: slug } = await params;

  const group = getUiGroupById(groupId);
  if (!group) {
    notFound();
  }

  const resolved = resolveStoryboardSlug(groupId, slug, getCatalogEntry);
  if (!resolved) {
    notFound();
  }

  if (resolved.kind === 'redirect-to-subcategory') {
    redirect(`/dev/ui/${groupId}/${resolved.subcategoryId}#${resolved.hash}`);
  }

  if (resolved.kind === 'subcategory') {
    const entries = resolved.subcategory.componentNames
      .map((componentName) => getCatalogEntry(groupId, componentName))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return (
      <StoryboardSubcategoryCanvas
        groupId={groupId}
        groupLabel={group.label}
        subcategory={resolved.subcategory}
        entries={entries}
      />
    );
  }

  return (
    <StoryboardCanvas
      groupId={groupId}
      groupLabel={group.label}
      entry={resolved.entry}
    />
  );
}
