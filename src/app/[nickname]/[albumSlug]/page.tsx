import { redirect } from 'next/navigation';

// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ nickname: 'sample', albumSlug: 'sample' }];
}

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
