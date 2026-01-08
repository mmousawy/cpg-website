import Image from 'next/image';
import Link from 'next/link';

interface AlbumMiniCardProps {
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  href: string;
  /** Highlight this album (e.g., current album context) */
  highlighted?: boolean;
  className?: string;
}

/**
 * Small inline album card with thumbnail and name
 * Used for showing albums a photo is part of
 */
export default function AlbumMiniCard({
  title,
  coverImageUrl,
  href,
  highlighted = false,
  className = '',
}: AlbumMiniCardProps) {
  const coverImage = coverImageUrl || '/placeholder-album.jpg';

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 border pr-3 text-sm transition-colors border-border-color-strong bg-background-light hover:border-primary hover:text-primary ${
        className} ${
        highlighted
          ? ''
          : 'opacity-80'
      }`}
    >
      <div className="relative size-14 shrink-0 overflow-hidden bg-background-light">
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
}
