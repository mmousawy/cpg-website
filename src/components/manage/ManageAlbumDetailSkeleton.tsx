'use client';

import ManageLayout from '@/components/manage/ManageLayout';
import ManagePhotoGridSkeleton from '@/components/manage/ManagePhotoGridSkeleton';
import ManageSidebarSkeleton from '@/components/manage/ManageSidebarSkeleton';

/**
 * Full-page skeleton for album detail routes while client data loads.
 */
export default function ManageAlbumDetailSkeleton() {
  return (
    <ManageLayout
      albumDetail={{ title: '...', slug: '' }}
      sidebar={<ManageSidebarSkeleton />}
    >
      <ManagePhotoGridSkeleton />
    </ManageLayout>
  );
}
