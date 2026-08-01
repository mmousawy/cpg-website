'use client';

import { useContext } from 'react';
import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';

type FeedbackButtonProps = {
  variant?: 'button' | 'link';
  className?: string;
};

/**
 * Button to open the feedback modal.
 * Can be rendered as a button or link (e.g. in footer).
 */
export default function FeedbackButton({ variant = 'button', className }: FeedbackButtonProps) {
  const modalContext = useContext(ModalContext);

  const handleClick = async () => {
    const { default: FeedbackModal } = await import('@/components/shared/FeedbackModal');

    modalContext.setSize('default');
    modalContext.setTitle('Send feedback');
    modalContext.setContent(
      <FeedbackModal
        onSuccess={() => {
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`opacity-70 hover:opacity-100 transition-opacity ${className || ''}`}
      >
        Feedback
      </button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      Feedback
    </Button>
  );
}
