'use client';

import { FieldErrors, UseFormRegister } from 'react-hook-form';

import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';
import Container from '@/components/layout/Container';
import Checkbox from '@/components/shared/Checkbox';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { routes } from '@/config/routes';

interface OnboardingFinishSectionProps {
  register: UseFormRegister<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  submitError: string | null;
  isPreviewMode: boolean;
}

export default function OnboardingFinishSection({
  register,
  errors,
  submitError,
  isPreviewMode,
}: OnboardingFinishSectionProps) {
  return (
    <div>
      <h2
        className="onboarding-step-title mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading"
      >
        One last step
      </h2>
      <Container className="onboarding-rise-in onboarding-rise-in-delay-1">
        <div
          className="space-y-4"
        >
          <div
            className="flex items-start gap-3"
          >
            <Checkbox
              id="terms-accepted"
              {...register('termsAccepted')}
              className="mt-0.5 shrink-0"
            />
            <label
              htmlFor="terms-accepted"
              className="text-sm leading-relaxed"
            >
              I agree to the
              {' '}
              <a
                href={routes.terms.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary-alt underline"
              >
                Terms of Service
              </a>
              {' '}
              and acknowledge that I retain full copyright ownership of my photos.<br />I have also read the
              {' '}
              <a
                href={routes.privacy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary-alt underline"
              >
                Privacy Policy
              </a>
              .
            </label>
          </div>
          {errors.termsAccepted && (
            <p
              className="text-sm text-red-600 dark:text-red-400"
            >
              {errors.termsAccepted.message}
            </p>
          )}

          {submitError && (
            <ErrorMessage>
              {submitError}
            </ErrorMessage>
          )}

          {isPreviewMode ? (
            <p className="text-xs text-foreground/80">
              Use Join the group below to run validation in preview mode.
            </p>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
