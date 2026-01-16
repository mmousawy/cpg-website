import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';

// Cached data functions
import { getAllTagNames, getPhotosByTag } from '@/lib/data/gallery';

type Params = Promise<{ tag: string }>;

// Pre-render all tag pages at build time
export async function generateStaticParams() {
  const tagNames = await getAllTagNames();
  return tagNames.map((tag) => ({ tag: encodeURIComponent(tag) }));
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
    title: `Photos tagged "${tagName}"`,
    description: `Browse community photos tagged with "${tagName}". Discover photography from our community members.`,
    canonical: `/gallery/tag/${encodeURIComponent(tagName)}`,
    keywords: ['photography', 'photo gallery', tagName, 'community photos'],
  });
}

export default async function TagPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams?.tag || '');

  if (!tagName) {
    notFound();
  }

  const photos = await getPhotosByTag(tagName, 100);

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">
            Photos tagged &ldquo;{tagName}&rdquo;
          </h1>
          <p className="text-lg opacity-70">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} with this tag
          </p>
        </div>

        <PopularTagsSection activeTag={tagName} />
      </PageContainer>

      <WidePageContainer className="!pt-0">
        {photos.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="text-lg opacity-70">
              No photos found with this tag.
            </p>
          </div>
        ) : (
          <JustifiedPhotoGrid photos={photos} showAttribution />
        )}
      </WidePageContainer>
    </>
  );
}
