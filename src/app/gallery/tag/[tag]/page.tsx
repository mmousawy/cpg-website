import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';

import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
// Cached data functions
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { ensureStaticParams } from '@/lib/staticParams';
import { getAllTagNames, getPhotosByTag } from '@/lib/data/gallery';
import { MIN_INDEXABLE_TAG_PHOTOS } from '@/lib/seoThresholds';

type Params = Promise<{ tag: string }>;

// Pre-render all tag pages at build time
export async function generateStaticParams() {
  const tagNames = await getAllTagNames();
  const params = tagNames.map((tag) => ({ tag: encodeURIComponent(tag) }));
  return ensureStaticParams(params, { tag: 'sample' });
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams?.tag || '');

  if (!tagName) {
    return createMetadata({
      title: 'Tag Not Found',
      description: 'The requested tag could not be found',
    });
  }

  const includeTestContent = await getIncludeTestContent();
  const photos = await getPhotosByTag(tagName, 100, includeTestContent);

  return createMetadata({
    title: `Photos tagged with "${tagName}"`,
    description: `Browse community photos tagged with "${tagName}". Discover photography from our community members.`,
    canonical: `/gallery/tag/${encodeURIComponent(tagName)}`,
    keywords: ['photography', 'photo gallery', tagName, 'community photos'],
    noindex: photos.length < MIN_INDEXABLE_TAG_PHOTOS,
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function TagPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams?.tag || '');

  if (!tagName) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const photos = await getPhotosByTag(tagName, 100, includeTestContent);

  if (photos.length === 0) {
    notFound();
  }

  return (
    <PageContainer
      innerClassName="max-w-screen-xl"
    >
      <PageHeading
        title={`Photos tagged “${tagName}”`}
        description={
          <>
            {photos.length}
            {' '}
            {photos.length === 1 ? 'photo' : 'photos'}
            {' '}
            with this tag
          </>
        }
      />

      <PopularTagsSection
        activeTag={tagName}
      />

      <JustifiedPhotoGrid
        photos={photos}
        showAttribution
      />
    </PageContainer>
  );
}
