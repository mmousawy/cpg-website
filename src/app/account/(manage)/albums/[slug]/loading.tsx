import ManageLayout from '@/components/manage/ManageLayout';
import PageLoading from '@/components/shared/PageLoading';

export default function Loading() {
  return (
    <ManageLayout
      albumDetail={{ title: '...', slug: '' }}
      sidebar={<PageLoading
        message="Loading..."
      />}
    >
      <PageLoading
        message="Loading album..."
      />
    </ManageLayout>
  );
}
