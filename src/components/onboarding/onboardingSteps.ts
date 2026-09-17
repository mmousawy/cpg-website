export const ONBOARDING_STEP_COUNT = 5;

export const ONBOARDING_STEP_LABELS = [
  'Welcome',
  'Your profile',
  'Your style',
  'Email preferences',
  'One last step',
] as const;

export type OnboardingStepIndex = 0 | 1 | 2 | 3 | 4;
export const LAST_ONBOARDING_STEP: OnboardingStepIndex = 4;
