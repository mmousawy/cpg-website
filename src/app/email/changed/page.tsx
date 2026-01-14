'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import Button from '@/components/shared/Button';
import PageContainer from '@/components/layout/PageContainer';

export default function EmailChangedPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const email = searchParams.get('email');

  if (!success) {
    return (
      <PageContainer centered>
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-foreground/70 mb-6">
            We couldn&apos;t verify your email change. The link may be invalid or expired.
          </p>
          <Link href="/account">
            <Button>Go to account settings</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer centered>
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">Email changed successfully!</h1>
        <p className="text-foreground/70 mb-2">
          Your email has been updated to:
        </p>
        {email && (
          <p className="font-semibold text-lg mb-6">{email}</p>
        )}
        <p className="text-foreground/70 text-sm mb-6">
          You can now use this email to log in to your account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login">
            <Button>Log in</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Go to homepage</Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
