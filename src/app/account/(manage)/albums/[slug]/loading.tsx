import PageLoading from '@/components/shared/PageLoading';
import ManageLayout from '@/components/manage/ManageLayout';

export default function Loading() {
  return (
    <ManageLayout albumDetail={{ title: '...' }} sidebar={<PageLoading message="Loading..." />}>
      <PageLoading message="Loading album..." />
    </ManageLayout>
  );
}
