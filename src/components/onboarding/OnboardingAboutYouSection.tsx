'use client';

import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';
import Container from '@/components/layout/Container';
import Input from '@/components/shared/Input';
import InterestInput from '@/components/shared/InterestInput';
import Textarea from '@/components/shared/Textarea';

interface OnboardingAboutYouSectionProps {
  register: UseFormRegister<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  isOAuthUser: boolean;
  watch: UseFormWatch<OnboardingFormData>;
  setValue: UseFormSetValue<OnboardingFormData>;
  isSaving: boolean;
}

export default function OnboardingAboutYouSection({
  register,
  errors,
  isOAuthUser,
  watch,
  setValue,
  isSaving,
}: OnboardingAboutYouSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70 font-heading"
      >
        About you
      </h2>
      <Container>
        <div
          className="space-y-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="fullName"
              className="text-sm font-medium"
            >
              Full name
            </label>
            <Input
              id="fullName"
              type="text"
              {...register('fullName')}
              placeholder="Your full name"
            />
            {errors.fullName && (
              <p
                className="text-sm text-red-500"
              >
                {errors.fullName.message}
              </p>
            )}
          </div>

          {isOAuthUser && (
            <div
              className="flex flex-col gap-2"
            >
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                {...register('email', { required: isOAuthUser ? 'Email is required' : false })}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p
                  className="text-sm text-red-500"
                >
                  {errors.email.message}
                </p>
              )}
              <p
                className="text-xs text-foreground/80"
              >
                This email will be used for notifications and account communications.
              </p>
            </div>
          )}

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="bio"
              className="text-sm font-medium"
            >
              Bio
              <span
                className="ml-1.5 text-xs font-normal text-foreground/50"
              >
                (optional)
              </span>
            </label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="interests"
              className="text-sm font-medium"
            >
              Interests
              <span
                className="ml-1.5 text-xs font-normal text-foreground/50"
              >
                (optional)
              </span>
            </label>
            <InterestInput
              id="interests"
              interests={watch('interests') || []}
              onAddInterest={(interest) => {
                const currentInterests = watch('interests') || [];
                if (!currentInterests.includes(interest) && currentInterests.length < 10) {
                  setValue('interests', [...currentInterests, interest]);
                }
              }}
              onRemoveInterest={(interest) => {
                const currentInterests = watch('interests') || [];
                setValue('interests', currentInterests.filter((i: string) => i !== interest));
              }}
              maxInterests={10}
              placeholder="Type an interest and press Enter"
              helperText="Add up to 10 interests to help others discover your profile. Click the input to see popular interests."
              disabled={isSaving}
            />
          </div>

          <p
            className="text-xs text-foreground/80"
          >
            You can update these details later in your account settings.
          </p>
        </div>
      </Container>
    </div>
  );
}
