'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import RecipientList, { Recipient } from '@/components/admin/RecipientList';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import Textarea from '@/components/shared/Textarea';
import { useSupabase } from '@/hooks/useSupabase';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface EmailAttendeesModalProps {
  eventId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type EmailRecipient = Recipient & {
  type: 'attendee' | 'host';
};

export default function EmailAttendeesModal({
  eventId,
  onClose,
  onSuccess,
}: EmailAttendeesModalProps) {
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number; sendStatus?: Record<string, 'success' | 'error'>; errorDetails?: Record<string, string> } | null>(null);

  // Use refs for callbacks to prevent infinite loops
  const onCloseRef = useRef(onClose);
  const handleSendRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    loadRecipients();
  }, [eventId]);

  const loadRecipients = async () => {
    setIsLoadingRecipients(true);
    setError(null);

    try {
      // Fetch confirmed RSVPs with user profiles for nicknames and joined date
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('events_rsvps')
        .select('id, email, name, user_id, profiles!events_rsvps_user_id_profiles_fkey(nickname, created_at)')
        .eq('event_id', eventId)
        .not('confirmed_at', 'is', null)
        .is('canceled_at', null)
        .not('email', 'is', null);

      if (rsvpsError) {
        throw new Error('Failed to load RSVPs');
      }

      // Fetch all admin profiles (hosts), sorted by joined date
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname, created_at')
        .eq('is_admin', true)
        .is('suspended_at', null)
        .not('email', 'is', null)
        .order('created_at', { ascending: true }); // Oldest first

      if (adminsError) {
        throw new Error('Failed to load admin profiles');
      }

      // Combine and deduplicate by email, preserving joined date for sorting
      const recipientMap = new Map<string, EmailRecipient & { joinedAt: string | null }>();

      // Add RSVPs
      if (rsvps) {
        rsvps.forEach((rsvp) => {
          if (rsvp.email) {
            const profile = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
            recipientMap.set(rsvp.email.toLowerCase(), {
              email: rsvp.email,
              name: rsvp.name || rsvp.email.split('@')[0] || 'Friend',
              nickname: profile?.nickname || null,
              type: 'attendee',
              selected: true, // All recipients selected by default
              joinedAt: profile?.created_at || null,
            });
          }
        });
      }

      // Add admins
      if (admins) {
        admins.forEach((admin) => {
          if (admin.email) {
            recipientMap.set(admin.email.toLowerCase(), {
              email: admin.email,
              name: admin.full_name || admin.email.split('@')[0] || 'Friend',
              nickname: admin.nickname,
              type: 'host',
              selected: true, // All recipients selected by default
              joinedAt: admin.created_at || null,
            });
          }
        });
      }

      // Convert to array and sort by joined date (oldest first)
      const recipientsList = Array.from(recipientMap.values()).sort((a, b) => {
        // If both have joined dates, sort by date (oldest first)
        if (a.joinedAt && b.joinedAt) {
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        }
        // If only one has a date, prioritize it
        if (a.joinedAt && !b.joinedAt) return -1;
        if (!a.joinedAt && b.joinedAt) return 1;
        // If neither has a date, maintain order
        return 0;
      });

      // Remove joinedAt from final recipients (it was only for sorting)
      setRecipients(recipientsList.map(({ joinedAt, ...recipient }) => recipient));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients');
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    const selectedRecipients = recipients.filter(r => r.selected);

    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/events/email-attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          message: message.trim(),
          recipientEmails: selectedRecipients.map(r => r.email),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send emails');
      }

      setSuccess(true);
      setSendResult(data);

      // Update recipients with send status and error details (only for selected ones)
      if (data.sendStatus) {
        setRecipients(prev => prev.map(recipient => ({
          ...recipient,
          sendStatus: recipient.selected ? (data.sendStatus?.[recipient.email] || null) : recipient.sendStatus,
          errorMessage: recipient.selected && data.errorDetails?.[recipient.email] ? data.errorDetails[recipient.email] : recipient.errorMessage,
        })));
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  }, [eventId, message, recipients, onSuccess, onClose]);

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
          disabled={isSending || !message.trim() || recipients.filter(r => r.selected).length === 0}
          loading={isSending}
        >
          Send email
        </Button>
      </div>
    ),
    [isSending, message, recipients],
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
        {/* Recipients List */}
        {isLoadingRecipients ? (
          <div
            className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/70"
          >
            Loading recipients...
          </div>
        ) : (
          <RecipientList
            recipients={recipients}
            onRecipientsChange={(updatedRecipients) => {
              setRecipients(updatedRecipients as EmailRecipient[]);
            }}
            showTypeColumn={true}
            getTypeLabel={(r) => (r as EmailRecipient).type === 'host' ? 'Host' : 'Attendee'}
            emptyMessage="No recipients found for this event"
            maxHeight="sm"
          />
        )}

        {/* Message Input */}
        <div>
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-medium"
          >
            Message
            {' '}
            <span
              className="text-red-500"
            >
              *
            </span>
          </label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message to attendees..."
            rows={6}
            disabled={isSending || recipients.filter(r => r.selected).length === 0}
            error={!!error && !message.trim()}
          />
          <p
            className="mt-1 text-xs text-foreground/50"
          >
            This message will be included in the email along with event details.
          </p>
        </div>

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
