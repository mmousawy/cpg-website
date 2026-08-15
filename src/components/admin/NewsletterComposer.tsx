'use client';

import RecipientList, { Recipient, recipientsFromProfiles } from '@/components/admin/RecipientList';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import RichTextEditor, { isEmptyContent } from '@/components/shared/RichTextEditor';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { useEmailImageUpload } from '@/hooks/useEmailImageUpload';
import { useCallback, useEffect, useState } from 'react';

type Subscriber = Recipient;

type SendResult = {
  sent: number;
  failed: number;
  total: number;
  totalProfiles?: number;
  optedOut?: number;
  sendStatus?: Record<string, 'success' | 'error'>;
  errorDetails?: Record<string, string>;
  testEmail?: boolean;
  message?: string;
};

export default function NewsletterComposer() {
  const uploadImage = useEmailImageUpload();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    const loadSubscribers = async () => {
      setIsLoadingSubscribers(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/email-recipients?emailType=newsletter');
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
  }, []);

  const handleSendTest = useCallback(async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (isEmptyContent(body)) {
      setError('Please enter the newsletter content');
      return;
    }

    setIsSendingTest(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          testEmail: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send test email');
      }

      setSuccess(true);
      setSendResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  }, [subject, body]);

  const handleSend = useCallback(async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (isEmptyContent(body)) {
      setError('Please enter the newsletter content');
      return;
    }

    const selectedSubscribers = subscribers.filter(s => s.selected);

    if (selectedSubscribers.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipientEmails: selectedSubscribers.map(s => s.email),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send newsletter');
      }

      setSuccess(true);
      setSendResult(data);

      if (data.sendStatus) {
        setSubscribers(prev => prev.map(sub => ({
          ...sub,
          sendStatus: sub.selected ? (data.sendStatus?.[sub.email] || null) : sub.sendStatus,
          errorMessage: sub.selected && data.errorDetails?.[sub.email] ? data.errorDetails[sub.email] : sub.errorMessage,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send newsletter');
    } finally {
      setIsSending(false);
    }
  }, [subject, body, subscribers]);

  const canSend = subject.trim() && !isEmptyContent(body);
  const selectedCount = subscribers.filter(s => s.selected).length;

  return (
    <div
      className="space-y-4"
    >
      <div
        className="rounded-lg border border-border-color bg-background-light p-4 sm:p-6"
      >
        <h2
          className="mb-2 text-lg sm:text-xl font-semibold"
        >
          Send newsletter
        </h2>
        <p
          className="mb-4 text-sm text-foreground/80"
        >
          Compose and send a newsletter to members who have not opted out of newsletter emails.
        </p>

        <div
          className="space-y-4"
        >
          {/* Subject */}
          <div>
            <label
              htmlFor="newsletter-subject"
              className="mb-2 block text-sm font-medium"
            >
              Subject
              {' '}
              <span
                className="text-red-500"
              >
                *
              </span>
            </label>
            <Input
              id="newsletter-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject line"
              disabled={isSending || isSendingTest}
              error={!!error && !subject.trim()}
            />
          </div>

          {/* Body */}
          <div>
            <label
              htmlFor="newsletter-body"
              className="mb-2 block text-sm font-medium"
            >
              Content
              {' '}
              <span
                className="text-red-500"
              >
                *
              </span>
            </label>
            <RichTextEditor
              id="newsletter-body"
              value={body}
              onChange={setBody}
              onImageUpload={uploadImage}
              placeholder="Enter your newsletter content..."
              disabled={isSending || isSendingTest}
              error={!!error && isEmptyContent(body)}
              variant="email"
            />
          </div>

          {/* Recipients */}
          <div>
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
                emptyMessage="No recipients found. All members may have opted out of newsletter emails."
              />
            )}
          </div>

          {/* Actions */}
          <div
            className="flex flex-wrap gap-3"
          >
            <Button
              variant="secondary"
              onClick={handleSendTest}
              disabled={!canSend || isSending || isSendingTest}
              loading={isSendingTest}
            >
              Send test email
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!canSend || selectedCount === 0 || isSending || isSendingTest}
              loading={isSending}
            >
              Send newsletter
            </Button>
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
              {sendResult.testEmail ? (
                <SuccessMessage
                  variant="compact"
                >
                  {sendResult.message || 'Test email sent successfully'}
                </SuccessMessage>
              ) : sendResult.failed === 0 ? (
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
                              className="cursor-pointer text-foreground/80 hover:text-foreground"
                            >
                              View error details
                            </summary>
                            <div
                              className="mt-2 space-y-1 rounded-md bg-red-500/10 p-2"
                            >
                              {Object.entries(sendResult.errorDetails).map(([email, err]) => (
                                <div
                                  key={email}
                                  className="wrap-break-word"
                                >
                                  <span
                                    className="font-medium"
                                  >
                                    {email}
                                    :
                                  </span>
                                  {' '}
                                  {String(err)}
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
      </div>
    </div>
  );
}
