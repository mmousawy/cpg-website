'use client';

import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';
import Container from '@/components/layout/Container';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';

import TrashSVG from 'public/icons/trash.svg';

// Predefined moderation reasons
const MODERATION_REASONS = [
  'Inappropriate or explicit content',
  'Copyright or intellectual property violation',
  'Spam or promotional content',
  'Harassment or bullying',
  'Misleading or false information',
  'Violates community guidelines',
] as const;

type AlbumModerationPanelProps = {
  albumId: string
  albumTitle: string
  ownerNickname: string
  isSuspended?: boolean
  suspensionReason?: string | null
}

export default function AlbumModerationPanel({
  albumId,
  albumTitle,
  ownerNickname,
  isSuspended = false,
  suspensionReason = null,
}: AlbumModerationPanelProps) {
  const { isAdmin, isLoading } = useAdmin();

  const [actionType, setActionType] = useState<'suspend' | 'delete' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentSuspendedState, setCurrentSuspendedState] = useState(isSuspended);

  // Get the final reason (either selected preset or custom "Other" reason)
  const getFinalReason = () => {
    if (selectedReason === 'other') {
      return customReason.trim();
    }
    return selectedReason;
  };

  // Reset form state
  const resetForm = () => {
    setActionType(null);
    setSelectedReason('');
    setCustomReason('');
    setError(null);
  };

  // Don't render anything if not an admin or still loading
  if (isLoading || !isAdmin) {
    return null;
  }

  const handleSuspend = async () => {
    const reason = getFinalReason();
    if (!reason) {
      setError('Please select or provide a reason for suspension');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/albums/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId,
          reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to suspend album');
      }

      setSuccess('Album has been suspended');
      setCurrentSuspendedState(true);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsuspend = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/albums/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unsuspend album');
      }

      setSuccess('Album has been unsuspended');
      setCurrentSuspendedState(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const reason = getFinalReason();
    if (!reason) {
      setError('Please select or provide a reason for deletion');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/albums/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId,
          reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete album');
      }

      setSuccess('Album has been deleted. Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="border-orange-500/30 bg-orange-500/5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="size-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="font-semibold text-orange-600">Admin moderation</h3>
      </div>

      <p className="text-sm text-foreground/70 mb-4">
        Album: <strong>{albumTitle}</strong> by <strong>@{ownerNickname}</strong>
      </p>

      <p className="text-sm text-foreground/70 mb-4">
        You can suspend or delete this album if it violates our community guidelines.<br />You will have to provide a reason for your action.
      </p>

      {/* Current suspension status */}
      {currentSuspendedState && (
        <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm">
          <p className="font-medium text-red-600">This album is currently suspended</p>
          {suspensionReason && (
            <p className="mt-1 text-foreground/70">Reason: {suspensionReason}</p>
          )}
        </div>
      )}

      {error && <ErrorMessage variant="compact" className="mb-4">{error}</ErrorMessage>}
      {success && <SuccessMessage variant="compact" className="mb-4">{success}</SuccessMessage>}

      {/* Action buttons */}
      {!actionType && (
        <div className="flex flex-wrap gap-2">
          {currentSuspendedState ? (
            <Button
              variant="secondary"
              onClick={handleUnsuspend}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Unsuspend Album'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setActionType('suspend')}
            >
              Suspend Album
            </Button>
          )}
          <Button
            variant="danger"
            icon={<TrashSVG className="size-4" />}
            onClick={() => setActionType('delete')}
          >
            Delete Album
          </Button>
        </div>
      )}

      {/* Moderation form (shared for suspend/delete) */}
      {actionType && (
        <div className="space-y-4">
          {actionType === 'delete' && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">
              <strong>Warning:</strong> This action cannot be undone. All photos and comments will be permanently deleted.
            </div>
          )}
          <div>
            <p className="block text-sm font-medium mb-3">
              Reason for {actionType === 'suspend' ? 'suspension' : 'deletion'} *
            </p>
            <div className="space-y-2">
              {MODERATION_REASONS.map((reasonOption) => (
                <label
                  key={reasonOption}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="moderation-reason"
                    value={reasonOption}
                    checked={selectedReason === reasonOption}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="size-4 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground/80 group-hover:text-foreground">
                    {reasonOption}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="moderation-reason"
                  value="other"
                  checked={selectedReason === 'other'}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="size-4 accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground">
                  Other...
                </span>
              </label>
            </div>
            {selectedReason === 'other' && (
              <Textarea
                id="moderation-reason-custom"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={`Explain why this album is being ${actionType === 'suspend' ? 'suspended' : 'deleted'}...`}
                rows={3}
                className="mt-3"
              />
            )}
            <p className="mt-2 text-xs text-foreground/50">
              {actionType === 'suspend'
                ? 'This reason may be shown to the album owner.'
                : 'This reason will be logged for moderation records.'}
            </p>
          </div>
          <div className="flex gap-2">
            {actionType === 'suspend' ? (
              <Button
                onClick={handleSuspend}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Suspending...' : 'Confirm Suspension'}
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<TrashSVG className="size-4" />}
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
