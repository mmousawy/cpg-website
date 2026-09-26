'use client';

import { HomeBelowFoldSkeleton } from '@/components/home/HomeBelowFoldSkeleton';
import dynamic from 'next/dynamic';

const HomeBelowFoldClient = dynamic(
  () => import('@/components/home/HomeBelowFoldClient'),
  { ssr: false, loading: () => <HomeBelowFoldSkeleton /> },
);

export default function HomeBelowFoldLoader() {
  return (
    <HomeBelowFoldClient />
  );
}
