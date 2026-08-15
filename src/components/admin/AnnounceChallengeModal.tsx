'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import RecipientList, { Recipient, recipientsFromProfiles } from '@/components/admin/RecipientList';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface AnnounceChallengeModalProps {
  challengeId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Subscriber = Recipient;

export default function AnnounceChallengeModal({
  challengeId,
  onClose,
  onSuccess,
}: AnnounceChallengeModalProps) {
  const modalContext = useContext(ModalContext);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    sendStatus?: Record<string, 'success' | 'error'>;
    errorDetails?: Record<string, string>;
  } | null>(null);

  const onCloseRef = useRef(onClose);
  const handleSendRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const loadSubscribers = async () => {
      setIsLoadingSubscribers(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/email-recipients?emailType=photo_challenges');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load profiles');
        }

        setSubscribers(recipientsFromProfiles(data.recipients ?? []));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscribers');
      } finally {
        setIsLoadingSubscribers(false);
      }
    };

    loadSubscribers();
  }, [challengeId]);

  const handleSend = useCallback(async () => {
    const selectedSubscribers = subscribers.filter((s) => s.selected);

    if (selectedSubscribers.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/challenges/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          recipientEmails: selectedSubscribers.map((s) => s.email),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send announcement');
      }

      setSuccess(true);
      setSendResult(data);

      // Update subscribers with send status
      if (data.sendStatus) {
        setSubscribers((prev) =>
          prev.map((sub) => ({
            ...sub,
            sendStatus: sub.selected
              ? data.sendStatus?.[sub.email] || null
              : sub.sendStatus,
            errorMessage:
              sub.selected && data.errorDetails?.[sub.email]
                ? data.errorDetails[sub.email]
                : sub.errorMessage,
          })),
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    } finally {
      setIsSending(false);
    }
  }, [challengeId, subscribers, onSuccess]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Modal footer
  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end gap-3"
      >
        <Button
          variant="secondary"
          onClick={() => onCloseRef.current()}
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => handleSendRef.current?.()}
          disabled={isSending || subscribers.filter((s) => s.selected).length === 0}
          loading={isSending}
        >
          Send announcement
        </Button>
      </div>
    ),
    [isSending, subscribers],
  );

  useEffect(() => {
    if (!modalContext) return;

    modalContext.setFooter(footerContent);

    return () => {
      if (modalContext) {
        modalContext.setFooter(null);
      }
    };
  }, [modalContext, footerContent]);

  return (
    <>
      <div
        className="space-y-4"
      >
        {isLoadingSubscribers ? (
          <div
            className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/80"
          >
            Loading recipients...
          </div>
        ) : (
          <RecipientList
            recipients={subscribers}
            onRecipientsChange={setSubscribers}
            emptyMessage="No recipients found. All members may have opted out of challenge announcements."
          />
        )}

        {error && <ErrorMessage
          variant="compact"
        >
          {error}
        </ErrorMessage>}

        {success && sendResult && (
          <div
            className="mt-4"
          >
            {sendResult.failed === 0 ? (
              <SuccessMessage
                variant="compact"
              >
                Successfully sent
                {' '}
                {sendResult.sent}
                {' '}
                of
                {' '}
                {sendResult.total}
                {' '}
                emails
              </SuccessMessage>
            ) : (
              <div
                className="flex gap-2 rounded-md bg-yellow-500/20 p-3 text-sm text-foreground"
              >
                <div
                  className="flex-1"
                >
                  <p
                    className="font-semibold"
                  >
                    {sendResult.sent}
                    {' '}
                    email
                    {sendResult.sent !== 1 ? 's' : ''}
                    {' '}
                    sent
                    successfully.
                  </p>
                  {sendResult.failed > 0 && (
                    <p
                      className="mt-1 text-xs font-normal"
                    >
                      {sendResult.failed}
                      {' '}
                      email
                      {sendResult.failed !== 1 ? 's' : ''}
                      {' '}
                      failed to send.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
