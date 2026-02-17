'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useFormChanges } from '@/hooks/useFormChanges';
import { useSupabase } from '@/hooks/useSupabase';
import {
  getEmailTypes,
  getUserEmailPreferences,
  updateEmailPreferences,
  type EmailPreference,
  type EmailTypeData,
} from '@/utils/emailPreferencesClient';

import {
  revalidateInterest,
  revalidateInterests,
  revalidateProfile,
} from '@/app/actions/revalidate';

// Zod schema for form validation
const socialLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z
    .string()
    .url('Must be a valid URL starting with https://')
    .startsWith('https://', 'URL must start with https://'),
});

export const accountFormSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  socialLinks: z.array(socialLinkSchema).max(3, 'Maximum 3 social links allowed'),
  interests: z.array(z.string()).max(10, 'Maximum 10 interests allowed'),
  albumCardStyle: z.enum(['large', 'compact']),
  theme: z.enum(['system', 'light', 'dark', 'midnight']),
  emailPreferences: z.record(z.string(), z.boolean()),
});

export type AccountFormData = z.infer<typeof accountFormSchema>;

export type SocialLink = { label: string; url: string };

export type Profile = Pick<
  Tables<'profiles'>,
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
  social_links: SocialLink[] | null;
  album_card_style: 'large' | 'compact' | null;
  theme?: 'light' | 'dark' | 'midnight' | 'system' | null;
  newsletter_opt_in?: boolean | null;
};

export type AccountStats = {
  albums: number;
  photos: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  likesMade: number;
  viewsReceived: number;
  rsvpsConfirmed: number;
  rsvpsCanceled: number;
  eventsAttended: number;
  memberSince: string | null;
  lastLoggedIn: string | null;
};

export function useAccountForm() {
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

  // Avatar state - saved value and pending changes
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);

  // Store the saved form values as the baseline for dirty comparison
  const [savedFormValues, setSavedFormValues] = useState<AccountFormData | null>(null);

  // Stats state
  const [stats, setStats] = useState<AccountStats>({
    albums: 0,
    photos: 0,
    commentsMade: 0,
    commentsReceived: 0,
    likesReceived: 0,
    likesMade: 0,
    viewsReceived: 0,
    rsvpsConfirmed: 0,
    rsvpsCanceled: 0,
    eventsAttended: 0,
    memberSince: null,
    lastLoggedIn: null,
  });

  // Track which user ID we've loaded data for to avoid reloading on token refresh
  const loadedUserIdRef = useRef<string | null>(null);

  // React Hook Form setup
  const form = useForm<AccountFormData>({
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

  const { register, control, handleSubmit, watch, reset, setValue } = form;

  // Field array for social links
  const socialLinksFieldArray = useFieldArray({
    control,
    name: 'socialLinks',
  });

  // Watch all form values for custom dirty tracking
  const currentValues = watch();

  // Check if avatar has pending changes
  const hasAvatarChanges = pendingAvatarFile !== null || pendingAvatarRemove;

  // Track form changes
  const { hasChanges, changeCount } = useFormChanges(
    currentValues,
    savedFormValues,
    {},
    hasAvatarChanges,
  );

  // Wait for theme to be available client-side
  useEffect(() => {
    setThemeMounted(true);
  }, []);

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

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return;

    // Only load if we haven't loaded for this user yet
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

    const loadProfile = async (types: EmailTypeData[]): Promise<boolean> => {
      if (!user) return false;

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
          .select(
            'id, email, full_name, nickname, avatar_url, bio, website, social_links, album_card_style, theme, created_at, last_logged_in, is_admin, newsletter_opt_in',
          )
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
                album_card_style: (newProfile.album_card_style === 'large' ||
              newProfile.album_card_style === 'compact'
                ? newProfile.album_card_style
                : null) as 'large' | 'compact' | null,
                theme: (newProfile.theme &&
              ['light', 'dark', 'midnight', 'system'].includes(newProfile.theme)
                ? newProfile.theme
                : null) as 'light' | 'dark' | 'midnight' | 'system' | null | undefined,
                newsletter_opt_in: newProfile.newsletter_opt_in ?? false,
              });
              setNickname(newProfile.nickname || '');
              setSavedAvatarUrl(newProfile.avatar_url);

              // Load saved album card style from localStorage (takes priority)
              const storedStyle = localStorage.getItem('album-card-style');
              const albumStyle: 'large' | 'compact' =
              storedStyle === 'large' || storedStyle === 'compact'
                ? storedStyle
                : newProfile.album_card_style === 'large' ||
                    newProfile.album_card_style === 'compact'
                  ? newProfile.album_card_style
                  : 'large';

              // Build email preferences object from loaded preferences
              const emailPrefs: Record<string, boolean> = {};
              types.forEach((type) => {
                const pref = preferences.find((p) => p.type_key === type.type_key);
                // If no preference exists, default to opted in (opted_out = false)
                // For newsletter, also check newsletter_opt_in for backward compatibility
                if (type.type_key === 'newsletter') {
                  emailPrefs[type.type_key] =
                  (newProfile.newsletter_opt_in ?? (pref ? !pref.opted_out : true));
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
            console.info(
              'Profiles table not available, using user metadata:',
              error.message || error.code,
            );
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
            types.forEach((type) => {
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
            album_card_style: (data.album_card_style === 'large' ||
          data.album_card_style === 'compact'
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
          const albumStyle: 'large' | 'compact' =
          storedStyle === 'large' || storedStyle === 'compact'
            ? storedStyle
            : data.album_card_style === 'large' || data.album_card_style === 'compact'
              ? data.album_card_style
              : 'large';

          // Get theme from database (don't use useTheme() value as it may be undefined initially)
          const profileTheme: 'system' | 'light' | 'dark' | 'midnight' =
          data.theme && ['light', 'dark', 'midnight', 'system'].includes(data.theme)
            ? (data.theme as 'system' | 'light' | 'dark' | 'midnight')
            : 'system';

          // Build email preferences object from loaded preferences
          const emailPrefs: Record<string, boolean> = {};
          types.forEach((type) => {
            const pref = preferences.find((p) => p.type_key === type.type_key);
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

          setIsLoading(false);
          return data.is_admin === true;
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
      }

      setIsLoading(false);
      return false;
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
          albums: 0,
          photos: 0,
          commentsMade: 0,
          commentsReceived: 0,
          likesReceived: 0,
          viewsReceived: 0,
          likesMade: 0,
          rsvpsConfirmed: 0,
          rsvpsCanceled: 0,
          eventsAttended: 0,
          memberSince: null,
          lastLoggedIn: null,
        });
      }
    };

    const loadData = async () => {
      try {
        // Load email types first (must be loaded before profile to build preferences correctly)
        const types = await getEmailTypes();

        // Only load profile after email types are loaded
        const isAdmin = await loadProfile(types);

        // Filter out admin-only email types for non-admins
        const filteredTypes = isAdmin
          ? types
          : types.filter((t) => t.type_key !== 'admin_notifications');
        setEmailTypes(filteredTypes);

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
  }, [user, supabase, reset]);

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

        const {
          data: { publicUrl },
        } = supabase.storage.from('user-avatars').getPublicUrl(filePath);

        newAvatarUrl = publicUrl;
      } else if (pendingAvatarRemove) {
        newAvatarUrl = null;
      }

      // Filter out empty social links
      const validSocialLinks = data.socialLinks.filter(
        (link) => link.label.trim() && link.url.trim(),
      );

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
        const { error: insertError } = await supabase.from('profile_interests').insert(
          interestsToAdd.map((interest) => ({
            profile_id: user.id,
            interest,
          })),
        );

        if (insertError) {
          setSubmitError(`Failed to add interests: ${insertError.message}`);
          setIsSaving(false);
          return;
        }
      }

      // Update email preferences
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
        setProfile((prev) => (prev ? { ...prev, avatar_url: newAvatarUrl } : null));

        // Reload email preferences to get updated state
        const updatedPreferences = await getUserEmailPreferences(user.id);
        setEmailPreferences(updatedPreferences);

        // Rebuild email preferences object to match what we saved (ensures exact match)
        const savedEmailPrefs: Record<string, boolean> = {};
        emailTypes.forEach((type) => {
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

  return {
    // Form
    form,
    register,
    control,
    handleSubmit: handleSubmit(onSubmit),
    watch,
    socialLinksFieldArray,

    // State
    profile,
    nickname,
    isLoading,
    isSaving,
    success,
    submitError,
    avatarError,
    themeMounted,
    emailTypes,
    emailPreferences,
    stats,
    isEmailModalOpen,
    setIsEmailModalOpen,
    emailChangedFromUrl,

    // Avatar
    fileInputRef,
    displayAvatarUrl,
    hasAvatarChanges,
    handleAvatarUpload,
    handleRemoveAvatar,
    handleCancelAvatarChange,
    savedAvatarUrl,
    pendingAvatarFile,
    pendingAvatarRemove,

    // Theme
    theme,
    resolvedTheme,

    // Form changes
    hasChanges,
    changeCount,

    // User
    user,
  };
}
