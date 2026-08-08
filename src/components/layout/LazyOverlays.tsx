'use client';

import dynamic from 'next/dynamic';

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
 * Loads modal UI after hydration. Modals stay mounted so open/close CSS transitions
 * can run (mounting only when isOpen is already true skips the enter animation).
 */
export default function LazyOverlays() {
  const mounted = useMounted();

  if (!mounted) return null;
  return (
    <>
      <Modal />
      <ConfirmModal />
    </>
  );
}
