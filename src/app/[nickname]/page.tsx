import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import AlbumGrid from '@/components/album/AlbumGrid'
import ClickableAvatar from '@/components/shared/ClickableAvatar'
import PageContainer from '@/components/layout/PageContainer'
import { getSocialIcon, getDomain } from '@/utils/socialIcons'
import type { AlbumWithPhotos } from '@/types/albums'

// Revalidate every 60 seconds to reduce database queries
export const revalidate = 60

type SocialLink = {
  label: string
  url: string
}

type ProfileData = {
  id: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  social_links: SocialLink[] | null
  created_at: string | null
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '')
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname

  if (!nickname) {
    return {
      title: 'Profile Not Found',
    }
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nickname, bio')
    .eq('nickname', nickname)
    .single()

  if (!profile) {
    return {
      title: 'Profile Not Found',
    }
  }

  return {
    title: `${profile.full_name || `@${profile.nickname}`}`,
    description: profile.bio || `View the profile and photo albums of @${profile.nickname}`,
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '')
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname

  if (!nickname) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch profile first (needed for albums query)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, bio, website, social_links, created_at')
    .eq('nickname', nickname)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  const typedProfile = profile as unknown as ProfileData

  // Fetch user's public albums (profile.id is now available)
  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      profile:profiles(full_name, nickname, avatar_url),
      photos:album_photos(id, photo_url)
    `)
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const albumsWithPhotos = (albums || []) as unknown as AlbumWithPhotos[]

  // Get total photo count
  const totalPhotos = albumsWithPhotos.reduce((acc, album) => acc + (album.photos?.length || 0), 0)

  const socialLinks = (typedProfile.social_links || []) as SocialLink[]

  return (
    <>
      <PageContainer>
        {/* Profile Header */}
        <div className="mb-8 sm:mb-10">
          {/* Avatar and Name */}
          <div className="mb-3 sm:mb-6 flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0 rounded-full outline outline-2 outline-transparent outline-offset-2 focus-within:outline-primary transition-none">
              <div className="flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center overflow-hidden rounded-full border-2 border-border-color">
                <ClickableAvatar
                  avatarUrl={typedProfile.avatar_url}
                  fullName={typedProfile.full_name}
                  className="size-full"
                  suppressFocusOutline
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="sm:text-3xl text-xl font-bold truncate">
                {typedProfile.full_name || `@${typedProfile.nickname}`}
              </h1>
              {typedProfile.full_name && (
                <p className="sm:text-lg text-base opacity-70">
                  @{typedProfile.nickname}
                </p>
              )}

              {/* Links - Desktop only (inline with name) */}
              {(typedProfile.website || socialLinks.length > 0) && (
                <div className="hidden sm:flex flex-wrap items-center gap-2 sm:mt-2">
                  {typedProfile.website && (
                    <a
                      href={typedProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {getDomain(typedProfile.website)}
                    </a>
                  )}
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      {getSocialIcon(link.label)}
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Links - Mobile only (full width below avatar) */}
          {(typedProfile.website || socialLinks.length > 0) && (
            <div className="flex sm:hidden flex-wrap items-center gap-2 mb-4">
              {typedProfile.website && (
                <a
                  href={typedProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {getDomain(typedProfile.website)}
                </a>
              )}
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {getSocialIcon(link.label)}
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Bio */}
          {typedProfile.bio && (
            <div className="sm:text-lg text-base opacity-80 mb-4 max-w-prose">
              {typedProfile.bio.split('\n').map((line, index) => (
                <p key={index} className={line.trim() === '' ? 'h-4' : 'leading-relaxed'}>
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Photo Albums Section */}
        <div>
          <h2 className="mb-2 sm:mb-4 sm:text-xl text-lg font-semibold">
            Photos by @{typedProfile.nickname}
          </h2>

          {/* Stats */}
          <div className="mb-6 flex items-center gap-6 text-sm opacity-70">
            <span>{albumsWithPhotos.length} {albumsWithPhotos.length === 1 ? 'album' : 'albums'}</span>
            <span>{totalPhotos} {totalPhotos === 1 ? 'photo' : 'photos'}</span>
          </div>

          {albumsWithPhotos.length === 0 ? (
            <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
              <p className="text-lg opacity-70">
                No public albums yet.
              </p>
            </div>
          ) : (
            <AlbumGrid albums={albumsWithPhotos} />
          )}
        </div>
      </PageContainer>

      {/* Articles/Posts Section - Coming Soon */}
      <PageContainer variant="alt" className="border-t border-t-border-color">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="sm:text-xl text-lg font-semibold opacity-50">
            Articles by @{typedProfile.nickname}
          </h2>
          <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium opacity-50">
            Coming soon
          </span>
        </div>
        <p className="text-sm opacity-40">
          Articles and posts will be available here in a future update.
        </p>
      </PageContainer>
    </>
  )
}

