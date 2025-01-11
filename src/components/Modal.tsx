'use client';

import { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { FocusTrap } from "focus-trap-react";

import CloseSVG from "public/icons/close.svg";

import { ModalContext } from "@/app/providers/ModalProvider";

export default function Modal() {
  const { isOpen, setIsOpen, title, content } = useContext(ModalContext);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.show();

        document.body.style.overflow = "hidden";

        // Focus trap the dialog element
        setTimeout(() => setIsTrapped(true), 16);
      } else {
        modalRef.current.close();

        document.body.style.overflow = "auto";

        // Untrap the dialog element
        setIsTrapped(false);
      }
    }
  }, [isOpen]);

  // This effect is used to add an event listener to the dialog element
  useEffect(() => {
    const modal = modalRef.current;

    const closeModal = () => {
      setIsOpen(false);
      console.log("closeModal");
    }

    if (modal && !modal.dataset.isMounted) {
      modal.dataset.isMounted = "true";
      modal.addEventListener("close", closeModal);
    }

    // Cleanup the event listener
    return () => {
      if (modal) {
        modal.removeEventListener("close", closeModal);
      }
    }
  });

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0",
        "fixed inset-0 z-50 overflow-auto",
        "flex size-full max-h-none max-w-none p-6 max-sm:p-4",
        "bg-black/40 backdrop-blur-sm",
        "transition-[visibility,opacity] duration-300",
      ])}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          onDeactivate: () => setIsOpen(false),
        }}
      >
        <div
          className={clsx([
            isOpen ? "scale-100" : "scale-95",
            "w-full max-w-[30rem]",
            "relative m-auto",
            "rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-xl shadow-black/25",
            "transition-transform duration-300",
          ])}
        >
          <button className="absolute right-6 top-6 rounded-full border border-border-color p-1 hover:bg-background" onClick={closeModal}>
            <CloseSVG className="fill-foreground" />
          </button>
          <h2 className="mb-6 pr-12 text-2xl font-bold max-sm:text-xl">{title}</h2>
          {content}
        </div>
      </FocusTrap>
    </dialog>
  )
}
