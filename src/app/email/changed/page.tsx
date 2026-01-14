'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import Button from '@/components/shared/Button';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';

function EmailChangedContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const email = searchParams.get('email');

  if (!success) {
    return (
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Something went wrong</h1>
          <p className="text-foreground/70 mb-6">
            We couldn&apos;t verify your email change. The link may be invalid or expired.
          </p>
          <Link href="/account">
            <Button>Go to account settings</Button>
          </Link>
        </Container>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold">Email changed successfully!</h1>
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
      </Container>
    </PageContainer>
  );
}

export default function EmailChangedPage() {
  return (
    <Suspense fallback={
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="text-center">
          <p className="text-foreground/70">Loading...</p>
        </Container>
      </PageContainer>
    }>
      <EmailChangedContent />
    </Suspense>
  );
}
