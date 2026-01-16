import { Suspense } from 'react';
import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import PageLoading from '@/components/shared/PageLoading';
import { createNoIndexMetadata } from '@/utils/metadata';
import OnboardingClient from './OnboardingClient';

export const metadata = createNoIndexMetadata({
  title: 'Complete your profile',
  description: 'Set up your profile to start sharing your photography',
});

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
