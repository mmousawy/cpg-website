'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import RecipientList, { Recipient } from '@/components/admin/RecipientList';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { useSupabase } from '@/hooks/useSupabase';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface AnnounceEventModalProps {
  eventId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type Subscriber = Recipient;

export default function AnnounceEventModal({
  eventId,
  onClose,
  onSuccess,
}: AnnounceEventModalProps) {
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number; totalProfiles?: number; optedOut?: number; sendStatus?: Record<string, 'success' | 'error'>; errorDetails?: Record<string, string> } | null>(null);

  // Use refs for callbacks to prevent infinite loops
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
        // Fetch all active profiles (not suspended, with email), sorted by joined date
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, nickname, created_at')
          .is('suspended_at', null)
          .not('email', 'is', null)
          .order('created_at', { ascending: true }); // Oldest first

        if (profilesError) {
          throw new Error('Failed to load profiles');
        }

        if (!allProfiles || allProfiles.length === 0) {
          setSubscribers([]);
          setIsLoadingSubscribers(false);
          return;
        }

        // Get the events email type ID
        const { data: eventsEmailType } = await supabase
          .from('email_types')
          .select('id')
          .eq('type_key', 'events')
          .single();

        if (!eventsEmailType) {
          throw new Error('Events email type not found');
        }

        const eventsEmailTypeId = eventsEmailType.id;

        // Get all users who have opted out of "events" email type
        const { data: optedOutUsers, error: optedOutError } = await supabase
          .from('email_preferences')
          .select('user_id')
          .eq('email_type_id', eventsEmailTypeId)
          .eq('opted_out', true);

        if (optedOutError) {
          console.error('Error fetching opted-out users:', optedOutError);
        }

        const optedOutUserIds = new Set(
          (optedOutUsers || []).map((u: { user_id: string }) => u.user_id),
        );

        // Include all users; mark opted-out users as disabled (visible but not selectable)
        const subscribersList = allProfiles.map(profile => {
          const optedOut = optedOutUserIds.has(profile.id);
          return {
            email: profile.email!,
            name: profile.full_name || profile.email!.split('@')[0] || 'Friend',
            nickname: profile.nickname,
            selected: !optedOut,
            disabled: optedOut,
          };
        });

        setSubscribers(subscribersList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscribers');
      } finally {
        setIsLoadingSubscribers(false);
      }
    };

    loadSubscribers();
  }, [eventId, supabase]);

  const handleSend = useCallback(async () => {
    const selectedSubscribers = subscribers.filter(s => s.selected);

    if (selectedSubscribers.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/events/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          recipientEmails: selectedSubscribers.map(s => s.email),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send announcement');
      }

      setSuccess(true);
      setSendResult(data);

      // Update subscribers with send status and error details (only for selected ones)
      if (data.sendStatus) {
        setSubscribers(prev => prev.map(sub => ({
          ...sub,
          sendStatus: sub.selected ? (data.sendStatus?.[sub.email] || null) : sub.sendStatus,
          errorMessage: sub.selected && data.errorDetails?.[sub.email] ? data.errorDetails[sub.email] : sub.errorMessage,
        })));
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    } finally {
      setIsSending(false);
    }
  }, [eventId, subscribers, onSuccess]);

  // Update ref when handleSend changes
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Memoize footer to prevent infinite loops - use refs for callbacks
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
          disabled={isSending || subscribers.filter(s => s.selected).length === 0}
          loading={isSending}
        >
          Send announcement
        </Button>
      </div>
    ),
    [isSending, subscribers],
  );

  // Set sticky footer buttons - only update when footer content changes
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
        {/* Subscribers List */}
        {isLoadingSubscribers ? (
          <div
            className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/70"
          >
            Loading recipients...
          </div>
        ) : (
          <RecipientList
            recipients={subscribers}
            onRecipientsChange={setSubscribers}
            emptyMessage="No recipients found. All members may have opted out of event announcements."
          />
        )}

        {/* Error Message */}
        {error && (
          <ErrorMessage
            variant="compact"
          >
            {error}
          </ErrorMessage>
        )}

        {/* Success Message */}
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
                    sent successfully.
                  </p>
                  {sendResult.failed > 0 && (
                    <div
                      className="mt-2 space-y-1"
                    >
                      <p
                        className="text-xs font-normal"
                      >
                        {sendResult.failed}
                        {' '}
                        email
                        {sendResult.failed !== 1 ? 's' : ''}
                        {' '}
                        failed to send.
                      </p>
                      {sendResult.errorDetails && Object.keys(sendResult.errorDetails).length > 0 && (
                        <details
                          className="text-xs"
                        >
                          <summary
                            className="cursor-pointer text-foreground/70 hover:text-foreground"
                          >
                            View error details
                          </summary>
                          <div
                            className="mt-2 space-y-1 rounded-md bg-red-500/10 p-2"
                          >
                            {Object.entries(sendResult.errorDetails).map(([email, error]) => (
                              <div
                                key={email}
                                className="break-words"
                              >
                                <span
                                  className="font-medium"
                                >
                                  {email}
                                  :
                                </span>
                                {' '}
                                {String(error)}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
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
