import { redirect } from 'next/navigation';

// Redirect old album URLs to new structure
export default async function OldAlbumRedirect({
  params,
}: {
  params: Promise<{ nickname: string; albumSlug: string }>;
}) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  redirect(`/@${nickname}/album/${albumSlug}`);
}
