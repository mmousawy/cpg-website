'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import type { AccountStats } from '@/hooks/useAccountForm';

interface DeleteAccountSectionProps {
  stats: AccountStats;
}

export default function DeleteAccountSection({ stats }: DeleteAccountSectionProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule account deletion');
      }

      // Redirect to the account deleted notice page
      router.push('/account-deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div>
        <h2
          className="mb-4 text-lg font-semibold text-red-600"
        >
          Danger zone
        </h2>
        <Container>
          <div
            className="space-y-3"
          >
            <p
              className="text-sm text-foreground/70"
            >
              Permanently delete your account and all associated content. This action schedules your account for deletion — your content will be permanently removed within 30 days.
            </p>
            <Button
              variant="danger"
              onClick={() => setShowModal(true)}
            >
              Delete my account
            </Button>
          </div>
        </Container>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            className="w-full max-w-md rounded-lg border border-border-color bg-background-light p-6 shadow-xl"
          >
            <h3
              className="mb-4 text-lg font-semibold text-red-600"
            >
              Delete your account
            </h3>

            <p
              className="mb-4 text-sm text-foreground/70"
            >
              This will schedule your account for permanent deletion. After 30 days, the following will be permanently removed:
            </p>

            <ul
              className="mb-4 ml-4 list-disc space-y-1 text-sm text-foreground/70"
            >
              <li>
                Your profile and account information
              </li>
              {stats.photos > 0 && (
                <li>
                  {stats.photos}
                  {' '}
                  {stats.photos === 1 ? 'photo' : 'photos'}
                  {' '}
                  (including photos contributed to shared albums)
                </li>
              )}
              {stats.albums > 0 && (
                <li>
                  {stats.albums}
                  {' '}
                  {stats.albums === 1 ? 'album' : 'albums'}
                </li>
              )}
              {stats.commentsMade > 0 && (
                <li>
                  {stats.commentsMade}
                  {' '}
                  {stats.commentsMade === 1 ? 'comment' : 'comments'}
                </li>
              )}
              <li>
                All likes, event RSVPs, and other activity
              </li>
            </ul>

            <p
              className="mb-4 text-sm text-foreground/70"
            >
              You will be signed out immediately and won&apos;t be able to log in. If you change your mind, contact us through the contact form within 30 days.
            </p>

            {/* Confirmation checkbox */}
            <Checkbox
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              label="I understand that my profile and all my associated content will be permanently deleted"
              labelClassName="mb-4 flex items-start gap-3 cursor-pointer"
            />

            {error && (
              <div
                className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            <div
              className="flex justify-end gap-3"
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setConfirmed(false);
                  setError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!confirmed || isDeleting}
                loading={isDeleting}
              >
                Delete my account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
