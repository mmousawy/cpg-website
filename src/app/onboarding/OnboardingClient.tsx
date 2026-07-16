'use client';

import { revalidateProfile } from '@/app/actions/revalidate';
import { ModalContext } from '@/app/providers/ModalProvider';
import ProfileAvatarCropper from '@/components/account/ProfileAvatarCropper';
import ProfileBannerCropper from '@/components/account/ProfileBannerCropper';
import PageContainer from '@/components/layout/PageContainer';
import OnboardingAboutYouSection from '@/components/onboarding/OnboardingAboutYouSection';
import OnboardingEmailPreferencesSection from '@/components/onboarding/OnboardingEmailPreferencesSection';
import OnboardingFinishSection from '@/components/onboarding/OnboardingFinishSection';
import OnboardingNicknameSection from '@/components/onboarding/OnboardingNicknameSection';
import OnboardingProfileImagesSection from '@/components/onboarding/OnboardingProfileImagesSection';
import HelpLink from '@/components/shared/HelpLink';
import PageLoading from '@/components/shared/PageLoading';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { getEmailTypes, updateEmailPreferences, type EmailTypeData } from '@/utils/emailPreferencesClient';
import { generateBlurhash } from '@/utils/generateBlurhash';
import { validateImage } from '@/utils/imageValidation';
import { isOnboardingPreviewMode } from '@/utils/onboardingPreview';
import { isProfileComplete } from '@/utils/profileCompletion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const PUBLIC_LISTING_PAGES = ['/', '/events'];

function getPostOnboardingRedirect(redirectTo: string | null): string {
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return '/account/events';
  }

  if (PUBLIC_LISTING_PAGES.includes(redirectTo)) {
    return '/account/events';
  }

  return redirectTo;
}

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
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your full name'),
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
  const modalContext = useContext(ModalContext);
  const isPreviewMode = isOnboardingPreviewMode(searchParams);
  const redirectToParam = searchParams.get('redirectTo');
  const postOnboardingRedirect = useMemo(
    () => getPostOnboardingRedirect(redirectToParam),
    [redirectToParam],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [emailTypes, setEmailTypes] = useState<EmailTypeData[]>([]);
  const [isLoadingEmailTypes, setIsLoadingEmailTypes] = useState(true);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Banner upload state
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState<string | null>(null);
  const [pendingBannerBlurhash, setPendingBannerBlurhash] = useState<string | null>(null);
  const [pendingBannerRemove, setPendingBannerRemove] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const savedAvatarUrl = profile?.avatar_url ?? null;
  const savedBannerUrl = profile?.banner_url ?? null;
  const savedBannerBlurhash = profile?.banner_blurhash ?? null;

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
        // Filter out admin-only email types (new users can't be admins during onboarding)
        const filteredTypes = types.filter((t) => t.type_key !== 'admin_notifications');
        setEmailTypes(filteredTypes);
        // Set default values (all opted in by default)
        const defaultPrefs: Record<string, boolean> = {};
        filteredTypes.forEach((type) => {
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
      if (pendingBannerPreview) {
        URL.revokeObjectURL(pendingBannerPreview);
      }
    };
  }, [pendingAvatarPreview, pendingBannerPreview]);

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (isLoading) return;

    // Redirect if not logged in (unless in preview mode)
    if (!user && !isPreviewMode) {
      router.push('/login');
      return;
    }

    // Redirect only when profile is fully complete (unless in preview mode)
    if (isProfileComplete(profile, { fallbackEmail: user?.email ?? null }) && !isPreviewMode) {
      router.push(postOnboardingRedirect);
      return;
    }
  }, [user, profile, isLoading, isPreviewMode, router, postOnboardingRedirect]);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = await validateImage(file, { maxSizeBytes: 5 * 1024 * 1024 });
    if (error) {
      setAvatarError(error.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAvatarError(null);

    const sourcePreviewUrl = URL.createObjectURL(file);
    let sourcePreviewCleaned = false;
    const cleanupSourcePreview = () => {
      if (sourcePreviewCleaned) return;
      URL.revokeObjectURL(sourcePreviewUrl);
      sourcePreviewCleaned = true;
    };

    modalContext.setSize('default');
    modalContext.setTitle('Crop avatar');
    modalContext.setContent(createElement(ProfileAvatarCropper, {
      imageSrc: sourcePreviewUrl,
      onDismiss: cleanupSourcePreview,
      onCancel: () => {
        cleanupSourcePreview();
        modalContext.setBeforeCloseCheck(null);
        modalContext.setIsOpen(false);
      },
      onApply: (croppedFile, croppedPreviewUrl) => {
        cleanupSourcePreview();

        if (pendingAvatarPreview) {
          URL.revokeObjectURL(pendingAvatarPreview);
        }

        setPendingAvatarFile(croppedFile);
        setPendingAvatarPreview(croppedPreviewUrl);
        setPendingAvatarRemove(false);
        setAvatarError(null);

        modalContext.setBeforeCloseCheck(null);
        modalContext.setIsOpen(false);
      },
    }));
    modalContext.setIsOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = await validateImage(file, { maxSizeBytes: 5 * 1024 * 1024 });
    if (error) {
      setBannerError(error.message);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    setBannerError(null);

    const sourcePreviewUrl = URL.createObjectURL(file);
    let sourcePreviewCleaned = false;
    const cleanupSourcePreview = () => {
      if (sourcePreviewCleaned) return;
      URL.revokeObjectURL(sourcePreviewUrl);
      sourcePreviewCleaned = true;
    };

    modalContext.setSize('medium');
    modalContext.setTitle('Crop banner');
    modalContext.setContent(createElement(ProfileBannerCropper, {
      imageSrc: sourcePreviewUrl,
      onDismiss: cleanupSourcePreview,
      onCancel: () => {
        cleanupSourcePreview();
        modalContext.setBeforeCloseCheck(null);
        modalContext.setIsOpen(false);
      },
      onApply: (croppedFile, croppedPreviewUrl) => {
        cleanupSourcePreview();

        if (pendingBannerPreview) {
          URL.revokeObjectURL(pendingBannerPreview);
        }

        setPendingBannerFile(croppedFile);
        setPendingBannerPreview(croppedPreviewUrl);
        setPendingBannerBlurhash(null);
        setPendingBannerRemove(false);
        setBannerError(null);

        void generateBlurhash(croppedFile, 4, 3).then((hash) => {
          setPendingBannerBlurhash(hash);
        });

        modalContext.setBeforeCloseCheck(null);
        modalContext.setIsOpen(false);
      },
    }));
    modalContext.setIsOpen(true);

    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarRemove(true);
    setAvatarError(null);
  };

  const handleCancelAvatarChange = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarRemove(false);
    setAvatarError(null);
  };

  const handleRemoveBanner = () => {
    if (pendingBannerPreview) {
      URL.revokeObjectURL(pendingBannerPreview);
    }

    setPendingBannerFile(null);
    setPendingBannerPreview(null);
    setPendingBannerBlurhash(null);
    setPendingBannerRemove(true);
    setBannerError(null);
  };

  const handleCancelBannerChange = () => {
    if (pendingBannerPreview) {
      URL.revokeObjectURL(pendingBannerPreview);
    }

    setPendingBannerFile(null);
    setPendingBannerPreview(null);
    setPendingBannerBlurhash(null);
    setPendingBannerRemove(false);
    setBannerError(null);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    // In preview mode, validate only — never save profile changes
    if (isPreviewMode) {
      if (nicknameAvailable === false) {
        setError('nickname', { message: 'This nickname is already taken' });
        return;
      }

      setSubmitError(null);
      alert(
        'Preview mode: Form validation passed! All fields are valid.\n\nRemove ?preview=true from the URL to complete onboarding for real.',
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
      let avatarUrl: string | null = savedAvatarUrl;
      let bannerUrl: string | null = savedBannerUrl;
      let bannerBlurhash: string | null = savedBannerBlurhash;

      if (pendingAvatarRemove) {
        avatarUrl = null;
      } else if (pendingAvatarFile) {
        const fileExt = pendingAvatarFile.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-avatars')
          .upload(filePath, pendingAvatarFile, {
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
      }

      if (pendingBannerRemove) {
        bannerUrl = null;
        bannerBlurhash = null;
      } else if (pendingBannerFile) {
        const fileExt = pendingBannerFile.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-banners')
          .upload(filePath, pendingBannerFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          setSubmitError(`Failed to upload banner: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('user-banners').getPublicUrl(filePath);

        bannerUrl = publicUrl;
        bannerBlurhash = pendingBannerBlurhash
          ?? await generateBlurhash(pendingBannerFile, 4, 3);
      }

      const updateData: {
        nickname: string;
        full_name: string | null;
        email?: string;
        bio: string | null;
        avatar_url: string | null;
        banner_url: string | null;
        banner_blurhash: string | null;
        newsletter_opt_in: boolean;
        terms_accepted_at: string;
      } = {
        nickname: data.nickname,
        full_name: data.fullName || null,
        bio: data.bio || null,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        banner_blurhash: bannerBlurhash,
        newsletter_opt_in: data.emailPreferences['newsletter'] ?? true,
        terms_accepted_at: new Date().toISOString(),
      };

      // Only update email if OAuth user and email is provided
      if (isOAuthUser && data.email) {
        updateData.email = data.email.toLowerCase();
      }

      const { error: profileError } = await supabase.from('profiles').update(updateData).eq('id', user.id);

      let saveError = profileError;
      if (saveError?.message?.includes('banner_blurhash')) {
        const { banner_blurhash: _blurhash, ...updateWithoutBlurhash } = updateData;
        const retry = await supabase.from('profiles').update(updateWithoutBlurhash).eq('id', user.id);
        saveError = retry.error;
      } else if (saveError?.message?.includes('banner_url')) {
        const {
          banner_url: _bannerUrl,
          banner_blurhash: _blurhash,
          ...updateWithoutBanner
        } = updateData;
        const retry = await supabase.from('profiles').update(updateWithoutBanner).eq('id', user.id);
        saveError = retry.error;
      }

      if (saveError) {
        if (saveError.code === '23505') {
          // Unique constraint violation
          setError('nickname', { message: 'This nickname is already taken' });
        } else if (saveError.code === '23514') {
          // Check constraint violation
          setError('nickname', { message: 'Invalid nickname format' });
        } else {
          setSubmitError(saveError.message);
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
      // Fire-and-forget: don't await server action because revalidateTag
      // triggers an internal router refresh that conflicts with router.push
      void revalidateProfile(data.nickname);

      router.push(postOnboardingRedirect);
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
  if ((!user && !isPreviewMode) || (isProfileComplete(profile, { fallbackEmail: user?.email ?? null }) && !isPreviewMode)) {
    return <PageLoading />;
  }

  const watchedFullName = watch('fullName');
  const hasAvatarChanges = pendingAvatarFile !== null || pendingAvatarRemove;
  const hasBannerChanges = pendingBannerFile !== null || pendingBannerRemove;

  const displayAvatarUrl = pendingAvatarPreview
    ? pendingAvatarPreview
    : pendingAvatarRemove
      ? null
      : savedAvatarUrl;

  const displayBannerUrl = pendingBannerPreview
    ? pendingBannerPreview
    : pendingBannerRemove
      ? null
      : savedBannerUrl;

  const displayBannerBlurhash = pendingBannerPreview
    ? pendingBannerBlurhash
    : pendingBannerRemove
      ? null
      : savedBannerBlurhash;

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';

  return (
    <PageContainer>
      <div
        className="mx-auto max-w-xl"
      >
        <div
          className="mb-8 text-center"
        >
          <h1
            className="mb-2 text-2xl font-bold sm:text-3xl font-heading"
          >
            Welcome to the group
            {displayName ? ` ${displayName.split(' ')[0]}` : ''}
            !
          </h1>
          <div
            className="flex items-center justify-center gap-2"
          >
            <p
              className="text-base opacity-70 sm:text-lg"
            >
              Just a few steps to get you started
            </p>
            <HelpLink
              href="setup-profile"
              label="Help with profile setup"
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 text-sm sm:text-base"
        >
          <OnboardingNicknameSection
            register={register}
            errors={errors}
            watchedNickname={watchedNickname}
            isCheckingNickname={isCheckingNickname}
            nicknameAvailable={nicknameAvailable}
            onNicknameChange={(value) => {
            if (nicknameCheckTimeoutRef.current) {
              clearTimeout(nicknameCheckTimeoutRef.current);
            }
            nicknameCheckTimeoutRef.current = setTimeout(() => {
              checkNicknameAvailability(value);
            }, 500);
            }}
          />

          <OnboardingAboutYouSection
            register={register}
            errors={errors}
            isOAuthUser={isOAuthUser}
            watch={watch}
            setValue={setValue}
            isSaving={isSaving}
          />

          <OnboardingProfileImagesSection
            profileId={profile?.id ?? user?.id ?? ''}
            nickname={watchedNickname}
            fullName={watchedFullName}
            displayBannerUrl={displayBannerUrl}
            displayBannerBlurhash={displayBannerBlurhash}
            displayAvatarUrl={displayAvatarUrl}
            savedBannerUrl={savedBannerUrl}
            savedAvatarUrl={savedAvatarUrl}
            pendingBannerFile={pendingBannerFile}
            pendingAvatarFile={pendingAvatarFile}
            pendingBannerRemove={pendingBannerRemove}
            pendingAvatarRemove={pendingAvatarRemove}
            hasBannerChanges={hasBannerChanges}
            hasAvatarChanges={hasAvatarChanges}
            bannerError={bannerError}
            avatarError={avatarError}
            isSaving={isSaving}
            fileInputRef={fileInputRef}
            bannerInputRef={bannerInputRef}
            handleBannerUpload={handleBannerUpload}
            handleRemoveBanner={handleRemoveBanner}
            handleCancelBannerChange={handleCancelBannerChange}
            handleAvatarUpload={handleAvatarUpload}
            handleRemoveAvatar={handleRemoveAvatar}
            handleCancelAvatarChange={handleCancelAvatarChange}
          />

          <OnboardingEmailPreferencesSection
            control={control}
            watch={watch}
            setValue={setValue}
            emailTypes={emailTypes}
            isLoadingEmailTypes={isLoadingEmailTypes}
          />

          <OnboardingFinishSection
            register={register}
            errors={errors}
            watch={watch}
            submitError={submitError}
            isPreviewMode={isPreviewMode}
            isSaving={isSaving}
            isOAuthUser={isOAuthUser}
            nicknameAvailable={nicknameAvailable}
            watchedNickname={watchedNickname}
          />
        </form>
      </div>
    </PageContainer>
  );
}
