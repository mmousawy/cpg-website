'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import Input from '@/components/shared/Input';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Textarea from '@/components/shared/Textarea';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useFormChanges } from '@/hooks/useFormChanges';
import { useSupabase } from '@/hooks/useSupabase';
import { getEmailTypes, getUserEmailPreferences, updateEmailPreferences, type EmailPreference, type EmailTypeData } from '@/utils/emailPreferencesClient';

import { revalidateInterest, revalidateInterests, revalidateProfile } from '@/app/actions/revalidate';
import ChangeEmailModal from '@/components/account/ChangeEmailModal';
import Avatar from '@/components/auth/Avatar';
import ErrorMessage from '@/components/shared/ErrorMessage';
import InterestInput from '@/components/shared/InterestInput';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import CloseSVG from 'public/icons/close.svg';
import PlusIconSVG from 'public/icons/plus.svg';

// Zod schema for form validation
const socialLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().url('Must be a valid URL starting with https://').startsWith('https://', 'URL must start with https://'),
});

const accountFormSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  socialLinks: z.array(socialLinkSchema).max(3, 'Maximum 3 social links allowed'),
  interests: z.array(z.string()).max(10, 'Maximum 10 interests allowed'),
  albumCardStyle: z.enum(['large', 'compact']),
  theme: z.enum(['system', 'light', 'dark', 'midnight']),
  emailPreferences: z.record(z.string(), z.boolean()),
});

type AccountFormData = z.infer<typeof accountFormSchema>

type SocialLink = { label: string; url: string }

type Profile = Pick<Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'bio'
  | 'website'
  | 'created_at'
  | 'last_logged_in'
> & {
  social_links: SocialLink[] | null
  album_card_style: 'large' | 'compact' | null
  theme?: 'light' | 'dark' | 'midnight' | 'system' | null
  newsletter_opt_in?: boolean | null
}

export default function AccountPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user, refreshProfile: refreshAuthProfile } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const supabase = useSupabase();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [themeMounted, setThemeMounted] = useState(false);
  const [emailTypes, setEmailTypes] = useState<EmailTypeData[]>([]);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreference[]>([]);

  // Email change state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailChangedFromUrl, setEmailChangedFromUrl] = useState(false);

  // Check for email_changed query param (from verification redirect)
  useEffect(() => {
    if (searchParams.get('email_changed') === 'true') {
      setEmailChangedFromUrl(true);
      // Clear the query param from URL without reload
      window.history.replaceState({}, '', '/account');
      // Refresh profile to get updated email
      refreshAuthProfile();
      // Auto-dismiss after 5 seconds
      setTimeout(() => setEmailChangedFromUrl(false), 5000);
    }
  }, [searchParams, refreshAuthProfile]);

  // Avatar state - saved value and pending changes
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);

  // Store the saved form values as the baseline for dirty comparison
  const [savedFormValues, setSavedFormValues] = useState<AccountFormData | null>(null);

  // React Hook Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      fullName: '',
      bio: '',
      website: '',
      socialLinks: [],
      interests: [],
      albumCardStyle: 'large',
      theme: 'system',
      emailPreferences: {},
    },
  });

  // Field array for social links
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'socialLinks',
  });

  // Watch all form values for custom dirty tracking
  const currentValues = watch();

  // Check if avatar has pending changes
  const hasAvatarChanges = pendingAvatarFile !== null || pendingAvatarRemove;

  // Track form changes
  const { hasChanges, changeCount } = useFormChanges(currentValues, savedFormValues, {}, hasAvatarChanges);

  // Stats state
  const [stats, setStats] = useState({
    galleries: 0,
    photos: 0,
    commentsMade: 0,
    commentsReceived: 0,
    rsvpsConfirmed: 0,
    rsvpsCanceled: 0,
    eventsAttended: 0,
    galleryViews: 0,
    profileViews: 0,
    lastLoggedIn: null as string | null,
  });

  // Track which user ID we've loaded data for to avoid reloading on token refresh
  const loadedUserIdRef = useRef<string | null>(null);

  // Wait for theme to be available client-side
  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return;

    // Only load if we haven't loaded for this user yet
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

    const loadData = async () => {
      try {
        // Load email types first (must be loaded before profile to build preferences correctly)
        const types = await getEmailTypes();
        setEmailTypes(types);

        // Only load profile after email types are loaded
        await loadProfile(types);
        // Load stats after profile is loaded (don't await - let it run in background)
        loadStats().catch(() => {
          // Silently fail - stats are optional
        });
      } catch (err) {
        console.error('Error loading account data:', err);
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async (types: EmailTypeData[] = emailTypes) => {
    if (!user) return;

    try {
      // Load email preferences
      const preferences = await getUserEmailPreferences(user.id);
      setEmailPreferences(preferences);

      // Load profile interests
      const { data: interestsData } = await supabase
        .from('profile_interests')
        .select('interest')
        .eq('profile_id', user.id);

      const userInterests = (interestsData || []).map((pi) => pi.interest);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname, avatar_url, bio, website, social_links, album_card_style, theme, created_at, last_logged_in, is_admin, newsletter_opt_in')
        .eq('id', user.id)
        .single();

      // PGRST116 = no rows returned (profile doesn't exist yet)
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || null,
              avatar_url: user.user_metadata?.avatar_url || null,
            })
            .select()
            .single();

          if (newProfile) {
            setProfile({
              ...newProfile,
              social_links: (newProfile.social_links as SocialLink[] | null) ?? null,
              album_card_style: (newProfile.album_card_style === 'large' || newProfile.album_card_style === 'compact'
                ? newProfile.album_card_style
                : null) as 'large' | 'compact' | null,
              theme: (newProfile.theme && ['light', 'dark', 'midnight', 'system'].includes(newProfile.theme)
                ? newProfile.theme
                : null) as 'light' | 'dark' | 'midnight' | 'system' | null | undefined,
              newsletter_opt_in: newProfile.newsletter_opt_in ?? false,
            });
            setNickname(newProfile.nickname || '');
            setSavedAvatarUrl(newProfile.avatar_url);

            // Load saved album card style from localStorage (takes priority)
            const storedStyle = localStorage.getItem('album-card-style');
            const albumStyle: 'large' | 'compact' = (storedStyle === 'large' || storedStyle === 'compact')
              ? storedStyle
              : (newProfile.album_card_style === 'large' || newProfile.album_card_style === 'compact')
                ? newProfile.album_card_style
                : 'large';

            // Build email preferences object from loaded preferences
            const emailPrefs: Record<string, boolean> = {};
            types.forEach(type => {
              const pref = preferences.find(p => p.type_key === type.type_key);
              // If no preference exists, default to opted in (opted_out = false)
              // For newsletter, also check newsletter_opt_in for backward compatibility
              if (type.type_key === 'newsletter') {
                emailPrefs[type.type_key] = (newProfile as any).newsletter_opt_in ?? (pref ? !pref.opted_out : true);
              } else {
                emailPrefs[type.type_key] = pref ? !pref.opted_out : true;
              }
            });

            // Set form values and baseline for dirty comparison
            const formValues: AccountFormData = {
              fullName: newProfile.full_name || '',
              bio: newProfile.bio || '',
              website: newProfile.website || '',
              socialLinks: (newProfile.social_links as { label: string; url: string }[]) || [],
              interests: userInterests,
              albumCardStyle: albumStyle,
              theme: 'system',
              emailPreferences: emailPrefs,
            };
            reset(formValues);
            setSavedFormValues(formValues);
          } else if (insertError) {
            console.error('Error creating profile:', insertError.message || insertError);
          }
        } else {
          console.info('Profiles table not available, using user metadata:', error.message || error.code);
          setProfile({
            id: user.id,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || null,
            nickname: null,
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: null,
            website: null,
            social_links: null,
            album_card_style: null,
            newsletter_opt_in: false,
            created_at: user.created_at || new Date().toISOString(),
            last_logged_in: null,
          });
          // Build default email preferences (all opted in)
          const emailPrefs: Record<string, boolean> = {};
          types.forEach(type => {
            emailPrefs[type.type_key] = true;
          });

          const formValues: AccountFormData = {
            fullName: user.user_metadata?.full_name || '',
            bio: '',
            website: '',
            socialLinks: [],
            interests: [],
            albumCardStyle: 'large',
            theme: 'system',
            emailPreferences: emailPrefs,
          };
          reset(formValues);
          setSavedFormValues(formValues);
        }
      } else if (data) {
        setProfile({
          ...data,
          social_links: (data.social_links as SocialLink[] | null) ?? null,
          album_card_style: (data.album_card_style === 'large' || data.album_card_style === 'compact'
            ? data.album_card_style
            : null) as 'large' | 'compact' | null,
          theme: (data.theme && ['light', 'dark', 'midnight', 'system'].includes(data.theme)
            ? data.theme
            : null) as 'light' | 'dark' | 'midnight' | 'system' | null | undefined,
        });
        setNickname(data.nickname || '');
        setSavedAvatarUrl(data.avatar_url);

        // Load saved album card style from localStorage (takes priority)
        const storedStyle = localStorage.getItem('album-card-style');
        const albumStyle: 'large' | 'compact' = (storedStyle === 'large' || storedStyle === 'compact')
          ? storedStyle
          : (data.album_card_style === 'large' || data.album_card_style === 'compact')
            ? data.album_card_style
            : 'large';

        // Get theme from database (don't use useTheme() value as it may be undefined initially)
        const profileTheme: 'system' | 'light' | 'dark' | 'midnight' =
          data.theme && ['light', 'dark', 'midnight', 'system'].includes(data.theme)
            ? data.theme as 'system' | 'light' | 'dark' | 'midnight'
            : 'system';

        // Build email preferences object from loaded preferences
        const emailPrefs: Record<string, boolean> = {};
        types.forEach(type => {
          const pref = preferences.find(p => p.type_key === type.type_key);
          // If no preference exists, default to opted in (opted_out = false)
          // For newsletter, also check newsletter_opt_in for backward compatibility
          if (type.type_key === 'newsletter') {
            emailPrefs[type.type_key] = data.newsletter_opt_in ?? (pref ? !pref.opted_out : true);
          } else {
            emailPrefs[type.type_key] = pref ? !pref.opted_out : true;
          }
        });

        // Set form values and baseline for dirty comparison
        const formValues: AccountFormData = {
          fullName: data.full_name || '',
          bio: data.bio || '',
          website: data.website || '',
          socialLinks: (data.social_links as { label: string; url: string }[]) || [],
          interests: userInterests,
          albumCardStyle: albumStyle,
          theme: profileTheme,
          emailPreferences: emailPrefs,
        };
        reset(formValues);
        setSavedFormValues(formValues);
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
    }

    setIsLoading(false);
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/account/stats');
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats({
        galleries: 0,
        photos: 0,
        commentsMade: 0,
        commentsReceived: 0,
        rsvpsConfirmed: 0,
        rsvpsCanceled: 0,
        eventsAttended: 0,
        galleryViews: 0,
        profileViews: 0,
        lastLoggedIn: null,
      });
    }
  };

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
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    // Store file and create preview - actual upload happens on save
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setPendingAvatarRemove(false);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    // Revoke previous preview URL if exists
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    // Mark avatar for removal - actual removal happens on save
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarRemove(true);
    setAvatarError(null);
  };

  const handleCancelAvatarChange = () => {
    // Revoke preview URL if exists
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    // Reset pending avatar changes
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarRemove(false);
    setAvatarError(null);
  };

  const onSubmit = async (data: AccountFormData) => {
    if (!user) return;

    setIsSaving(true);
    setSubmitError(null);
    setSuccess(false);

    try {
      // Handle avatar changes first
      let newAvatarUrl: string | null = savedAvatarUrl;

      if (pendingAvatarFile) {
        // Upload new avatar
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

        const { data: { publicUrl } } = supabase.storage
          .from('user-avatars')
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrl;
      } else if (pendingAvatarRemove) {
        newAvatarUrl = null;
      }

      // Filter out empty social links
      const validSocialLinks = data.socialLinks.filter(link => link.label.trim() && link.url.trim());

      // Sync interests: get current interests, delete removed ones, insert new ones
      const { data: currentInterests } = await supabase
        .from('profile_interests')
        .select('interest')
        .eq('profile_id', user.id);

      const currentInterestNames = (currentInterests || []).map((pi) => pi.interest);
      const newInterestNames = data.interests.map((i) => i.toLowerCase().trim()).filter(Boolean);

      // Delete removed interests
      const interestsToRemove = currentInterestNames.filter((i) => !newInterestNames.includes(i));
      if (interestsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('profile_interests')
          .delete()
          .eq('profile_id', user.id)
          .in('interest', interestsToRemove);

        if (deleteError) {
          setSubmitError(`Failed to remove interests: ${deleteError.message}`);
          setIsSaving(false);
          return;
        }
      }

      // Insert new interests
      const interestsToAdd = newInterestNames.filter((i) => !currentInterestNames.includes(i));
      if (interestsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('profile_interests')
          .insert(interestsToAdd.map((interest) => ({
            profile_id: user.id,
            interest,
          })));

        if (insertError) {
          setSubmitError(`Failed to add interests: ${insertError.message}`);
          setIsSaving(false);
          return;
        }
      }

      // Update email preferences
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

      // For backward compatibility, also update newsletter_opt_in
      const newsletterOptIn = data.emailPreferences['newsletter'] ?? true;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName || null,
          bio: data.bio || null,
          website: data.website || null,
          social_links: validSocialLinks.length > 0 ? validSocialLinks : null,
          album_card_style: data.albumCardStyle,
          theme: data.theme,
          newsletter_opt_in: newsletterOptIn,
          avatar_url: newAvatarUrl,
        })
        .eq('id', user.id);

      if (error) {
        setSubmitError(error.message);
      } else {
        // Apply theme change
        if (data.theme !== theme) {
          setTheme(data.theme);
        }
        // Save album card style to localStorage
        localStorage.setItem('album-card-style', data.albumCardStyle);

        // Update saved avatar URL and clear pending changes
        setSavedAvatarUrl(newAvatarUrl);
        if (pendingAvatarPreview) {
          URL.revokeObjectURL(pendingAvatarPreview);
        }
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
        setPendingAvatarRemove(false);

        // Update profile state
        setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);

        // Reload email preferences to get updated state
        const updatedPreferences = await getUserEmailPreferences(user.id);
        setEmailPreferences(updatedPreferences);

        // Rebuild email preferences object to match what we saved (ensures exact match)
        const savedEmailPrefs: Record<string, boolean> = {};
        emailTypes.forEach(type => {
          savedEmailPrefs[type.type_key] = data.emailPreferences[type.type_key] ?? true;
        });

        // Create the saved data with filtered social links and interests
        const savedData: AccountFormData = {
          fullName: data.fullName || '',
          bio: data.bio || '',
          website: data.website || '',
          socialLinks: validSocialLinks,
          interests: newInterestNames,
          albumCardStyle: data.albumCardStyle,
          theme: data.theme,
          emailPreferences: savedEmailPrefs,
        };

        // Reset form to saved values and update baseline
        reset(savedData);
        setSavedFormValues(savedData);

        // Revalidate profile pages and interests
        if (nickname) {
          await revalidateProfile(nickname);
          // Revalidate interests if they changed
          if (interestsToAdd.length > 0 || interestsToRemove.length > 0) {
            await revalidateInterests();
            // Revalidate each changed interest
            for (const interest of [...interestsToAdd, ...interestsToRemove]) {
              await revalidateInterest(interest);
            }
          }
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        refreshAuthProfile();
      }
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      setSubmitError('An unexpected error occurred');
    }

    setIsSaving(false);
  };

  // Determine which avatar to display:
  // 1. If there's a pending upload, show the preview
  // 2. If pending removal, show nothing (Avatar component will show initials)
  // 3. Otherwise show saved avatar (profile.avatar_url is the single source of truth)
  const displayAvatarUrl = pendingAvatarPreview
    ? pendingAvatarPreview
    : pendingAvatarRemove
      ? null
      : savedAvatarUrl;
  const fullName = watch('fullName');

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Account settings</h1>
          <p className="text-lg opacity-70">
            Manage your profile information and preferences
          </p>
        </div>

        {/* No-JS fallback: show message and hide loading spinner */}
        <noscript>
          <style>{`.js-loading { display: none !important; }`}</style>
          <div className="rounded-xl border border-border-color bg-background-light p-6 text-center">
            <p className="text-lg font-medium mb-2">JavaScript required</p>
            <p className="text-foreground/70">
              This page requires JavaScript to manage your account settings.
              Please enable JavaScript in your browser to continue.
            </p>
          </div>
        </noscript>

        {isLoading ? (
          <div className="js-loading">
            <LoadingSpinner centered />
          </div>
        ) : (
          <div className="space-y-8">
            <form id="account-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Basic Info Section */}
              <div>
                <h2 className="mb-4 text-lg font-semibold opacity-70">Basic info</h2>
                <Container>
                  {/* Profile Picture */}
                  <div className="mb-6 flex items-center gap-6 border-b border-border-color pb-6">
                    <div className={clsx(
                      "rounded-full border-2",
                      hasAvatarChanges ? "border-primary" : "border-border-color",
                    )}>
                      <Avatar
                        avatarUrl={displayAvatarUrl}
                        fullName={fullName || user?.email}
                        size="xl"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSaving}
                          variant="secondary"
                          type="button"
                        >
                          {pendingAvatarFile ? 'Choose different' : 'Upload new picture'}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={isSaving}
                        />
                        {/* Show Remove button if there's a saved avatar or pending upload (and not already marked for removal) */}
                        {(savedAvatarUrl || pendingAvatarFile) && !pendingAvatarRemove && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={handleRemoveAvatar}
                            disabled={isSaving}
                          >
                            Remove
                          </Button>
                        )}
                        {/* Show Cancel button if there are pending avatar changes */}
                        {hasAvatarChanges && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancelAvatarChange}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-foreground/50">
                        JPG, PNG, GIF or WebP. Max 5MB.
                      </p>
                      {avatarError && (
                        <p className="mt-2 text-sm text-red-500">{avatarError}</p>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      {emailChangedFromUrl && (
                        <SuccessMessage variant="compact">
                          Your email has been successfully changed!
                        </SuccessMessage>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={profile?.email || user?.email || ''}
                          disabled
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setIsEmailModalOpen(true)}
                        >
                          Change
                        </Button>
                      </div>
                    </div>

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

                    <div className="flex flex-col gap-2">
                      <label htmlFor="nickname" className="text-sm font-medium">
                        Nickname (username)
                      </label>
                      <Input
                        id="nickname"
                        type="text"
                        value={nickname}
                        disabled
                      />
                      <p className="text-xs text-foreground/50">
                        Your nickname is used in your gallery URLs and cannot be changed.
                        <br />
                        URL:{' '}
                        <span className="break-words">
                          {(() => {
                            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
                            const url = `${baseUrl}/@${nickname || 'your-nickname'}`;
                            return url.replace(/^https?:\/\//, '');
                          })()}
                        </span>
                      </p>
                    </div>
                  </div>
                </Container>
              </div>

              {/* Public Profile Section */}
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold opacity-70">Your public profile</h2>
                <Container>
                  <p className="text-sm text-foreground/60 mb-4">
                    This information will be visible on your public profile page.
                  </p>
                  <div className="space-y-4">
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

                    <div className="flex flex-col gap-2">
                      <label htmlFor="website" className="text-sm font-medium">
                        Website
                      </label>
                      <Input
                        id="website"
                        type="url"
                        {...register('website')}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    {/* Social Links */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          Social links
                        </label>
                        <span className="text-xs text-foreground/50">
                          {fields.length}/3
                        </span>
                      </div>
                      <p className="text-xs text-foreground/50 mb-2">
                        Add up to 3 links to your social profiles
                      </p>

                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border-color bg-background-light p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
                            <Input
                              type="text"
                              {...register(`socialLinks.${index}.label`)}
                              placeholder="Label (e.g., Instagram)"
                              fullWidth={false}
                              className="w-full sm:w-1/3"
                            />
                            <Input
                              type="url"
                              {...register(`socialLinks.${index}.url`)}
                              placeholder="https://..."
                              fullWidth={false}
                              className="w-full sm:flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => remove(index)}
                              variant="danger"
                              aria-label="Remove link"
                              icon={<CloseSVG className="size-4" />}
                              className="w-full sm:w-auto !px-2 !py-2"
                            >
                              <span className="sm:hidden">Remove</span>
                            </Button>
                          </div>
                        ))}

                        {fields.length < 3 && (
                          <Button
                            type="button"
                            variant="secondary"
                            icon={<PlusIconSVG className="size-4" />}
                            onClick={() => append({ label: '', url: '' })}
                          >
                            Add social link
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Interests */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        Interests
                      </label>
                      <Controller
                        name="interests"
                        control={control}
                        render={({ field }) => (
                          <InterestInput
                            id="interests"
                            interests={field.value || []}
                            onAddInterest={(interest) => {
                              const current = field.value || [];
                              if (!current.includes(interest) && current.length < 10) {
                                field.onChange([...current, interest]);
                              }
                            }}
                            onRemoveInterest={(interest) => {
                              const current = field.value || [];
                              field.onChange(current.filter((i) => i !== interest));
                            }}
                            maxInterests={10}
                            helperText="Add up to 10 interests to help others discover you"
                            disabled={isSaving}
                          />
                        )}
                      />
                    </div>
                  </div>
                </Container>
              </div>

              {/* App preferences Section */}
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold opacity-70">App preferences</h2>
                <Container>
                  <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        Theme
                      </label>
                      <Controller
                        name="theme"
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'system', label: 'Auto', icon: (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )},
                              { value: 'light', label: 'Light', icon: (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                              )},
                              { value: 'dark', label: 'Dark', icon: (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                              )},
                              // More than 2 themes not supported in the MobileMenu yet
                              // { value: 'midnight', label: 'Midnight', icon: (
                              //   <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              //   </svg>
                              // )},
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={clsx(
                                  "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                                  themeMounted && field.value === option.value
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border-color hover:border-border-color-strong",
                                )}
                              >
                                {option.icon}
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                      <p className="text-xs text-foreground/50">
                        {themeMounted && theme === 'system'
                          ? `Currently using ${resolvedTheme} mode based on your system`
                          : 'Choose your preferred color scheme'}
                      </p>
                    </div>

                    {/* Gallery card style */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        Gallery card style
                      </label>
                      <Controller
                        name="albumCardStyle"
                        control={control}
                        render={({ field }) => (
                          <div className="grid sm:grid-cols-2 gap-3">
                            {/* Large option */}
                            <button
                              type="button"
                              onClick={() => field.onChange('large')}
                              className={clsx(
                                "rounded-lg border-2 p-3 text-left transition-colors",
                                field.value === 'large'
                                  ? "border-primary bg-primary/5"
                                  : "border-border-color hover:border-border-color-strong",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={clsx(
                                      "size-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                                      field.value === 'large' ? "border-primary" : "border-border-color-strong",
                                    )}>
                                      {field.value === 'large' && (
                                        <div className="size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <span className="font-medium text-sm">Large</span>
                                  </div>
                                  <p className="text-xs text-foreground/50 ml-6">
                                    Info visible below image
                                  </p>
                                </div>
                                {/* Wireframe - top right */}
                                <div className="w-20 shrink-0 rounded border border-border-color-strong overflow-hidden bg-background">
                                  <div className="h-12 bg-foreground/5" />
                                  <div className="p-1.5 bg-background-light border-t border-border-color-strong">
                                    <div className="h-1 w-4/5 bg-foreground/20 rounded mb-1.5" />
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <div className="size-2 rounded-full bg-foreground/15" />
                                        <div className="h-1 w-6 bg-foreground/10 rounded" />
                                      </div>
                                      <div className="h-1 w-4 bg-foreground/10 rounded" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Compact option */}
                            <button
                              type="button"
                              onClick={() => field.onChange('compact')}
                              className={clsx(
                                "rounded-lg border-2 p-3 text-left transition-colors",
                                field.value === 'compact'
                                  ? "border-primary bg-primary/5"
                                  : "border-border-color hover:border-border-color-strong",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={clsx(
                                      "size-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                                      field.value === 'compact' ? "border-primary" : "border-border-color-strong",
                                    )}>
                                      {field.value === 'compact' && (
                                        <div className="size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <span className="font-medium text-sm">Compact</span>
                                  </div>
                                  <p className="text-xs text-foreground/50 ml-6">
                                    Info shown on hover
                                  </p>
                                </div>
                                {/* Wireframe - top right */}
                                <div className="w-20 shrink-0 rounded border border-border-color-strong overflow-hidden bg-background">
                                  <div className="h-[4.75rem] bg-foreground/5 relative">
                                    <div className="absolute inset-x-0 top-0 p-1.5 bg-gradient-to-b from-background-light to-transparent">
                                      <div className="h-1 w-3/4 bg-foreground/25 rounded" />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-background-light to-transparent">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                          <div className="size-2 rounded-full bg-foreground/20" />
                                          <div className="h-1 w-5 bg-foreground/15 rounded" />
                                        </div>
                                        <div className="h-1 w-4 bg-foreground/15 rounded" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      />
                    </div>

                    {/* Email Preferences */}
                    <div className="flex flex-col gap-4">
                      <label className="text-sm font-medium">
                        Email preferences
                      </label>
                      <p className="text-xs text-foreground/50 -mt-2">
                        Choose which types of emails you&apos;d like to receive. You can change these settings anytime.
                      </p>
                      {emailTypes.length > 0 ? (
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
                                      labelClassName="mt-0.75"
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
                        <p className="text-xs text-foreground/50">
                          Loading email preferences...
                        </p>
                      )}
                    </div>
                  </div>
                </Container>
              </div>
            </form>

            {/* Account Info Section */}
            <div>
              <h2 className="mb-4 text-lg font-semibold opacity-70">Account info</h2>
              <Container>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Member since</p>
                      <p className="text-foreground/70">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Last logged in</p>
                      <p className="text-foreground/70">
                        {stats.lastLoggedIn
                          ? new Date(stats.lastLoggedIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border-color-strong pt-4">
                    <p className="mb-3 text-sm font-medium text-foreground">Activity</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-foreground/70">Galleries</p>
                        <p className="text-lg font-semibold text-foreground">{stats.galleries}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Photos</p>
                        <p className="text-lg font-semibold text-foreground">{stats.photos}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Comments made</p>
                        <p className="text-lg font-semibold text-foreground">{stats.commentsMade}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Comments received</p>
                        <p className="text-lg font-semibold text-foreground">{stats.commentsReceived}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Events attended</p>
                        <p className="text-lg font-semibold text-foreground">{stats.eventsAttended}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">RSVPs</p>
                        <p className="text-lg font-semibold text-foreground">{stats.rsvpsConfirmed} / {stats.rsvpsCanceled}</p>
                      </div>
                    </div>
                  </div>

                  {(stats.galleryViews > 0 || stats.profileViews > 0) && (
                    <div className="border-t border-border-color pt-4">
                      <p className="mb-3 text-sm font-medium text-foreground">Engagement</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {stats.galleryViews > 0 && (
                          <div>
                            <p className="text-foreground/70">Gallery views</p>
                            <p className="text-lg font-semibold text-foreground">{stats.galleryViews}</p>
                          </div>
                        )}
                        {stats.profileViews > 0 && (
                          <div>
                            <p className="text-foreground/70">Profile views</p>
                            <p className="text-lg font-semibold text-foreground">{stats.profileViews}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Container>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Sticky Save Button */}
      {changeCount > 0 && (
        <StickyActionBar constrainWidth>
          <div className="flex items-center gap-3 text-sm">
            {submitError && (
              <ErrorMessage variant="compact" className="text-sm py-1.5">{submitError}</ErrorMessage>
            )}
            {success && (
              <SuccessMessage variant="compact" className="text-sm py-1.5">
              Profile updated!
              </SuccessMessage>
            )}
            {!submitError && !success && hasChanges && (
              <span className="text-foreground/70">
                {changeCount} unsaved {changeCount === 1 ? 'change' : 'changes'}
              </span>
            )}
          </div>
          <Button
            type="submit"
            form="account-form"
            disabled={isSaving || !hasChanges}
            loading={isSaving}
          >
          Save changes
          </Button>
        </StickyActionBar>
      )}

      {/* Email Change Modal */}
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={profile?.email || user?.email || ''}
        onSuccess={() => {
          // Optionally refresh profile after email change initiated
        }}
      />
    </>
  );
}
