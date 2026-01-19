'use client';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import type { EmailType } from '@/utils/emailPreferencesClient';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import ThumbsUpSVG from 'public/icons/thumbsup.svg';

const emailTypeLabels: Record<EmailType, string> = {
  events: 'upcoming events',
  newsletter: 'the community newsletter',
  notifications: 'activity notifications',
  weekly_digest: 'the weekly digest',
};

export default function UnsubscribePage() {
  const params = useParams();
  const rawToken = params?.token as string;
  // Decode the token from URL encoding (handles %3A -> :, etc.)
  const token = rawToken ? decodeURIComponent(rawToken) : null;
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailType, setEmailType] = useState<EmailType | null>(null);
  const [hasUnsubscribed, setHasUnsubscribed] = useState(false);

  const emailTypeLabel = emailType ? `about ${emailTypeLabels[emailType]}` : null;

  const handleUnsubscribe = async () => {
    if (!token) {
      setError('Invalid unsubscribe link');
      return;
    }

    // Prevent duplicate unsubscribes
    if (hasUnsubscribed || isSuccess) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to unsubscribe');
      }

      // Mark as unsubscribed to prevent duplicate requests
      setHasUnsubscribed(true);
      setIsSuccess(true);
      setEmailType((data.emailType as EmailType) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <PageContainer>
        <Container
          variant="centered"
          className="max-w-md mx-auto"
        >
          <div
            className="text-center"
          >
            <ThumbsUpSVG
              className="inline-block mb-4 size-10"
            />
            <h1
              className="mb-4 text-2xl font-bold"
            >
              No biggie! You&apos;re unsubscribed
            </h1>
            <p
              className="text-foreground/70"
            >
              {emailTypeLabel
                ? `You've been unsubscribed from emails ${emailTypeLabel}.`
                : 'You\'ve been unsubscribed from these emails.'}
            </p>
            <p
              className="mb-6 text-foreground/70"
            >
              Changed your mind? You can always opt in again in your account settings.
            </p>
            <p
              className="text-sm text-foreground/70"
            >
              Got feedback? Reach out to
              {' '}
              <a
                href="mailto:hello@murtada.nl"
                className="text-primary underline hover:text-primary/70"
              >
                hello@murtada.nl
              </a>
            </p>
          </div>
        </Container>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Container
        variant="centered"
        className="max-w-md mx-auto"
      >
        <div
          className="text-center"
        >
          <h1
            className="mb-4 text-2xl font-bold"
          >
            Unsubscribe from emails
          </h1>
          <p
            className="mb-6 text-foreground/70"
          >
            { emailType ? `Are you sure you want to unsubscribe from emails ${emailTypeLabel}?` : 'Are you sure you want to unsubscribe from these emails?' }
          </p>
          {error && (
            <div
              className="mb-4 rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
            >
              {error}
            </div>
          )}
          <div
            className="flex gap-3 justify-center mb-6"
          >
            <Button
              onClick={handleUnsubscribe}
              disabled={isLoading || hasUnsubscribed || isSuccess}
              variant="danger"
              loading={isLoading}
            >
              {hasUnsubscribed || isSuccess ? 'Unsubscribed' : 'Yes, unsubscribe'}
            </Button>
          </div>
          <p
            className="text-sm text-foreground/60"
          >
            Want to opt out of other types of emails? You can change your email preferences in your account settings.
          </p>
        </div>
      </Container>
    </PageContainer>
  );
}
