'use client';

import { revalidateProfile } from '@/app/actions/revalidate';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import ErrorMessage from '@/components/shared/ErrorMessage';
import PageLoading from '@/components/shared/PageLoading';
import { routes } from '@/config/routes';
import OnboardingEmailPreferencesSection from '@/components/onboarding/OnboardingEmailPreferencesSection';
import OnboardingInterestsSection from '@/components/onboarding/OnboardingInterestsSection';
import OnboardingNicknameSection from '@/components/onboarding/OnboardingNicknameSection';
import OnboardingProfileSection from '@/components/onboarding/OnboardingProfileSection';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { getEmailTypes, updateEmailPreferences, type EmailTypeData } from '@/utils/emailPreferencesClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

// Zod schema for onboarding validation
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
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  bio: z.string().optional(),
  interests: z.array(z.string()),
  emailPreferences: z.record(z.string(), z.boolean()),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service to continue',
  }),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function OnboardingClient() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const isTestMode = searchParams.get('test') === 'true';

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [emailTypes, setEmailTypes] = useState<EmailTypeData[]>([]);
  const [isLoadingEmailTypes, setIsLoadingEmailTypes] = useState(true);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // Check if user is OAuth user (not email/password)
  const isOAuthUser = useMemo(() => {
    if (!user) return false;

    // Check identities - OAuth users will have identities with provider !== 'email'
    const identities = user.identities || [];
    if (identities.length > 0) {
      const provider = identities[0].provider;
      // Explicitly check for OAuth providers
      return (
        provider === 'google' ||
        provider === 'discord' ||
        provider === 'github' ||
        provider === 'facebook' ||
        provider === 'apple'
      );
    }

    // Fallback: check app_metadata provider (should be explicit OAuth provider)
    const appProvider = user.app_metadata?.provider;
    return (
      appProvider === 'google' ||
      appProvider === 'discord' ||
      appProvider === 'github' ||
      appProvider === 'facebook' ||
      appProvider === 'apple'
    );
  }, [user]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    setError,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: '',
      fullName: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
      email: isOAuthUser ? (profile?.email || user?.email || '') : '',
      bio: profile?.bio || '',
      interests: [],
      emailPreferences: {},
      termsAccepted: false,
    },
  });

  // Load email types on mount
  useEffect(() => {
    const loadEmailTypes = async () => {
      try {
        const types = await getEmailTypes();
        setEmailTypes(types);
        // Set default values (all opted in by default)
        const defaultPrefs: Record<string, boolean> = {};
        types.forEach((type) => {
          defaultPrefs[type.type_key] = true;
        });
        setValue('emailPreferences', defaultPrefs);
      } catch (error) {
        console.error('Error loading email types:', error);
      } finally {
        setIsLoadingEmailTypes(false);
      }
    };
    loadEmailTypes();
  }, [setValue]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (isLoading) return;

    // Redirect if not logged in (unless in test mode)
    if (!user && !isTestMode) {
      router.push('/login');
      return;
    }

    // Redirect if already has nickname (unless in test mode)
    if (profile?.nickname && !isTestMode) {
      router.push('/account/events');
      return;
    }
  }, [user, profile, isLoading, isTestMode, router]);

  const watchedNickname = watch('nickname');
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError('Image must be smaller than 5MB');
      return;
    }

    setAvatarError(null);

    // Revoke previous preview URL if exists
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    // Store file and create preview
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false); // Clear remove flag if uploading new image

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    // Revoke preview URL if exists
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    setAvatarError(null);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    // In test mode without a user, just validate the form and show success message
    if (isTestMode && !user) {
      // Double-check nickname availability
      if (nicknameAvailable === false) {
        setError('nickname', { message: 'This nickname is already taken' });
        return;
      }

      // Show a test mode success message
      setSubmitError(null);
      alert(
        'Test Mode: Form validation passed! All fields are valid.\n\nIn production, this would save your profile.',
      );
      return;
    }

    if (!user) return;

    // Double-check nickname availability
    if (nicknameAvailable === false) {
      setError('nickname', { message: 'This nickname is already taken' });
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      // Handle avatar upload/removal first
      let avatarUrl: string | null = null;

      if (removeAvatar) {
        // User wants to remove avatar
        avatarUrl = null;
      } else if (avatarFile) {
        // Upload new avatar
        const fileExt = avatarFile.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          setSubmitError(`Failed to upload avatar: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('user-avatars').getPublicUrl(filePath);

        avatarUrl = publicUrl;
      } else {
        // Keep existing avatar (if any)
        avatarUrl = profile?.avatar_url || null;
      }

      // Update profile
      const updateData: {
        nickname: string;
        full_name: string | null;
        email?: string;
        bio: string | null;
        avatar_url: string | null;
        newsletter_opt_in: boolean;
        terms_accepted_at: string;
      } = {
        nickname: data.nickname,
        full_name: data.fullName || null,
        bio: data.bio || null,
        avatar_url: avatarUrl,
        // For backward compatibility, set newsletter_opt_in based on newsletter preference
        newsletter_opt_in: data.emailPreferences['newsletter'] ?? true,
        terms_accepted_at: new Date().toISOString(),
      };

      // Only update email if OAuth user and email is provided
      if (isOAuthUser && data.email) {
        updateData.email = data.email.toLowerCase();
      }

      const { error: profileError } = await supabase.from('profiles').update(updateData).eq('id', user.id);

      if (profileError) {
        if (profileError.code === '23505') {
          // Unique constraint violation
          setError('nickname', { message: 'This nickname is already taken' });
        } else if (profileError.code === '23514') {
          // Check constraint violation
          setError('nickname', { message: 'Invalid nickname format' });
        } else {
          setSubmitError(profileError.message);
        }
        setIsSaving(false);
        return;
      }

      // Update email preferences in batch
      const preferenceUpdates = emailTypes.map((type) => {
        const isOptedIn = data.emailPreferences[type.type_key] ?? true;
        return {
          email_type_id: type.id,
          opted_out: !isOptedIn,
        };
      });

      const prefError = await updateEmailPreferences(user.id, preferenceUpdates);
      if (prefError.error) {
        setSubmitError(`Failed to update email preferences: ${prefError.error.message}`);
        setIsSaving(false);
        return;
      }

      // Save interests
      const interestsToSave = data.interests ?? [];
      if (interestsToSave.length > 0) {
        const normalizedInterests = interestsToSave.map((i) => i.toLowerCase().trim()).filter(Boolean);

        // Insert interests (database will handle duplicates via unique constraint)
        const { error: interestsError } = await supabase.from('profile_interests').insert(
          normalizedInterests.map((interest) => ({
            profile_id: user.id,
            interest,
          })),
        );

        if (interestsError) {
          // Ignore duplicate key errors (23505) - user might have already added some
          if (interestsError.code !== '23505') {
            console.error('Error saving interests:', interestsError);
            // Don't fail the whole onboarding if interests fail
          }
        }
      }

      // Refresh profile in auth context
      await refreshProfile();

      // Revalidate profile pages (homepage shows new members)
      await revalidateProfile(data.nickname);

      // Redirect to account page
      router.push('/account/events');
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      setSubmitError('An unexpected error occurred');
    }

    setIsSaving(false);
  };

  // Show loading while checking auth or during redirect
  if (isLoading) {
    return <PageLoading />;
  }

  // Show loading if redirecting (handled in useEffect)
  if ((!user && !isTestMode) || (profile?.nickname && !isTestMode)) {
    return <PageLoading />;
  }

  // Determine which avatar to display: pending upload preview, existing profile avatar, or null if removed
  const displayAvatarUrl = removeAvatar ? null : avatarPreview || profile?.avatar_url;
  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  return (
    <PageContainer
      className="items-center justify-center"
    >
      <Container
        padding="lg"
        className="mx-auto max-w-lg"
      >
        <div
          className="mb-8 text-center"
        >
          <h1
            className="mb-1 text-3xl font-bold"
          >
            Welcome
            {displayName ? `, ${displayName.split(' ')[0]}` : ''}
            !
          </h1>
          <p
            className="text-lg opacity-70 mb-8"
          >
            Let&apos;s set up your profile
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 mt-6"
        >
          <OnboardingNicknameSection
            register={register}
            errors={errors}
            watchedNickname={watchedNickname}
            isCheckingNickname={isCheckingNickname}
            nicknameAvailable={nicknameAvailable}
            onNicknameChange={(value) => {
              // Clear previous timeout
              if (nicknameCheckTimeoutRef.current) {
                clearTimeout(nicknameCheckTimeoutRef.current);
              }
              // Debounce the availability check
              nicknameCheckTimeoutRef.current = setTimeout(() => {
                checkNicknameAvailability(value);
              }, 500);
            }}
          />

          <OnboardingProfileSection
            register={register}
            errors={errors}
            displayAvatarUrl={displayAvatarUrl}
            displayName={displayName}
            avatarFile={avatarFile}
            avatarError={avatarError}
            isSaving={isSaving}
            isOAuthUser={isOAuthUser}
            fileInputRef={fileInputRef}
            handleAvatarUpload={handleAvatarUpload}
            handleRemoveAvatar={handleRemoveAvatar}
            profileAvatarUrl={profile?.avatar_url}
            removeAvatar={removeAvatar}
          />

          <OnboardingInterestsSection
            watch={watch}
            setValue={setValue}
            isSaving={isSaving}
          />

          <OnboardingEmailPreferencesSection
            control={control}
            watch={watch}
            setValue={setValue}
            emailTypes={emailTypes}
            isLoadingEmailTypes={isLoadingEmailTypes}
          />

          <div
            className="rounded-lg border border-border-color bg-background-light p-4"
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
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.termsAccepted.message}
              </p>
            )}
          </div>

          {submitError && <ErrorMessage>
            {submitError}
          </ErrorMessage>}

          {isTestMode && !user && (
            <div
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400"
            >
              <strong>
                Test Mode:
              </strong>
              {' '}
              You are not logged in. Form validation will work, but
              submission will only show a test message.
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSaving ||
              nicknameAvailable === false ||
              !watchedNickname ||
              (isOAuthUser && !watch('email') && !isTestMode) ||
              !watch('termsAccepted')
            }
            loading={isSaving}
          >
            {isTestMode && !user ? 'Test Form Validation' : 'Complete setup'}
          </Button>

          <p
            className="text-center text-xs text-foreground/70"
          >
            You can update your profile picture and other details later in your account settings.
          </p>
        </form>
      </Container>
    </PageContainer>
  );
}
