'use client';

import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import { useEffect, useRef, useState } from 'react';

import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';
import type { Tables } from '@/database.types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Member = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'is_admin'
  | 'created_at'
  | 'last_logged_in'
  | 'suspended_at'
  | 'suspended_reason'
  | 'deletion_scheduled_at'
>;

interface MemberConfirmDialogProps {
  type: 'suspend' | 'delete' | 'unsuspend' | 'cancel-deletion';
  member: Member;
  suspendReason: string;
  onSuspendReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function MemberConfirmDialog({
  type,
  member,
  suspendReason,
  onSuspendReasonChange,
  onConfirm,
  onCancel,
  isLoading,
}: MemberConfirmDialogProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    modalRef.current?.show();
    const visibilityTimer = requestAnimationFrame(() => setIsVisible(true));
    const trapTimerId = setTimeout(() => setIsTrapped(true), 16);

    return () => {
      cancelAnimationFrame(visibilityTimer);
      clearTimeout(trapTimerId);
    };
  }, []);

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isVisible ? 'visible opacity-100' : 'invisible opacity-0',
        'fixed inset-0 z-60 overflow-auto',
        'flex size-full max-h-none max-w-none p-4',
        'bg-black/40 backdrop-blur-sm',
        'transition-[visibility,opacity] duration-300',
      ])}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: !isLoading,
          onDeactivate: onCancel,
          fallbackFocus: () => modalRef.current || document.body,
        }}
      >
        <div
          className={clsx(
            'w-full max-w-md relative m-auto rounded-2xl border border-border-color bg-background-light p-6 shadow-xl shadow-black/25 transition-transform duration-300',
            isVisible ? 'scale-100' : 'scale-95',
          )}
        >
          <h3
            className="mb-4 text-lg font-semibold"
          >
            {type === 'delete' && 'Delete Member'}
            {type === 'suspend' && 'Suspend Member'}
            {type === 'unsuspend' && 'Unsuspend Member'}
            {type === 'cancel-deletion' && 'Cancel Scheduled Deletion'}
          </h3>

          <p
            className="mb-4 text-foreground/80"
          >
            {type === 'delete' && (
              <>
                Are you sure you want to schedule
                {' '}
                <strong>
                  {member.full_name || member.email}
                </strong>
                {' '}
                for deletion? Their account and all content will be permanently removed after 30 days.
              </>
          )}
            {type === 'suspend' && (
              <>
                Are you sure you want to suspend
                {' '}
                <strong>
                  {member.full_name || member.email}
                </strong>
                ?
                They will not be able to access their account.
              </>
          )}
            {type === 'unsuspend' && (
              <>
                Are you sure you want to unsuspend
                {' '}
                <strong>
                  {member.full_name || member.email}
                </strong>
                ?
                They will regain access to their account.
              </>
          )}
            {type === 'cancel-deletion' && (
              <>
                Are you sure you want to cancel the scheduled deletion for
                {' '}
                <strong>
                  {member.full_name || member.email}
                </strong>
                ?
                They will regain access to their account.
              </>
          )}
          </p>

          {type === 'suspend' && (
            <div
              className="mb-4"
            >
              <label
                className="mb-2 block text-sm font-medium"
              >
                Reason (optional)
              </label>
              <Textarea
                value={suspendReason}
                onChange={(e) => onSuspendReasonChange(e.target.value)}
                placeholder="Enter a reason for suspension..."
                rows={3}
              />
            </div>
        )}

          <div
            className="flex justify-end gap-3"
          >
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={type === 'delete' ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={isLoading}
            >
              {type === 'delete' && 'Schedule deletion'}
              {type === 'suspend' && 'Suspend'}
              {type === 'unsuspend' && 'Unsuspend'}
              {type === 'cancel-deletion' && 'Cancel deletion'}
            </Button>
          </div>
        </div>
      </FocusTrap>
    </dialog>
  );
}
