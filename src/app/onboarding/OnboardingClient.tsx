'use client';
import { ModalContext } from '@/app/providers/ModalProvider';
import type { AlbumCardStyle } from '@/components/account/AlbumCardStylePicker';
import ProfileAvatarCropper from '@/components/account/ProfileAvatarCropper';
import ProfileBannerCropper from '@/components/account/ProfileBannerCropper';
import PageContainer from '@/components/layout/PageContainer';
import OnboardingAboutYouSection from '@/components/onboarding/OnboardingAboutYouSection';
import OnboardingEmailPreferencesSection from '@/components/onboarding/OnboardingEmailPreferencesSection';
import OnboardingFinishSection from '@/components/onboarding/OnboardingFinishSection';
import OnboardingIntroSection from '@/components/onboarding/OnboardingIntroSection';
import OnboardingNicknameSection from '@/components/onboarding/OnboardingNicknameSection';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import OnboardingPageHeader from '@/components/onboarding/OnboardingPageHeader';
import { onboardingChromeInnerClassName, useOnboardingStepMinHeight } from '@/components/onboarding/onboardingLayout';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import OnboardingStyleSection from '@/components/onboarding/OnboardingStyleSection';
import type { OnboardingStepIndex } from '@/components/onboarding/onboardingSteps';
import { LAST_ONBOARDING_STEP } from '@/components/onboarding/onboardingSteps';
import Button from '@/components/shared/Button';
import PageLoading from '@/components/shared/PageLoading';
import type { AppThemeSelection } from '@/hooks/useAppTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { getEmailTypes, updateEmailPreferences, type EmailTypeData } from '@/utils/emailPreferencesClient';
import { generateBlurhash } from '@/utils/generateBlurhash';
import { validateImage } from '@/utils/imageValidation';
import { nicknameSchema } from '@/utils/nickname';
import { isOnboardingPreviewMode } from '@/utils/onboardingPreview';
import { isProfileComplete } from '@/utils/profileCompletion';
import { uploadUserStorageFile } from '@/utils/supabaseStorage';
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
function parseProfileTheme(theme: string | null | undefined): AppThemeSelection {
  if (theme && ['light', 'dark', 'midnight', 'system'].includes(theme)) {
    return theme as AppThemeSelection;
  }
  return 'system';
}
function parseAlbumCardStyle(style: string | null | undefined): AlbumCardStyle {
  if (style === 'large' || style === 'compact') {
    return style;
  }
  return 'large';
}
// Zod schema for onboarding validation
const onboardingSchema = z.object({
  nickname: nicknameSchema,
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your screen name'),
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
  const { setTheme } = useAppTheme();
  const isPreviewMode = isOnboardingPreviewMode(searchParams);
  const redirectToParam = searchParams.get('redirectTo');
  const postOnboardingRedirect = useMemo(
    () => getPostOnboardingRedirect(redirectToParam),
    [redirectToParam],
  );
  const [step, setStep] = useState<OnboardingStepIndex>(0);
  const stepRef = useRef<OnboardingStepIndex>(step);
  stepRef.current = step;
  const [previewNoticeDismissed, setPreviewNoticeDismissed] = useState(false);
  const [themeSelection, setThemeSelection] = useState<AppThemeSelection>('system');
  const [albumCardStyle, setAlbumCardStyle] = useState<AlbumCardStyle>('large');
  const [themeInitialized, setThemeInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [emailTypes, setEmailTypes] = useState<EmailTypeData[]>([]);
  const [isLoadingEmailTypes, setIsLoadingEmailTypes] = useState(true);
  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const stepFrameRef = useRef<HTMLFormElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
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
    trigger,
    formState: { errors },
    setError,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
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
  useEffect(() => {
    if (themeInitialized) return;
    const initialTheme = parseProfileTheme(profile?.theme);
    setThemeSelection(initialTheme);
    setAlbumCardStyle(parseAlbumCardStyle(profile?.album_card_style));
    if (initialTheme === 'system') {
      setTheme('system');
    } else {
      setTheme(initialTheme);
    }
    setThemeInitialized(true);
  }, [profile?.album_card_style, profile?.theme, setTheme, themeInitialized]);
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
  const isWizardVisible =
    !isLoading &&
    !((!user && !isPreviewMode) ||
      (isProfileComplete(profile, { fallbackEmail: user?.email ?? null }) && !isPreviewMode));
  useOnboardingStepMinHeight(stepFrameRef, progressRef, isWizardVisible, step);
  const watchedNickname = watch('nickname');
  const watchedEmail = watch('email');
  const watchedTermsAccepted = watch('termsAccepted');
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => {
    if (step <= 0) return;
    setStep((step - 1) as OnboardingStepIndex);
    scrollToTop();
  };
  const goNext = async () => {
    if (step === 0) {
      setStep(1);
      scrollToTop();
      return;
    }
    if (step === 1) {
      const fields: (keyof OnboardingFormData)[] = ['nickname', 'fullName'];
      if (isOAuthUser) {
        fields.push('email');
      }
      const valid = await trigger(fields);
      if (!valid) return;
      if (isCheckingNickname || nicknameAvailable === false || !watchedNickname) {
        return;
      }
      setStep(2);
      scrollToTop();
      return;
    }
    if (step === 2) {
      setStep(3);
      scrollToTop();
      return;
    }
    if (step === 3) {
      setStep(4);
      scrollToTop();
    }
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
      const { data, error } = await supabase.rpc('is_nickname_available', {
        p_nickname: nickname,
        p_user_id: user?.id ?? undefined,
      });
      if (error) {
        console.error('Error checking nickname:', error);
        setNicknameAvailable(null);
      } else {
        setNicknameAvailable(data === true);
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
    if (stepRef.current !== LAST_ONBOARDING_STEP) {
      return;
    }
    // In preview mode, validate only — never save profile changes
    if (isPreviewMode) {
      if (nicknameAvailable === false) {
        setError('nickname', { message: 'This nickname is already taken' });
        setStep(1);
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
      setStep(1);
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
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        try {
          avatarUrl = await uploadUserStorageFile(
            'user-avatars',
            filePath,
            pendingAvatarFile,
          );
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          setSubmitError(`Failed to upload avatar: ${message}`);
          setIsSaving(false);
          return;
        }
      }
      if (pendingBannerRemove) {
        bannerUrl = null;
        bannerBlurhash = null;
      } else if (pendingBannerFile) {
        const fileExt = pendingBannerFile.name.split('.').pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        try {
          bannerUrl = await uploadUserStorageFile(
            'user-banners',
            filePath,
            pendingBannerFile,
          );
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          setSubmitError(`Failed to upload banner: ${message}`);
          setIsSaving(false);
          return;
        }
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
        theme: AppThemeSelection;
        album_card_style: AlbumCardStyle;
      } = {
        nickname: data.nickname,
        full_name: data.fullName || null,
        bio: data.bio || null,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        banner_blurhash: bannerBlurhash,
        newsletter_opt_in: data.emailPreferences['newsletter'] ?? true,
        terms_accepted_at: new Date().toISOString(),
        theme: themeSelection,
        album_card_style: albumCardStyle,
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
          setStep(1);
        } else if (saveError.code === '23514') {
          // Check constraint violation
          setError('nickname', { message: 'Invalid nickname format' });
          setStep(1);
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
      // Notify admins of the new member before navigating
      try {
        await fetch('/api/onboarding/notify', {
          method: 'POST',
          keepalive: true,
        });
      } catch (err) {
        console.error('Error notifying admins of new member:', err);
      }
      // Refresh profile in auth context
      await refreshProfile();
      // Expire homepage/members caches before navigating. A server action
      // revalidateTag() would also call refresh() and fight router.push.
      try {
        const revalidateResponse = await fetch('/api/onboarding/revalidate', {
          method: 'POST',
          keepalive: true,
        });
        if (!revalidateResponse.ok) {
          throw new Error(`Revalidate failed: ${revalidateResponse.status}`);
        }
        router.push(postOnboardingRedirect);
      } catch (err) {
        console.error('Error revalidating after onboarding:', err);
        // Gated /account hop sets the complete cookie if the revalidate response did not.
        router.push('/account/events');
      }
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      setSubmitError('An unexpected error occurred');
    }
    setIsSaving(false);
  };
  const completeOnboarding = () => {
    if (stepRef.current !== LAST_ONBOARDING_STEP) {
      return;
    }
    void handleSubmit(onSubmit, (fieldErrors) => {
      if (fieldErrors.nickname || fieldErrors.fullName || fieldErrors.email) {
        setStep(1);
      } else if (fieldErrors.termsAccepted) {
        setStep(LAST_ONBOARDING_STEP);
      }
    })();
  };
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (stepRef.current === LAST_ONBOARDING_STEP) {
      return;
    }
    void goNext();
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
  const step1ContinueDisabled =
    isCheckingNickname ||
    nicknameAvailable === false ||
    !watchedNickname ||
    (isOAuthUser && !watchedEmail?.trim());
  const completeDisabled =
    isSaving ||
    nicknameAvailable === false ||
    !watchedNickname ||
    (isOAuthUser && !watchedEmail && !isPreviewMode) ||
    !watchedTermsAccepted;
  const primaryAction = step === 0 ? (
    <Button key="intro" type="button" onClick={() => void goNext()}>
      Let&apos;s go!
    </Button>
  ) : step === LAST_ONBOARDING_STEP ? (
    <Button
      key="finish"
      type="button"
      disabled={completeDisabled}
      loading={isSaving}
      onClick={completeOnboarding}
    >
      {isPreviewMode ? 'Test form validation' : 'Join the group'}
    </Button>
  ) : (
    <Button
      key="continue"
      type="button"
      onClick={() => void goNext()}
      disabled={step === 1 && step1ContinueDisabled}
    >
      Continue
    </Button>
  );
  return (
    <>
      {step > 0 ? <OnboardingHeader /> : null}
      <PageContainer>
        <div className={onboardingChromeInnerClassName}>
        <form
          ref={stepFrameRef}
          onSubmit={handleFormSubmit}
          noValidate
          className="flex flex-col py-8 text-sm sm:py-0 sm:text-base"
        >
          <div className="flex flex-1 flex-col justify-center">
            {step === 0 ? (
              <OnboardingPageHeader
                titleLine1="Welcome to"
                titleLine2="Creative Photography Group!"
              />
            ) : null}
            {isPreviewMode && !previewNoticeDismissed && (
              <div
                className="onboarding-rise-in mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400"
                role="status"
              >
                <p className="mb-3">
                  <strong>
                    Preview mode:
                  </strong>
                  {' '}
                  Auth and profile-completion redirects are disabled. Form validation
                  works, but submission will not save your profile.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewNoticeDismissed(true)}
                >
                  Got it
                </Button>
              </div>
            )}
            <div key={step} className="space-y-8">
            {step === 0 && <OnboardingIntroSection />}
            {step === 1 && (
              <>
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
              </>
            )}
            {step === 2 && (
              <OnboardingStyleSection
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
                theme={themeSelection}
                onThemeChange={setThemeSelection}
                albumCardStyle={albumCardStyle}
                onAlbumCardStyleChange={setAlbumCardStyle}
              />
            )}
            {step === 3 && (
              <OnboardingEmailPreferencesSection
                control={control}
                watch={watch}
                setValue={setValue}
                emailTypes={emailTypes}
                isLoadingEmailTypes={isLoadingEmailTypes}
              />
            )}
            {step === 4 && (
              <OnboardingFinishSection
                register={register}
                errors={errors}
                submitError={submitError}
                isPreviewMode={isPreviewMode}
              />
            )}
            </div>
          </div>
          <OnboardingProgress
            ref={progressRef}
            step={step}
            showBack={step > 0}
            onBack={goBack}
            primaryAction={primaryAction}
          />
        </form>
        </div>
      </PageContainer>
    </>
  );
}
