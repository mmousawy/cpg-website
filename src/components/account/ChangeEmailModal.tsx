'use client';

import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import { useEffect, useRef, useState } from 'react';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import CloseSVG from 'public/icons/close.svg';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess?: () => void;
}

export default function ChangeEmailModal({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}: ChangeEmailModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewEmail('');
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.show();
        document.body.style.overflow = 'hidden';
        const timerId = setTimeout(() => setIsTrapped(true), 16);
        return () => clearTimeout(timerId);
      } else {
        modalRef.current.close();
        document.body.style.overflow = 'auto';
        const timerId = setTimeout(() => setIsTrapped(false), 0);
        return () => clearTimeout(timerId);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        'fixed inset-0 z-[60] overflow-auto',
        'flex size-full max-h-none max-w-none p-4',
        'bg-black/40 backdrop-blur-sm',
        'transition-[visibility,opacity] duration-300',
      ])}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: !isSubmitting,
          onDeactivate: handleClose,
          fallbackFocus: () => modalRef.current || document.body,
        }}
      >
        <div
          className={clsx([
            isOpen ? 'scale-100' : 'scale-95',
            'w-full max-w-md',
            'relative m-auto',
            'rounded-2xl border border-border-color bg-background-light shadow-xl shadow-black/25',
            'transition-transform duration-300',
          ])}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-start justify-between gap-4 p-4 pb-0"
          >
            <h2
              className="text-2xl font-bold max-sm:text-xl"
            >
              Change email address
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-shrink-0 rounded-full border border-border-color p-1 hover:bg-background disabled:opacity-50"
            >
              <CloseSVG
                className="fill-foreground"
              />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
          >
            <div
              className="p-4 space-y-4"
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
                    Click the link to confirm changing your email to
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

                  {error && <ErrorMessage
                    variant="compact"
                  >
                    {error}
                  </ErrorMessage>}

                  <p
                    className="text-xs text-foreground/50"
                  >
                    We&apos;ll send a confirmation link to your current email address for security.
                    Your email won&apos;t change until you click the link.
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2 border-t border-border-color p-4"
            >
              {success ? (
                <Button
                  type="button"
                  onClick={handleClose}
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newEmail.trim()}
                    loading={isSubmitting}
                  >
                    Send confirmation
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      </FocusTrap>
    </dialog>
  );
}
