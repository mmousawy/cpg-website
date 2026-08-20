'use client';

import AlbumFilmstrip from '@/components/photo/AlbumFilmstrip';
import type { SiblingPhoto } from '@/components/photo/PhotoPageContent';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type PhotoFilmstripShellProps = {
  siblingPhotos: SiblingPhoto[];
  nickname?: string;
  albumSlug?: string;
  basePath?: string;
  sidebar: ReactNode;
  children: ReactNode;
};

function getPhotoShortIdFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1 || photoIndex >= segments.length - 1) return '';
  return decodeURIComponent(segments[photoIndex + 1]);
}

/**
 * Persists album/event/challenge filmstrip across /photo/[photoId] navigations.
 * `children` is the lightbox slot; `sidebar` is the @sidebar parallel route.
 */
export default function PhotoFilmstripShell({
  siblingPhotos,
  nickname,
  albumSlug,
  basePath,
  sidebar,
  children,
}: PhotoFilmstripShellProps) {
  const pathname = usePathname();
  const currentPhotoShortId = getPhotoShortIdFromPathname(pathname);
  const showFilmstrip = siblingPhotos.length > 1;

  return (
    <div
      className="w-full px-4 pt-4 md:p-4 md:flex md:gap-4 md:items-stretch lg:p-8 lg:gap-8"
    >
      <div
        className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)] lg:top-[106px] lg:h-[calc(100vh-138px)] md:flex md:flex-col"
      >
        <div
          className="flex-1 flex items-center justify-center"
        >
          {children}
        </div>
        {showFilmstrip && (
          <div
            className="lg:translate-y-4"
          >
            <AlbumFilmstrip
              photos={siblingPhotos}
              currentPhotoShortId={currentPhotoShortId}
              {...(nickname && albumSlug
                ? { nickname, albumSlug }
                : { basePath })}
            />
          </div>
        )}
      </div>

      {sidebar}
    </div>
  );
}
