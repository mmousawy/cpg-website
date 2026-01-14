import { Suspense } from 'react';
import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import PageLoading from '@/components/shared/PageLoading';
import OnboardingClient from './OnboardingClient';

export default function OnboardingPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <Suspense fallback={<PageLoading />}>
          <OnboardingClient />
        </Suspense>
      </div>
    </>
  );
}
