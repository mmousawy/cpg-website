'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import DocumentRouteState from '@/components/layout/DocumentRouteState';

const SmoothScrollProvider = dynamic(
  () => import('@/components/shared/SmoothScrollProvider'),
  { ssr: false },
);

/** Non-critical client features that do not require auth context. */
export default function ClientShellExtras() {
  return (
    <>
      <Suspense
        fallback={null}
      >
        <DocumentRouteState />
      </Suspense>
      <Suspense
        fallback={null}
      >
        <SmoothScrollProvider />
      </Suspense>
    </>
  );
}
