'use client';

import ManageLayout from '@/components/manage/ManageLayout';
import ManagePhotoGridSkeleton from '@/components/manage/ManagePhotoGridSkeleton';
import ManageSidebarSkeleton from '@/components/manage/ManageSidebarSkeleton';

/**
 * Route-level loading for /account/photos and /account/albums.
 * Uses the real manage shell so tabs stay visible during navigation.
 */
export default function ManageLoading() {
  return (
    <ManageLayout
      sidebar={<ManageSidebarSkeleton />}
    >
      <ManagePhotoGridSkeleton />
    </ManageLayout>
  );
}
