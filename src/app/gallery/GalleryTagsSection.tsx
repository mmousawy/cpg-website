import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
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
      <div>
        <StickySectionHeading
          stickyClassName="mb-3 sm:mb-3"
        >
          Browse by tag
        </StickySectionHeading>
        <TagCloud
          tags={tags}
        />
      </div>
    </PageContainer>
  );
}
