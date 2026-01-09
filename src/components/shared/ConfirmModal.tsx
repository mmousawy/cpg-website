'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';

import { useConfirmState } from '@/app/providers/ConfirmProvider';
import Button from './Button';
import TrashSVG from 'public/icons/trash.svg';

export default function ConfirmModal() {
  const { isOpen, options, resolve } = useConfirmState();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);

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

  const handleConfirm = () => {
    resolve?.(true);
  };

  const handleCancel = () => {
    resolve?.(false);
  };

  const isDanger = options?.variant === 'danger';

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        'fixed inset-0 z-[60] overflow-auto',
        'flex size-full max-h-none max-w-none p-6 max-sm:p-4',
        'bg-black/40 backdrop-blur-sm',
        'transition-[visibility,opacity] duration-300',
      ])}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          onDeactivate: handleCancel,
        }}
      >
        <div
          className={clsx([
            isOpen ? 'scale-100' : 'scale-95',
            'w-full max-w-md',
            'relative m-auto',
            'rounded-2xl border-[0.0625rem] border-border-color bg-background-light p-6 shadow-xl shadow-black/25',
            'transition-transform duration-300',
          ])}
        >
          <h2 className="mb-3 text-xl font-bold">{options?.title}</h2>
          <p className="text-foreground/70">{options?.message}</p>

          {options?.content && (
            <div className="my-4 max-h-48 overflow-y-auto">
              {options.content}
            </div>
          )}

          <div className={clsx('flex justify-end gap-3', !options?.content && 'mt-6')}>
            <Button variant="secondary" onClick={handleCancel}>
              {options?.cancelLabel || 'Cancel'}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              onClick={handleConfirm}
              icon={isDanger ? <TrashSVG className="size-4 -ml-0.5" /> : undefined}
            >
              {options?.confirmLabel || 'Confirm'}
            </Button>
          </div>
        </div>
      </FocusTrap>
    </dialog>
  );
}
