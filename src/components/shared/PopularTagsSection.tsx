import { getPopularTags } from '@/lib/data/gallery';
import TagCloud from './TagCloud';

interface PopularTagsSectionProps {
  /** Currently active tag (if on a tag page) */
  activeTag?: string;
}

/**
 * Server component that fetches and displays popular tags
 * Uses cached getPopularTags function
 */
export default async function PopularTagsSection({ activeTag }: PopularTagsSectionProps) {
  const popularTags = await getPopularTags(30);

  if (popularTags.length === 0) {
    return null;
  }

  return (
    <div className="">
      <h2 className="mb-3 text-xl font-semibold">Browse by tag</h2>
      <TagCloud
        tags={popularTags}
        activeTag={activeTag}
      />
    </div>
  );
}
