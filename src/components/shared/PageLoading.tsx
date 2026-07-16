'use client';

import PageContainer from '@/components/layout/PageContainer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type PageLoadingProps = {
  /** Optional message to show below spinner */
  message?: string
}

/**
 * Full-page loading spinner, centered both horizontally and vertically.
 * Use this for page-level loading states.
 *
 * Can also be exported as default in `loading.tsx` files for Next.js Suspense:
 * ```tsx
 * // app/some-route/loading.tsx
 * export { default } from '@/components/shared/PageLoading'
 * ```
 */
export default function PageLoading({ message }: PageLoadingProps = {}) {
  return (
    <PageContainer>
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      >
        <LoadingSpinner />
        {message && (
          <p
            className="text-sm text-foreground/80"
          >
            {message}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
