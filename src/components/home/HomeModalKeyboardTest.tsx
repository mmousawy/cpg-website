'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import { useSearchParams } from 'next/navigation';
import { Suspense, useContext, useEffect, useRef } from 'react';

const QUERY_PARAM = 'modalTest';

function ModalKeyboardTestFields() {
  return (
    <div
      className="flex flex-col gap-4"
    >
      <p
        className="text-sm text-foreground/70"
      >
        Dev-only keyboard inset test. Focus each field on mobile; the modal should stay above the keyboard.
      </p>
      <Input
        type="text"
        placeholder="Top field"
        autoComplete="off"
      />
      <Input
        type="email"
        placeholder="Email field"
        autoComplete="off"
      />
      <div
        className="h-48 shrink-0 rounded-lg border border-dashed border-border-color bg-background/50"
        aria-hidden
      />
      <Textarea
        placeholder="Message (textarea)"
        rows={4}
      />
      <Input
        type="text"
        placeholder="Bottom field"
        autoComplete="off"
      />
    </div>
  );
}

function HomeModalKeyboardTestInner() {
  const searchParams = useSearchParams();
  const modal = useContext(ModalContext);
  const openedForParamRef = useRef(false);

  const shouldOpen = searchParams.get(QUERY_PARAM) === '1';

  useEffect(() => {
    if (!shouldOpen) {
      openedForParamRef.current = false;
      return;
    }
    if (openedForParamRef.current) return;
    openedForParamRef.current = true;

    modal.setTitle('Keyboard test modal');
    modal.setContent(<ModalKeyboardTestFields />);
    modal.setFooter(
      <div
        className="flex justify-end"
      >
        <Button
          variant="secondary"
          onClick={() => modal.setIsOpen(false)}
        >
          Close
        </Button>
      </div>,
    );
    modal.setIsOpen(true);
  }, [modal, shouldOpen]);

  if (!shouldOpen) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-40 sm:hidden"
    >
      <Button
        variant="secondary"
        fullWidth
        onClick={() => {
          modal.setTitle('Keyboard test modal');
          modal.setContent(<ModalKeyboardTestFields />);
          modal.setFooter(
            <div
              className="flex justify-end"
            >
              <Button
                variant="secondary"
                onClick={() => modal.setIsOpen(false)}
              >
                Close
              </Button>
            </div>,
          );
          modal.setIsOpen(true);
        }}
      >
        Reopen test modal
      </Button>
    </div>
  );
}

/** Opens the shared Modal on `/?modalTest=1` in development only. */
export default function HomeModalKeyboardTest() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Suspense
      fallback={null}
    >
      <HomeModalKeyboardTestInner />
    </Suspense>
  );
}
