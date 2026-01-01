'use client'

import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageContainer from '@/components/layout/PageContainer'

import CheckSVG from 'public/icons/check.svg'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
  last_logged_in?: string | null
}

export default function AccountPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user, refreshProfile: refreshAuthProfile } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)

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
  })

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return

    const loadData = async () => {
      try {
        await loadProfile()
        // Load stats after profile is loaded (don't await - let it run in background)
        loadStats().catch(() => {
          // Silently fail - stats are optional
        })
      } catch (err) {
        console.error('Error loading account data:', err)
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname, avatar_url, bio, website, created_at, last_logged_in, is_admin')
        .eq('id', user.id)
        .single()

      // PGRST116 = no rows returned (profile doesn't exist yet)
      // 42P01 = table doesn't exist
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
            .single()

          if (newProfile) {
            setProfile(newProfile)
            setFullName(newProfile.full_name || '')
            setNickname(newProfile.nickname || '')
            setBio(newProfile.bio || '')
            setWebsite(newProfile.website || '')
            setCustomAvatarUrl(newProfile.avatar_url)
          } else if (insertError) {
            console.error('Error creating profile:', insertError.message || insertError)
            // Fall back to user metadata
            setFullName(user.user_metadata?.full_name || '')
          }
        } else {
          // Table might not exist or other error - use user metadata as fallback
          // Don't log as error to avoid triggering error overlay
          console.info('Profiles table not available, using user metadata:', error.message || error.code)
          setFullName(user.user_metadata?.full_name || '')
          // Create a temporary profile object from user data
          setProfile({
            id: user.id,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || null,
            nickname: null,
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: null,
            website: null,
            created_at: user.created_at || new Date().toISOString(),
          })
        }
      } else if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setNickname(data.nickname || '')
        setBio(data.bio || '')
        setWebsite(data.website || '')
        setCustomAvatarUrl(data.avatar_url)
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err)
      // Fall back to user metadata
      setFullName(user.user_metadata?.full_name || '')
    }

    setIsLoading(false)
  }

  const loadStats = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/account/stats')
      if (!response.ok) {
        throw new Error('Failed to load stats')
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
      // Set defaults on error
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
      })
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setAvatarError('Image must be smaller than 5MB')
      return
    }

    setIsUploadingAvatar(true)
    setAvatarError(null)

    try {
      // Generate random filename
      const fileExt = file.name.split('.').pop()
      const randomId = crypto.randomUUID()
      const fileName = `${randomId}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setAvatarError(uploadError.message || 'Failed to upload image')
        setIsUploadingAvatar(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        // If table doesn't exist, still store the URL locally
        if (updateError.code === 'PGRST205' || updateError.message?.includes('Could not find the table')) {
          console.info('Profiles table not available, storing avatar URL locally')
          setCustomAvatarUrl(publicUrl)
          // Update local state even if DB update fails
          setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
        } else {
          console.error('Profile update error:', updateError)
          setAvatarError('Failed to update profile: ' + (updateError.message || 'Unknown error'))
        }
      } else {
        setCustomAvatarUrl(publicUrl)
        setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      }

      // Refresh profile in auth context so Avatar components update
      refreshAuthProfile()
    } catch (err) {
      console.error('Unexpected upload error:', err)
      setAvatarError('An unexpected error occurred')
    }

    setIsUploadingAvatar(false)
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user) return

    setIsUploadingAvatar(true)
    setAvatarError(null)

    try {
      // Update profile to remove custom avatar (fall back to OAuth avatar)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (updateError) {
        // If table doesn't exist, still update locally
        if (updateError.code === 'PGRST205' || updateError.message?.includes('Could not find the table')) {
          console.info('Profiles table not available, updating locally')
          setCustomAvatarUrl(null)
          setProfile(prev => prev ? { ...prev, avatar_url: null } : null)
        } else {
          console.error('Profile update error:', updateError)
          setAvatarError('Failed to update profile: ' + (updateError.message || 'Unknown error'))
        }
      } else {
        setCustomAvatarUrl(null)
        setProfile(prev => prev ? { ...prev, avatar_url: null } : null)
      }

      // Refresh profile in auth context so Avatar components update
      refreshAuthProfile()
    } catch (err) {
      console.error('Unexpected error:', err)
      setAvatarError('An unexpected error occurred')
    }

    setIsUploadingAvatar(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        nickname,
        bio,
        website,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setIsSaving(false)
  }

  // Use custom avatar if set, otherwise fall back to OAuth avatar
  const displayAvatarUrl = customAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const initials = fullName
    ? fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || '??'

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Account settings</h1>
        <p className="text-lg opacity-70">
          Manage your profile information and preferences
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner centered />
      ) : (
        <div className="space-y-8">
          {/* Profile Information Section */}
          <div>
            <h2 className="mb-4 text-lg font-semibold opacity-70">Profile Information</h2>
            <form onSubmit={handleSubmit}>
              <Container>
                {/* Profile Picture */}
                <div className="mb-6 flex items-center gap-6 border-b border-border-color pb-6">
                  <div className="relative">
                    <div className={clsx(
                      "flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border-color",
                      isUploadingAvatar && "opacity-50"
                    )}>
                      {displayAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayAvatarUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="bg-primary text-2xl font-bold text-white flex h-full w-full items-center justify-center">
                          {initials}
                        </span>
                      )}
                    </div>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      <label
                        className={clsx(
                          "cursor-pointer rounded-lg border border-border-color bg-background px-4 py-2 text-sm font-medium transition-colors",
                          "hover:border-primary hover:bg-primary/5",
                          isUploadingAvatar && "pointer-events-none opacity-50"
                        )}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={isUploadingAvatar}
                        />
                        {isUploadingAvatar ? 'Uploading...' : 'Upload new picture'}
                      </label>
                      {customAvatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className={clsx(
                            "rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors",
                            "hover:border-red-500 hover:bg-red-500/10",
                            isUploadingAvatar && "pointer-events-none opacity-50"
                          )}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-foreground/50">
                      JPG, PNG, GIF or WebP. Max 5MB.
                    </p>
                    {!customAvatarUrl && (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && (
                      <p className="mt-1 text-xs text-foreground/50">
                        Currently showing your {user?.app_metadata?.provider === 'google' ? 'Google' : user?.app_metadata?.provider === 'discord' ? 'Discord' : 'social'} profile picture.
                      </p>
                    )}
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
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="rounded-lg border border-border-color bg-background/50 px-3 py-2 text-sm text-foreground/50"
                    />
                    <p className="text-xs text-foreground/50">Email cannot be changed</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="nickname" className="text-sm font-medium">
                      Nickname (username)
                    </label>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      disabled
                      className="rounded-lg border border-border-color bg-background/50 px-3 py-2 text-sm text-foreground/50"
                    />
                    <p className="text-xs text-foreground/50">Your nickname is used in your gallery URLs and cannot be changed. URL: {process.env.NEXT_PUBLIC_SITE_URL}/@{nickname || 'your-nickname'}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="website" className="text-sm font-medium">
                      Website
                    </label>
                    <input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                    <CheckSVG className="h-4 w-4 fill-green-600" />
                    Profile updated successfully!
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="mt-6"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </Container>
            </form>
          </div>

          {/* Account Info Section */}
          <div>
            <h2 className="mb-4 text-lg font-semibold opacity-70">Account Info</h2>
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

                <div className="border-t border-border-color pt-4">
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
  )
}
