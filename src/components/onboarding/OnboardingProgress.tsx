'use client';

import clsx from 'clsx';
import { forwardRef, type ReactNode } from 'react';

import { onboardingChromeInnerClassName } from '@/components/onboarding/onboardingLayout';
import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_LABELS,
  type OnboardingStepIndex,
} from '@/components/onboarding/onboardingSteps';
import Button from '@/components/shared/Button';

type OnboardingProgressProps = {
  step: OnboardingStepIndex;
  onBack?: () => void;
  showBack: boolean;
  primaryAction: ReactNode;
};

const OnboardingProgress = forwardRef<HTMLDivElement, OnboardingProgressProps>(
  function OnboardingProgress({ step, onBack, showBack, primaryAction }, ref) {
    const stepLabel = ONBOARDING_STEP_LABELS[step];
    const stepNumber = step + 1;

    return (
      <div
        ref={ref}
        className="onboarding-progress-slide-in fixed inset-x-0 bottom-0 z-30 border-t border-border-color bg-background-light px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className={`${onboardingChromeInnerClassName} pt-3`}>
          <p className="sr-only" aria-live="polite">
            Step {stepNumber} of {ONBOARDING_STEP_COUNT}: {stepLabel}
          </p>
          <div className="mb-2 text-xs text-foreground/80">
            <span className="font-medium text-foreground">
              {stepLabel}
              {' '}
              <span className="font-normal text-foreground/70">
                · {stepNumber} of {ONBOARDING_STEP_COUNT}
              </span>
            </span>
          </div>
          <ol className="mb-3 flex gap-1.5" aria-hidden>
            {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => {
              const isComplete = index < step;
              const isCurrent = index === step;
              return (
                <li
                  key={index}
                  className={clsx(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    isComplete && 'bg-primary',
                    isCurrent && 'bg-yellow-500',
                    !isComplete && !isCurrent && 'bg-foreground/15',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                />
              );
            })}
          </ol>
          <div className="flex items-center justify-end gap-2">
            {showBack ? (
              <Button
                type="button"
                variant="secondary"
                className="mr-auto shrink-0"
                onClick={onBack}
              >
                Back
              </Button>
            ) : null}
            {primaryAction}
          </div>
        </div>
      </div>
    );
  },
);

export default OnboardingProgress;
