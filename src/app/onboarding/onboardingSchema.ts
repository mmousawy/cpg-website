import { nicknameSchema } from '@/utils/nickname';
import { z } from 'zod';

export const screenNameSchema = z
  .string()
  .trim()
  .min(2, 'Screen name must be at least 2 characters');

function emailFieldSchema(requireEmail: boolean) {
  if (requireEmail) {
    return z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Invalid email address');
  }
  return z.union([z.literal(''), z.string().trim().email('Invalid email address')]);
}

export function createOnboardingSchema(requireEmail: boolean) {
  return z.object({
    nickname: nicknameSchema,
    fullName: screenNameSchema,
    email: emailFieldSchema(requireEmail),
    bio: z.string().optional(),
    interests: z.array(z.string()),
    emailPreferences: z.record(z.string(), z.boolean()),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service to continue',
    }),
  });
}

export type OnboardingFormData = z.infer<ReturnType<typeof createOnboardingSchema>>;

export type OnboardingProfileField = 'nickname' | 'fullName' | 'email';

export function profileStepFields(requireEmail: boolean): OnboardingProfileField[] {
  return requireEmail ? ['nickname', 'fullName', 'email'] : ['nickname', 'fullName'];
}

export type ProfileStepValues = Pick<OnboardingFormData, OnboardingProfileField>;

export function profileStepValueSchema(requireEmail: boolean) {
  return createOnboardingSchema(requireEmail).pick({
    nickname: true,
    fullName: true,
    email: true,
  });
}

export function isProfileStepReady(values: ProfileStepValues, requireEmail: boolean): boolean {
  return profileStepValueSchema(requireEmail).safeParse(values).success;
}

export const finishStepFields = ['termsAccepted'] as const;

export function submitFields(requireEmail: boolean): (OnboardingProfileField | 'termsAccepted')[] {
  return [...profileStepFields(requireEmail), ...finishStepFields];
}

export function firstProfileFieldWithError(
  fieldErrors: Partial<Record<OnboardingProfileField | 'termsAccepted', unknown>>,
  requireEmail: boolean,
): OnboardingProfileField | null {
  for (const field of profileStepFields(requireEmail)) {
    if (fieldErrors[field]) {
      return field;
    }
  }
  return null;
}
