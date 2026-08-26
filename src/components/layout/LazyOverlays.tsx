'use client';

import dynamic from 'next/dynamic';
import { useContext } from 'react';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useConfirmState } from '@/app/providers/ConfirmProvider';
import { useKeepMounted } from '@/hooks/useKeepMounted';

const Modal = dynamic(
  () => import('@/components/shared/Modal'),
  { ssr: false },
);

const ConfirmModal = dynamic(
  () => import('@/components/shared/ConfirmModal'),
  { ssr: false },
);

/**
 * Loads modal UI the first time one opens, then keeps it mounted so close
 * transitions can run.
 */
export default function LazyOverlays() {
  const { isOpen: modalOpen } = useContext(ModalContext);
  const { isOpen: confirmOpen } = useConfirmState();
  const modalReady = useKeepMounted(modalOpen);
  const confirmReady = useKeepMounted(confirmOpen);

  return (
    <>
      {modalReady ? <Modal /> : null}
      {confirmReady ? <ConfirmModal /> : null}
    </>
  );
}
