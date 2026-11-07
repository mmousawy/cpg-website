import { buildPersonRefJsonLd } from '@/lib/profile/jsonLd';
import { getCrawlableImageUrl } from '@/lib/seo/jsonLd';

type ImageGalleryJsonLdInput = {
  name: string;
  description?: string | null;
  url: string;
  coverImageUrl?: string | null;
  creatorNickname: string;
  creatorName: string;
  numberOfItems: number;
};

export function buildImageGalleryJsonLd(input: ImageGalleryJsonLdInput) {
  const image = getCrawlableImageUrl(input.coverImageUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: input.name,
    url: input.url,
    ...(input.description && { description: input.description }),
    ...(image && { image }),
    creator: buildPersonRefJsonLd(input.creatorNickname, input.creatorName),
    numberOfItems: input.numberOfItems,
  };
}
