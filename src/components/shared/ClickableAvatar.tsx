'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

type ClickableAvatarProps = {
  avatarUrl: string | null
  fullName: string | null
  className?: string
  suppressFocusOutline?: boolean
}

export default function ClickableAvatar({ avatarUrl, fullName, className, suppressFocusOutline }: ClickableAvatarProps) {
  const galleryId = 'profile-avatar-gallery'
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const imageLoaded = useRef(false)

  // Load image dimensions
  useEffect(() => {
    if (!avatarUrl || imageLoaded.current) return

    const img = new window.Image()
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      imageLoaded.current = true
    }
    img.src = avatarUrl
  }, [avatarUrl])

  useEffect(() => {
    if (!avatarUrl || !dimensions) return

    let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
      gallery: `#${galleryId}`,
      children: 'a',
      pswpModule: () => import('photoswipe'),
      // Prevent upscaling beyond original size
      initialZoomLevel: 'fit',
      secondaryZoomLevel: 1,
      maxZoomLevel: 1,
    })

    lightbox.init()

    return () => {
      lightbox?.destroy()
      lightbox = null
    }
  }, [avatarUrl, dimensions])

  // Generate initials for fallback
  const initials = fullName
    ? fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  if (!avatarUrl) {
    // Non-clickable fallback with initials
    return (
      <div className={`flex items-center justify-center bg-[#5e9b84] text-white font-bold text-2xl ${className || ''}`}>
        {initials}
      </div>
    )
  }

  return (
    <div id={galleryId} className={className}>
      <a
        href={avatarUrl}
        data-pswp-width={dimensions?.width || 500}
        data-pswp-height={dimensions?.height || 500}
        target="_blank"
        rel="noreferrer"
        className={`relative block size-full cursor-zoom-in overflow-hidden rounded-full ${suppressFocusOutline ? 'focus:outline-none' : ''}`}
      >
        <Image
          src={avatarUrl}
          alt={fullName + ' profile avatar' || 'Profile avatar'}
          fill
          className="object-cover"
        />
      </a>
    </div>
  )
}
