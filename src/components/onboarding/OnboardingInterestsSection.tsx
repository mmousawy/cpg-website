'use client';

import InterestInput from '@/components/shared/InterestInput';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';

interface OnboardingInterestsSectionProps {
  watch: UseFormWatch<OnboardingFormData>;
  setValue: UseFormSetValue<OnboardingFormData>;
  isSaving: boolean;
}

export default function OnboardingInterestsSection({
  watch,
  setValue,
  isSaving,
}: OnboardingInterestsSectionProps) {
  return (
    <div
      className="flex flex-col gap-2"
    >
      <label
        htmlFor="interests"
        className="text-sm font-medium"
      >
        Interests
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
  );
}
