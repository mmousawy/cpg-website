import PageContainer from '@/components/layout/PageContainer';
import TagCloud from '@/components/shared/TagCloud';
import type { Tag } from '@/types/photos';

export function GalleryTagsSection({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <PageContainer
      className="py-0!"
    >
      <h2
        className="mb-3 text-xl font-semibold font-heading opacity-80"
      >
        Browse by tag
      </h2>
      <TagCloud
        tags={tags}
      />
    </PageContainer>
  );
}
