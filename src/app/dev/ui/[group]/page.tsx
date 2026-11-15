import { notFound, redirect } from 'next/navigation';

import { isStoryboardDev } from '@/dev/ui/isStoryboardDev';
import { getUiGroupById } from '@/dev/ui/registry';
import { getFirstStoryboardPathForGroup } from '@/dev/ui/subcategories';

type PageProps = {
  params: Promise<{ group: string }>;
};

/** `/dev/ui/{group}` opens the first component in that folder (alphabetical). */
export default async function DevUiGroupRedirectPage({ params }: PageProps) {
  if (!isStoryboardDev()) {
    notFound();
  }

  const { group: groupId } = await params;
  const group = getUiGroupById(groupId);
  if (!group || group.entries.length === 0) {
    notFound();
  }

  const subPath = getFirstStoryboardPathForGroup(groupId);
  if (subPath) {
    redirect(subPath);
  }

  const first = [...group.entries].sort((a, b) => a.name.localeCompare(b.name))[0];
  redirect(`/dev/ui/${groupId}/${first.name}`);
}
