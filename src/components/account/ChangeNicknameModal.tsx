'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import { useSupabase } from '@/hooks/useSupabase';
import { normalizeNicknameInput } from '@/utils/nickname';

interface ChangeNicknameModalProps {
  currentNickname: string;
  currentEmail: string;
  userId: string;
  onSuccess?: () => void;
}

export default function ChangeNicknameModal({
  currentNickname,
  currentEmail,
  userId,
  onSuccess,
}: ChangeNicknameModalProps) {
  const modalContext = useContext(ModalContext);
  const supabase = useSupabase();
  const [newNickname, setNewNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const handleCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(() => !isSubmitting);
    return () => modalContext.setBeforeCloseCheck(null);
  }, [modalContext, isSubmitting]);

  const checkNicknameAvailability = useCallback(async (nickname: string) => {
    if (!nickname || nickname.length < 3) {
      setNicknameAvailable(null);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(nickname) || nickname.startsWith('-') || nickname.endsWith('-')) {
      setNicknameAvailable(null);
      return;
    }

    if (nickname === currentNickname) {
      setNicknameAvailable(null);
      return;
    }

    setIsCheckingNickname(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('is_nickname_available', {
        p_nickname: nickname,
        p_user_id: userId,
      });

      if (rpcError) {
        console.error('Error checking nickname:', rpcError);
        setNicknameAvailable(null);
      } else {
        setNicknameAvailable(data === true);
      }
    } catch (err) {
      console.error('Error checking nickname:', err);
      setNicknameAvailable(null);
    } finally {
      setIsCheckingNickname(false);
    }
  }, [currentNickname, supabase, userId]);

  const handleNicknameChange = (value: string) => {
    const normalized = normalizeNicknameInput(value);
    setNewNickname(normalized);
    setError(null);
    setNicknameAvailable(null);

    if (nicknameCheckTimeoutRef.current) {
      clearTimeout(nicknameCheckTimeoutRef.current);
    }

    nicknameCheckTimeoutRef.current = setTimeout(() => {
      void checkNicknameAvailability(normalized);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!newNickname.trim()) {
      setError('Please enter your new nickname');
      return;
    }

    if (newNickname === currentNickname) {
      setError('New nickname must be different from your current nickname');
      return;
    }

    if (nicknameAvailable === false) {
      setError('This nickname is already taken');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/account/change-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to change nickname');
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentNickname, newNickname, nicknameAvailable, onSuccess]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
    handleCloseRef.current = () => modalContext.setIsOpen(false);
  }, [handleSubmit, modalContext]);

  const canSubmit = Boolean(
    newNickname.trim()
    && newNickname !== currentNickname
    && nicknameAvailable === true
    && !isCheckingNickname,
  );

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
            disabled={isSubmitting || !canSubmit}
            loading={isSubmitting}
          >
            Send confirmation
          </Button>
        </div>
      ),
    [success, isSubmitting, canSubmit],
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
          className="py-4 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
          >
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
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
            className="mb-2 text-lg font-semibold"
          >
            Check your inbox
          </h3>
          <p
            className="text-foreground/80 text-sm"
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
            Your nickname won&apos;t change until you click the link to confirm
            {' '}
            <strong
              className="text-foreground"
            >
              @{newNickname}
            </strong>
            .
          </p>
        </div>
      ) : (
        <>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-foreground/60"
            >
              Current nickname
            </label>
            <p
              className="text-sm font-medium"
            >
              @{currentNickname}
            </p>
          </div>

          <div>
            <label
              htmlFor="newNickname"
              className="mb-1 block text-sm font-medium"
            >
              New nickname
            </label>
            <Input
              id="newNickname"
              type="text"
              value={newNickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="your-nickname"
              disabled={isSubmitting}
              autoFocus
              autoComplete="off"
              leftAddon="@"
              rightAddon={
                <>
                  {isCheckingNickname && (
                    <svg
                      className="size-4 animate-spin text-foreground/80"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {!isCheckingNickname && nicknameAvailable === true && newNickname.length >= 3 && (
                    <svg
                      className="size-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {!isCheckingNickname && nicknameAvailable === false && (
                    <svg
                      className="size-4 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </>
              }
            />
            {!error && nicknameAvailable === false && (
              <p
                className="mt-1 text-sm text-red-500"
              >
                This nickname is already taken
              </p>
            )}
            {!error && nicknameAvailable === true && newNickname.length >= 3 && (
              <p
                className="mt-1 text-sm text-primary"
              >
                Nickname is available!
              </p>
            )}
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
            Your nickname won&apos;t change until you click the link. You can change your nickname
            once every 60 days. Old profile URLs redirect for one year.
          </p>
        </>
      )}
    </div>
  );
}
