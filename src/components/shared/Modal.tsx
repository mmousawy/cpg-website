'use client';

import clsx from "clsx";
import { FocusTrap } from "focus-trap-react";
import { useContext, useEffect, useRef, useState } from "react";

import CloseSVG from "public/icons/close.svg";

import { ModalContext } from "@/app/providers/ModalProvider";

export default function Modal() {
  const { isOpen, setIsOpen, title, content, footer, size } = useContext(ModalContext);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  // Size-specific classes for the modal container
  const sizeClasses = {
    default: 'max-w-[30rem]',
    large: 'max-w-6xl w-[90vw]',
    fullscreen: 'max-w-[95vw] w-[95vw] max-h-[90vh]',
  };

  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.show();
        document.body.style.overflow = "hidden";
        // Focus trap the dialog element after a brief delay
        const timerId = setTimeout(() => setIsTrapped(true), 16);
        return () => clearTimeout(timerId);
      } else {
        modalRef.current.close();
        document.body.style.overflow = "auto";
        // Untrap the dialog element (via microtask to satisfy React Compiler)
        const timerId = setTimeout(() => setIsTrapped(false), 0);
        return () => clearTimeout(timerId);
      }
    }
  }, [isOpen]);

  // This effect is used to add an event listener to the dialog element
  useEffect(() => {
    const modal = modalRef.current;

    const closeModal = () => {
      setIsOpen(false);
      console.log("closeModal");
    };

    if (modal && !modal.dataset.isMounted) {
      modal.dataset.isMounted = "true";
      modal.addEventListener("close", closeModal);
    }

    // Cleanup the event listener
    return () => {
      if (modal) {
        modal.removeEventListener("close", closeModal);
      }
    };
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
            "w-full",
            sizeClasses[size],
            "relative m-auto",
            "max-h-[calc(100vh-3rem)] max-sm:max-h-[calc(100vh-2rem)]",
            "flex flex-col",
            "rounded-2xl border-[0.0625rem] border-border-color bg-background-light shadow-xl shadow-black/25",
            "transition-transform duration-300",
          ])}
        >
          {/* Fixed header */}
          <div className="flex-shrink-0 flex items-start justify-between gap-4 p-4 pb-0">
            <h2 className="text-2xl font-bold max-sm:text-xl">{title}</h2>
            <button className="flex-shrink-0 rounded-full border border-border-color p-1 hover:bg-background" onClick={closeModal}>
              <CloseSVG className="fill-foreground" />
            </button>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {content}
          </div>
          {/* Fixed footer for actions */}
          {footer && (
            <div className="relative flex-shrink-0 border-t border-border-color-strong p-4">
              <div className="absolute -top-[17px] left-0 right-0 bg-gradient-to-b from-transparent to-background-light h-4 w-full pointer-events-none"></div>
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </dialog>
  );
}
