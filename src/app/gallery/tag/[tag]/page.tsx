import PageContainer from '@/components/layout/PageContainer';
import { cacheLife } from 'next/cache';

import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import EmptyState from '@/components/shared/EmptyState';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import ImageSVG from 'public/icons/image.svg';

// Cached data functions
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { ensureStaticParams } from '@/lib/staticParams';
import { getAllTagNames, getPhotosByTag } from '@/lib/data/gallery';

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

  return createMetadata({
    title: `Photos tagged with "${tagName}"`,
    description: `Browse community photos tagged with "${tagName}". Discover photography from our community members.`,
    canonical: `/gallery/tag/${encodeURIComponent(tagName)}`,
    keywords: ['photography', 'photo gallery', tagName, 'community photos'],
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

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold font-heading"
          >
            Photos tagged &ldquo;
            {tagName}
            &rdquo;
          </h1>
          <p
            className="text-lg opacity-70"
          >
            {photos.length}
            {' '}
            {photos.length === 1 ? 'photo' : 'photos'}
            {' '}
            with this tag
          </p>
        </div>

        <PopularTagsSection
          activeTag={tagName}
        />
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        {photos.length === 0 ? (
          <EmptyState
            icon={<ImageSVG
              className="size-10 inline-block"
            />}
            title="No photos found with this tag."
          />
        ) : (
          <JustifiedPhotoGrid
            photos={photos}
            showAttribution
          />
        )}
      </WidePageContainer>
    </>
  );
}
