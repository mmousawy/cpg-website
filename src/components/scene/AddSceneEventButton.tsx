'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useContext } from 'react';

import AddSceneEventModal from './AddSceneEventModal';

import PlusSVG from 'public/icons/plus.svg';

export default function AddSceneEventButton() {
  const { user } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const modalContext = useContext(ModalContext);

  const handleClick = () => {
    if (!user) {
      showAuthPrompt({ feature: 'add an event to Scene' });
      return;
    }

    modalContext.setSize('medium');
    modalContext.setFlushContentTop(true);
    modalContext.setTitle('Add an event');
    modalContext.setContent(
      <AddSceneEventModal
        key={Date.now()}
      />,
    );
    modalContext.setIsOpen(true);
  };

  return (
    <Button
      onClick={handleClick}
      variant="primary"
      icon={<PlusSVG
        className="size-5 -ml-1"
      />}
    >
      Add an event
    </Button>
  );
}
