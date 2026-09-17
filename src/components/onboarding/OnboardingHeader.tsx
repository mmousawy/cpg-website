'use client';

import { useCallback, useContext } from 'react';
import LogoSVG from 'public/cpg-logo.svg';
import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

import { ModalContext } from '@/app/providers/ModalProvider';
import { onboardingChromeInnerClassName } from '@/components/onboarding/onboardingLayout';
import { gettingStartedFAQ } from '@/content/help/getting-started';

const setupProfileHelpItem = gettingStartedFAQ.items.find((item) => item.id === 'setup-profile');

const helpArticleClassName =
  'text-foreground/80 text-sm sm:text-base [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5';

/** Title chrome for steps after intro: logo, group name, and help. */
export default function OnboardingHeader() {
  const modalContext = useContext(ModalContext);

  const openHelp = useCallback(() => {
    if (!setupProfileHelpItem) return;
    modalContext.setSize('medium');
    modalContext.setFlushContentTop(false);
    modalContext.setFooter(null);
    modalContext.setTitle(setupProfileHelpItem.title);
    modalContext.setContent(
      <div className={helpArticleClassName}>
        {setupProfileHelpItem.content}
      </div>,
    );
    modalContext.setIsOpen(true);
  }, [modalContext]);

  return (
    <header className="onboarding-header-slide-in sticky top-0 z-40 border-b border-b-border-color bg-background-light px-3 py-2 text-foreground shadow-md shadow-[#00000005]">
      <div className={`${onboardingChromeInnerClassName} flex items-center gap-3`}>
        <LogoSVG
          className="block size-12 shrink-0 sm:size-14"
          aria-hidden
        />
        <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-bold sm:text-2xl">
          Creative Photography Group
        </h1>
        <button
          type="button"
          onClick={openHelp}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-1 py-1 text-sm font-medium text-foreground/50 transition-colors hover:text-primary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Help with profile setup"
        >
          <QuestionMarkCircleSVG className="size-4.5" aria-hidden />
          Help
        </button>
      </div>
    </header>
  );
}
