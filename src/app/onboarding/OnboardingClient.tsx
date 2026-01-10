'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ErrorMessage from '@/components/shared/ErrorMessage';
import PageLoading from '@/components/shared/PageLoading';

// Zod schema for nickname validation
const onboardingSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Nickname must be at least 3 characters')
    .max(30, 'Nickname must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
      message: 'Nickname cannot start or end with a hyphen',
    }),
  fullName: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>

export default function OnboardingClient() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: '',
      fullName: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    },
  });

  const watchedNickname = watch('nickname');

  // Check nickname availability with debounce
  const checkNicknameAvailability = async (nickname: string) => {
    if (!nickname || nickname.length < 3) {
      setNicknameAvailable(null);
      return;
    }

    // Validate format first
    if (!/^[a-z0-9-]+$/.test(nickname) || nickname.startsWith('-') || nickname.endsWith('-')) {
      setNicknameAvailable(null);
      return;
    }

    setIsCheckingNickname(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .maybeSingle();

      if (error) {
        console.error('Error checking nickname:', error);
        setNicknameAvailable(null);
      } else {
        setNicknameAvailable(data === null);
      }
    } catch (err) {
      console.error('Error checking nickname:', err);
      setNicknameAvailable(null);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    // Double-check nickname availability
    if (nicknameAvailable === false) {
      setError('nickname', { message: 'This nickname is already taken' });
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: data.nickname,
          full_name: data.fullName || null,
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          setError('nickname', { message: 'This nickname is already taken' });
        } else if (error.code === '23514') {
          // Check constraint violation
          setError('nickname', { message: 'Invalid nickname format' });
        } else {
          setSubmitError(error.message);
        }
      } else {
        // Refresh profile in auth context
        await refreshProfile();
        // Redirect to account page
        router.push('/account/events');
      }
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      setSubmitError('An unexpected error occurred');
    }

    setIsSaving(false);
  };

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect if not logged in
  if (!user) {
    router.push('/login');
    return <PageLoading />;
  }

  // Redirect if already has nickname
  if (profile?.nickname) {
    router.push('/account/events');
    return <PageLoading />;
  }

  // profile.avatar_url is the single source of truth (OAuth avatar is synced there on login)
  const displayAvatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  return (
    <PageContainer className="items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full border-2 border-border-color">
              <Avatar
                avatarUrl={displayAvatarUrl}
                fullName={displayName}
                size="xl"
              />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Welcome{displayName ? `, ${displayName.split(' ')[0]}` : ''}!</h1>
          <p className="text-lg opacity-70">
            Let&apos;s set up your profile
          </p>
        </div>

        <Container>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nickname Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nickname" className="text-sm font-medium">
                Choose a nickname <span className="text-red-500">*</span>
              </label>
              <Input
                id="nickname"
                type="text"
                {...register('nickname', {
                  onChange: (e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    e.target.value = value;
                    // Debounce the availability check
                    const timeoutId = setTimeout(() => checkNicknameAvailability(value), 500);
                    return () => clearTimeout(timeoutId);
                  },
                })}
                placeholder="your-nickname"
                autoComplete="off"
                leftAddon="@"
                rightAddon={
                  <>
                    {isCheckingNickname && (
                      <svg className="size-4 animate-spin text-foreground/50" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {!isCheckingNickname && nicknameAvailable === true && watchedNickname.length >= 3 && (
                      <svg className="size-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {!isCheckingNickname && nicknameAvailable === false && (
                      <svg className="size-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </>
                }
              />
              {errors.nickname && (
                <p className="text-sm text-red-500">{errors.nickname.message}</p>
              )}
              {!errors.nickname && nicknameAvailable === false && (
                <p className="text-sm text-red-500">This nickname is already taken</p>
              )}
              {!errors.nickname && nicknameAvailable === true && watchedNickname.length >= 3 && (
                <p className="text-sm text-green-600">Nickname is available!</p>
              )}
              <p className="text-xs text-foreground/50">
                Your profile URL will be: {process.env.NEXT_PUBLIC_SITE_URL || 'https://creativephotography.group'}/@{watchedNickname || 'your-nickname'}
              </p>
            </div>

            {/* Full Name Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="fullName"
                type="text"
                {...register('fullName')}
                placeholder="Your full name"
              />
            </div>

            {submitError && (
              <ErrorMessage>{submitError}</ErrorMessage>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSaving || nicknameAvailable === false || !watchedNickname}
              loading={isSaving}
            >
              Complete setup
            </Button>

            <p className="text-center text-xs text-foreground/50">
              You can update your profile picture and other details later in your account settings.
            </p>
          </form>
        </Container>
      </div>
    </PageContainer>
  );
}
