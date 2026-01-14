'use client';

import { revalidateProfile } from '@/app/actions/revalidate';
import Avatar from '@/components/auth/Avatar';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import PageLoading from '@/components/shared/PageLoading';
import Textarea from '@/components/shared/Textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { getEmailTypes, updateEmailPreferences, type EmailTypeData } from '@/utils/emailPreferencesClient';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
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
  emailPreferences: z.record(z.string(), z.boolean()),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>

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
      return provider === 'google' || provider === 'discord' || provider === 'github' || provider === 'facebook' || provider === 'apple';
    }

    // Fallback: check app_metadata provider (should be explicit OAuth provider)
    const appProvider = user.app_metadata?.provider;
    return appProvider === 'google' || appProvider === 'discord' || appProvider === 'github' || appProvider === 'facebook' || appProvider === 'apple';
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
      emailPreferences: {},
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
        types.forEach(type => {
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

  const watchedNickname = watch('nickname');

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

        const { data: { publicUrl } } = supabase.storage
          .from('user-avatars')
          .getPublicUrl(filePath);

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
      } = {
        nickname: data.nickname,
        full_name: data.fullName || null,
        bio: data.bio || null,
        avatar_url: avatarUrl,
        // For backward compatibility, set newsletter_opt_in based on newsletter preference
        newsletter_opt_in: data.emailPreferences['newsletter'] ?? true,
      };

      // Only update email if OAuth user and email is provided
      if (isOAuthUser && data.email) {
        updateData.email = data.email.toLowerCase();
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

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
      const preferenceUpdates = emailTypes.map(type => {
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

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect if not logged in (unless in test mode)
  if (!user && !isTestMode) {
    router.push('/login');
    return <PageLoading />;
  }

  // Redirect if already has nickname (unless in test mode)
  if (profile?.nickname && !isTestMode) {
    router.push('/account/events');
    return <PageLoading />;
  }

  // Determine which avatar to display: pending upload preview, existing profile avatar, or null if removed
  const displayAvatarUrl = removeAvatar ? null : (avatarPreview || profile?.avatar_url);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Welcome{displayName ? `, ${displayName.split(' ')[0]}` : ''}!</h1>
          <p className="text-lg opacity-70 mb-8">
            Let&apos;s set up your profile
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
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
                    <svg className="size-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
              <p className="text-sm text-primary">Nickname is available!</p>
            )}
            <p className="text-xs text-foreground/50">
                Your profile URL will be:
              <br />
              <span className="break-words">
                {(() => {
                  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://creativephotography.group';
                  const url = `${baseUrl}/@${watchedNickname || 'your-nickname'}`;
                  return url.replace(/^https?:\/\//, '');
                })()}
              </span>
            </p>
          </div>

          {/* Profile Picture */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
                Profile picture
            </label>
            <div className="flex items-center gap-4">
              <div className={clsx(
                "rounded-full border-2 transition-colors flex-shrink-0",
                avatarFile ? "border-primary" : "border-border-color",
              )}>
                <Avatar
                  avatarUrl={displayAvatarUrl}
                  fullName={displayName}
                  size="xl"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    variant="secondary"
                    type="button"
                    size="sm"
                  >
                    {avatarFile ? 'Change picture' : 'Upload picture'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={isSaving}
                  />
                  {(avatarFile || (profile?.avatar_url && !removeAvatar)) && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemoveAvatar}
                      disabled={isSaving}
                      size="sm"
                    >
                        Remove
                    </Button>
                  )}
                </div>
                {avatarError && (
                  <p className="text-sm text-red-500">{avatarError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Email Field - Only for OAuth users */}
          {isOAuthUser && (
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                {...register('email', { required: isOAuthUser ? 'Email is required' : false })}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
              <p className="text-xs text-foreground/50">
                  This email will be used for notifications and account communications.
              </p>
            </div>
          )}

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

          {/* Bio Field */}
          <div className="flex flex-col gap-2">
            <label htmlFor="bio" className="text-sm font-medium">
                Bio
            </label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          {/* Email Preferences */}
          <div className="rounded-lg border border-border-color bg-background-light p-4">
            <label className="text-sm font-medium mb-3 block">
                Email preferences
            </label>
            <p className="text-xs text-foreground/50 mb-3">
                Choose which types of emails you&apos;d like to receive. You can change these settings anytime.
            </p>
            {isLoadingEmailTypes ? (
              <p className="text-xs text-foreground/50">Loading preferences...</p>
            ) : emailTypes.length > 0 ? (
              <div className="space-y-3">
                {emailTypes.map((type) => {
                  const fieldName = `emailPreferences.${type.type_key}` as const;
                  return (
                    <Controller
                      key={type.type_key}
                      name={fieldName}
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id={`emailPref-${type.type_key}`}
                            checked={field.value ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              field.onChange(checked);
                              // Also update the nested object
                              const currentPrefs = watch('emailPreferences') || {};
                              setValue('emailPreferences', {
                                ...currentPrefs,
                                [type.type_key]: checked,
                              });
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`emailPref-${type.type_key}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {type.type_label}
                            </label>
                            {type.description && (
                              <p className="text-xs text-foreground/50 mt-1">
                                {type.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-foreground/50">Unable to load email preferences</p>
            )}
          </div>

          {submitError && (
            <ErrorMessage>{submitError}</ErrorMessage>
          )}

          {isTestMode && !user && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Test Mode:</strong> You are not logged in. Form submission will be disabled.
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSaving ||
                nicknameAvailable === false ||
                !watchedNickname ||
                (isOAuthUser && !watch('email')) ||
                (isTestMode && !user)
            }
            loading={isSaving}
          >
              Complete setup
          </Button>

          <p className="text-center text-xs text-foreground/50">
              You can update your profile picture and other details later in your account settings.
          </p>
        </form>
      </Container>
    </PageContainer>
  );
}
