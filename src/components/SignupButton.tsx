'use client';

import clsx from 'clsx';
import { useContext } from 'react';

import SignupForm from './SignupForm';

import { ModalContext } from '@/app/providers/ModalProvider';
import { CPGEvent } from '@/components/Events';

import CheckSVG from 'public/icons/check.svg';

type Props = {
  className?: string;
  event?: CPGEvent;
}

export default function SignupButton({ className, event }: Props) {
  const modalContext = useContext(ModalContext);

  const openModal = () => {
    modalContext.setTitle(`${event?.title}`);
    modalContext.setContent(<SignupForm event={event} />);
    modalContext.setIsOpen(true);
  };

  return (
    <div
      className={className}
    >
      <button
        className={clsx([
          "font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-white",
          "flex items-center justify-center justify-self-start rounded-full border-[0.0625rem] border-primary bg-primary fill-white px-3 py-1",
          "hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950"
        ])}
        onClick={openModal}
      >
        <CheckSVG className="mr-2 inline-block" />
        <span className="text-nowrap">Sign up</span>
      </button>
    </div>
  );
}
