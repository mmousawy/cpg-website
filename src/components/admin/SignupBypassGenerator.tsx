'use client';

import { useState } from 'react';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function SignupBypassGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [bypassUrl, setBypassUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setBypassUrl(null);
    setExpiresAt(null);
    setCopied(false);

    try {
      const response = await fetch('/api/admin/signup-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate bypass link');
      }

      setBypassUrl(data.bypassUrl);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate bypass link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!bypassUrl) return;

    try {
      await navigator.clipboard.writeText(bypassUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div
      className="space-y-4"
    >
      <div
        className="rounded-lg border border-border-color bg-background-light p-6"
      >
        <h2
          className="mb-2 text-xl font-semibold"
        >
          Generate Signup Bypass Link
        </h2>
        <p
          className="mb-4 text-sm text-foreground/70"
        >
          Generate a single-use link that allows users to sign up without BotID verification.
          The link expires in 7 days and can only be used once.
        </p>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          loading={isGenerating}
          variant="primary"
        >
          {isGenerating ? 'Generating...' : 'Generate Bypass Link'}
        </Button>

        {error && (
          <div
            className="mt-4"
          >
            <ErrorMessage
              variant="compact"
            >
              {error}
            </ErrorMessage>
          </div>
        )}

        {bypassUrl && (
          <div
            className="mt-4 space-y-3"
          >
            <SuccessMessage
              variant="compact"
            >
              Bypass link generated successfully
            </SuccessMessage>

            <div
              className="rounded-md border border-border-color bg-background p-4"
            >
              <label
                className="mb-2 block text-sm font-medium"
              >
                Bypass Link:
              </label>
              <div
                className="flex gap-2"
              >
                <input
                  type="text"
                  readOnly
                  value={bypassUrl}
                  className="flex-1 rounded-md border border-border-color bg-background-light px-3 py-2 text-sm font-mono"
                />
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  disabled={copied}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              {expiresAt && (
                <p
                  className="mt-2 text-xs text-foreground/50"
                >
                  Expires:
                  {' '}
                  {formatExpiresAt(expiresAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
