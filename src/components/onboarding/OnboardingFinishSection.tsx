'use client';

import { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';

import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { routes } from '@/config/routes';
import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';

interface OnboardingFinishSectionProps {
  register: UseFormRegister<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  watch: UseFormWatch<OnboardingFormData>;
  submitError: string | null;
  isPreviewMode: boolean;
  isSaving: boolean;
  isOAuthUser: boolean;
  nicknameAvailable: boolean | null;
  watchedNickname: string;
}

export default function OnboardingFinishSection({
  register,
  errors,
  watch,
  submitError,
  isPreviewMode,
  isSaving,
  isOAuthUser,
  nicknameAvailable,
  watchedNickname,
}: OnboardingFinishSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70 font-heading"
      >
        One last step
      </h2>
      <Container>
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
              and acknowledge that I retain full copyright ownership of my photos. I have also read the
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

          {isPreviewMode && (
            <div
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400"
            >
              <strong>
                Preview mode:
              </strong>
              {' '}
              Auth and profile-completion redirects are disabled. Form validation
              works, but submission will not save your profile.
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSaving ||
              nicknameAvailable === false ||
              !watchedNickname ||
              (isOAuthUser && !watch('email') && !isPreviewMode) ||
              !watch('termsAccepted')
            }
            loading={isSaving}
          >
            {isPreviewMode ? 'Test form validation' : 'Complete setup'}
          </Button>
        </div>
      </Container>
    </div>
  );
}
