'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import PhotoSwipeLightbox from 'photoswipe/lightbox'

import useMasonry from '@/hooks/useMasonry'
import type { AlbumPhoto } from '@/types/albums'

import 'photoswipe/style.css'

type AlbumGalleryProps = {
  photos: AlbumPhoto[]
}

export default function AlbumGallery({ photos }: AlbumGalleryProps) {
  const masonryContainer = useMasonry()

  useEffect(() => {
    let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
      gallery: '#album-gallery',
      children: 'a',
      pswpModule: () => import('photoswipe'),
    })

    lightbox.init()

    return () => {
      lightbox?.destroy()
      lightbox = null
    }
  }, [])

  return (
    <div
      className="grid shrink-0 items-start gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      id="album-gallery"
      ref={masonryContainer}
    >
      {photos.map((photo) => (
        <div
          key={photo.id}
          data-image
          className="relative w-full overflow-hidden rounded-md opacity-0 transition-opacity duration-200"
        >
          <a
            href={photo.photo_url}
            className="block size-full"
            data-pswp-width={photo.width || 1000}
            data-pswp-height={photo.height || 1000}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              src={photo.photo_url}
              alt={photo.title || ''}
              width={400}
              height={300}
              className="size-full rounded-md object-cover"
            />
          </a>
        </div>
      ))}
    </div>
  )
}
