'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import type { Tables } from '@/database.types';

interface EmailAttendeesModalProps {
  eventId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type Recipient = {
  email: string;
  name: string;
  type: 'attendee' | 'host';
};

export default function EmailAttendeesModal({
  eventId,
  onClose,
  onSuccess,
}: EmailAttendeesModalProps) {
  const supabase = createClient();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    loadRecipients();
  }, [eventId]);

  const loadRecipients = async () => {
    setIsLoadingRecipients(true);
    setError(null);

    try {
      // Fetch confirmed RSVPs
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('events_rsvps')
        .select('id, email, name, user_id')
        .eq('event_id', eventId)
        .not('confirmed_at', 'is', null)
        .is('canceled_at', null)
        .not('email', 'is', null);

      if (rsvpsError) {
        throw new Error('Failed to load RSVPs');
      }

      // Fetch all admin profiles (hosts)
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('is_admin', true)
        .is('suspended_at', null)
        .not('email', 'is', null);

      if (adminsError) {
        throw new Error('Failed to load admin profiles');
      }

      // Combine and deduplicate by email
      const recipientMap = new Map<string, Recipient>();

      // Add RSVPs
      if (rsvps) {
        rsvps.forEach((rsvp) => {
          if (rsvp.email) {
            recipientMap.set(rsvp.email.toLowerCase(), {
              email: rsvp.email,
              name: rsvp.name || rsvp.email.split('@')[0] || 'Friend',
              type: 'attendee',
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
              type: 'host',
            });
          }
        });
      }

      setRecipients(Array.from(recipientMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients');
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send emails');
      }

      setSuccess(true);
      setSendResult(data);
      
      if (onSuccess) {
        onSuccess();
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const attendees = recipients.filter(r => r.type === 'attendee');
  const hosts = recipients.filter(r => r.type === 'host');

  return (
    <div className="space-y-6">
      {/* Recipients List */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Recipients ({recipients.length})
        </h3>
        
        {isLoadingRecipients ? (
          <div className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/70">
            Loading recipients...
          </div>
        ) : recipients.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/70">
            No recipients found for this event
          </div>
        ) : (
          <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border border-border-color bg-background-light p-4">
            {/* Hosts */}
            {hosts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-foreground/70">
                  Hosts ({hosts.length})
                </p>
                <div className="space-y-1">
                  {hosts.map((host, idx) => (
                    <div key={idx} className="text-sm text-foreground/80">
                      {host.name} &lt;{host.email}&gt;
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className={hosts.length > 0 ? 'mt-4' : ''}>
                <p className="mb-2 text-xs font-medium text-foreground/70">
                  Confirmed attendees ({attendees.length})
                </p>
                <div className="space-y-1">
                  {attendees.map((attendee, idx) => (
                    <div key={idx} className="text-sm text-foreground/80">
                      {attendee.name} &lt;{attendee.email}&gt;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium">
          Message <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message to attendees..."
          rows={6}
          disabled={isSending || recipients.length === 0}
          error={!!error && !message.trim()}
        />
        <p className="mt-1 text-xs text-foreground/50">
          This message will be included in the email along with event details.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage variant="compact">{error}</ErrorMessage>
      )}

      {/* Success Message */}
      {success && sendResult && (
        <SuccessMessage variant="compact">
          Successfully sent {sendResult.sent} of {sendResult.total} emails
          {sendResult.failed > 0 && ` (${sendResult.failed} failed)`}
        </SuccessMessage>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={isSending || !message.trim() || recipients.length === 0}
          loading={isSending}
        >
          Send email
        </Button>
      </div>
    </div>
  );
}
