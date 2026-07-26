'use client';

import dynamic from 'next/dynamic';
import { useContext } from 'react';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useConfirmState } from '@/app/providers/ConfirmProvider';
import { useMounted } from '@/hooks/useMounted';
const Modal = dynamic(
  () => import('@/components/shared/Modal'),
  { ssr: false },
);

const ConfirmModal = dynamic(
  () => import('@/components/shared/ConfirmModal'),
  { ssr: false },
);

/**
 * Loads modal UI only after hydration and only when a modal is actually open.
 */
export default function LazyOverlays() {
  const { isOpen: modalOpen } = useContext(ModalContext);
  const { isOpen: confirmOpen } = useConfirmState();
  const mounted = useMounted();

  if (!mounted) return null;
  return (
    <>
      {modalOpen ? <Modal /> : null}
      {confirmOpen ? <ConfirmModal /> : null}
    </>
  );
}
