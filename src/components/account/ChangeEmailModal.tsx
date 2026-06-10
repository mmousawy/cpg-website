'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';

interface ChangeEmailModalProps {
  currentEmail: string;
  onSuccess?: () => void;
}

export default function ChangeEmailModal({
  currentEmail,
  onSuccess,
}: ChangeEmailModalProps) {
  const modalContext = useContext(ModalContext);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const handleCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(() => !isSubmitting);
    return () => modalContext.setBeforeCloseCheck(null);
  }, [modalContext, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!newEmail.trim()) {
      setError('Please enter your new email address');
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('New email must be different from your current email');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/account/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to change email');
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newEmail, currentEmail, onSuccess]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
    handleCloseRef.current = () => modalContext.setIsOpen(false);
  }, [handleSubmit, modalContext]);

  const footerContent = useMemo(
    () =>
      success ? (
        <div
          className="flex justify-end"
        >
          <Button
            onClick={() => handleCloseRef.current?.()}
          >
            Done
          </Button>
        </div>
      ) : (
        <div
          className="flex justify-end gap-2"
        >
          <Button
            variant="secondary"
            onClick={() => handleCloseRef.current?.()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmitRef.current?.()}
            disabled={isSubmitting || !newEmail.trim()}
            loading={isSubmitting}
          >
            Send confirmation
          </Button>
        </div>
      ),
    [success, isSubmitting, newEmail],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [modalContext, footerContent]);

  return (
    <div
      className="space-y-4"
    >
      {success ? (
        <div
          className="text-center py-4"
        >
          <div
            className="mb-4 mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
          >
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold mb-2"
          >
            Check your inbox
          </h3>
          <p
            className="text-foreground/70 text-sm"
          >
            We&apos;ve sent a confirmation link to
            {' '}
            <strong
              className="text-foreground"
            >
              {currentEmail}
            </strong>
            .
            {' '}
            Click the link to confirm changing your email to
            {' '}
            <strong
              className="text-foreground"
            >
              {newEmail}
            </strong>
            .
          </p>
        </div>
      ) : (
        <>
          <div>
            <label
              className="block text-sm font-medium text-foreground/60 mb-1"
            >
              Current email
            </label>
            <p
              className="text-sm font-medium"
            >
              {currentEmail}
            </p>
          </div>

          <div>
            <label
              htmlFor="newEmail"
              className="block text-sm font-medium mb-1"
            >
              New email address
            </label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setError(null);
              }}
              placeholder="Enter your new email"
              disabled={isSubmitting}
              autoFocus
              autoComplete="email"
            />
          </div>

          {error && (
            <ErrorMessage
              variant="compact"
            >
              {error}
            </ErrorMessage>
          )}

          <p
            className="text-xs text-foreground/50"
          >
            We&apos;ll send a confirmation link to your current email address for security.
            Your email won&apos;t change until you click the link.
          </p>
        </>
      )}
    </div>
  );
}
