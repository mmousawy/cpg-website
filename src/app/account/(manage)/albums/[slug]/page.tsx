'use client';

import { Suspense } from 'react';

import ManageAlbumDetailSkeleton from '@/components/manage/ManageAlbumDetailSkeleton';

import AlbumDetailClient from './AlbumDetailClient';

export default function AlbumDetailPage() {
  return (
    <Suspense
      fallback={<ManageAlbumDetailSkeleton />}
    >
      <AlbumDetailClient />
    </Suspense>
  );
}
