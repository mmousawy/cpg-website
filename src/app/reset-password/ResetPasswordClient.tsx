'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@/components/shared/Button';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { routes } from '@/config/routes';

import CheckSVG from 'public/icons/check.svg';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if we have a valid token
  const hasToken = Boolean(token && email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token || !email) {
      setError('Invalid reset link');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckSVG className="h-8 w-8 fill-green-500" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Password updated!</h1>
          <p className="text-foreground/70">
            Your password has been successfully updated. Redirecting you to login...
          </p>
        </Container>
      </PageContainer>
    );
  }

  if (!hasToken) {
    return (
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="mx-auto max-w-md text-center">
          <h1 className="mb-2 text-3xl font-bold">Invalid reset link</h1>
          <p className="mb-6 text-foreground/70">
            This password reset link is invalid or has expired.
          </p>
          <Button href={routes.forgotPassword.url}>
            Request a new link
          </Button>
        </Container>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-3xl font-bold">Set new password</h1>
        <p className="mb-8 text-center text-sm text-foreground/70">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <ErrorMessage variant="compact">{error}</ErrorMessage>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            className="mt-2"
          >
            {isLoading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Container>
    </PageContainer>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={<PageContainer><Container><p>Loading...</p></Container></PageContainer>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
