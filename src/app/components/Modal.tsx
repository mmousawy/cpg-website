'use client';

import clsx from "clsx";
import { useContext, useEffect, useRef } from "react";

import CloseSVG from "public/icons/close.svg";

import { ModalContext } from "@/app/providers/ModalProvider";

export default function Modal() {
  const { isOpen, setIsOpen, title, content } = useContext(ModalContext);
  const modalRef = useRef<HTMLDialogElement>(null);

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.showModal();

        document.body.style.overflow = "hidden";
      } else {
        modalRef.current.close();

        document.body.style.overflow = "auto";
      }
    }
  }, [isOpen]);

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0",
        "fixed inset-0 z-50",
        "flex size-full max-h-none max-w-none p-6 max-sm:p-4",
        "bg-transparent backdrop:bg-black/40 backdrop:backdrop-blur-sm",
        "transition-[visibility,opacity] duration-300",
      ])}
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
    </dialog>
  )
}
