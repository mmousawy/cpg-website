'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useCanInteract } from '@/hooks/useCanInteract';
import { UNDER_REVIEW_INTERACTION_HINT } from '@/lib/memberReview/underReviewGate';
import { useContext } from 'react';

import AddSceneEventModal from './AddSceneEventModal';
import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';

import PlusSVG from 'public/icons/plus.svg';

export default function AddSceneEventButton() {
  const { isLoggedIn, canInteract } = useCanInteract();
  const showAuthPrompt = useAuthPrompt();
  const modalContext = useContext(ModalContext);

  const handleClick = () => {
    if (!isLoggedIn) {
      showAuthPrompt({ feature: 'add an event to Scene' });
      return;
    }

    if (!canInteract) {
      return;
    }

    modalContext.setSize('medium');
    modalContext.setFlushContentTop(true);
    modalContext.setTitle('Add an event');
    modalContext.setContent(
      <UnsavedChangesProvider>
        <AddSceneEventModal
          key={Date.now()}
        />
      </UnsavedChangesProvider>,
    );
    modalContext.setIsOpen(true);
  };

  return (
    <Button
      onClick={handleClick}
      variant="primary"
      disabled={isLoggedIn && !canInteract}
      title={isLoggedIn && !canInteract ? UNDER_REVIEW_INTERACTION_HINT : undefined}
      icon={<PlusSVG
        className="size-5 -ml-1"
      />}
    >
      Add an event
    </Button>
  );
}
