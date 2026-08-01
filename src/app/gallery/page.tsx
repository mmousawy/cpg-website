import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

import GalleryHomeSections from '@/app/gallery/GalleryHomeSections';
import GalleryHomeSkeleton from '@/app/gallery/GalleryHomeSkeleton';
import GalleryPageHeader from '@/app/gallery/GalleryPageHeader';
import PageContainer from '@/components/layout/PageContainer';
import { getGalleryHomeData } from '@/lib/data/gallery';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Community gallery',
  description:
    'Browse photo albums created by our community members. Explore beautiful photos from our photography meetups and community events.',
  canonical: '/gallery',
  keywords: ['photography gallery', 'photo albums', 'photography portfolio', 'community photos'],
});

export default function GalleryPage() {
  return (
    <Suspense
      fallback={<GalleryHomeSkeleton />}
    >
      <GalleryPageContent />
    </Suspense>
  );
}

async function GalleryPageContent() {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');
  cacheTag('albums');

  const data = await getGalleryHomeData();

  return (
    <>
      <PageContainer>
        <GalleryPageHeader />
      </PageContainer>

      <GalleryHomeSections
        data={data}
      />
    </>
  );
}
