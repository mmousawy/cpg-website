import AlbumDetailClient from './AlbumDetailClient';
import PageLoading from '@/components/shared/PageLoading';
import { Suspense } from 'react';

// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ slug: 'sample' }];
}

export default async function AlbumDetailPage() {
  return (
    <Suspense
      fallback={<PageLoading
        message="Loading album..."
      />}
    >
      <AlbumDetailClient />
    </Suspense>
  );
}
