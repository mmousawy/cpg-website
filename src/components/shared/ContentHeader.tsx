import Avatar from '@/components/auth/Avatar';
import Link from 'next/link';

interface ContentHeaderProps {
  /** Main title */
  title?: string | null;
  /** Description/body text */
  description?: string | null;
  /** Profile data for the author */
  profile: {
    full_name: string | null;
    nickname: string;
    avatar_url: string | null;
  };
  /** Date to display */
  date: string;
  /** Optional metadata lines (e.g., "12 photos", EXIF data) */
  metadata?: string[];
  /** Optional children rendered below the two columns */
  children?: React.ReactNode;
}

/**
 * Shared two-column header layout for photos and albums
 * Left: Title & Description
 * Right: Author, Date, Metadata
 */
export default function ContentHeader({
  title,
  description,
  profile,
  date,
  metadata = [],
  children,
}: ContentHeaderProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Two column layout on desktop */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-6">
        {/* Left column: Title & Description */}
        <div className="flex-1">
          {title && (
            <h1 className="text-3xl font-bold mb-3">{title}</h1>
          )}
          {description && (
            <p className="text-base md:text-lg opacity-80 max-w-[50ch] whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>

        {/* Right column: User, Date, Metadata */}
        <div className="space-y-1 md:w-60 md:max-w-60 border-t max-sm:pt-5 border-border-color md:border-t-0 md:shrink-0 md:border-l md:pl-6">
          {/* User info */}
          <Link
            href={`/@${profile.nickname}`}
            className="group inline-flex items-center gap-1.5 hover:text-primary transition-colors mb-2"
          >
            <Avatar
              avatarUrl={profile.avatar_url}
              fullName={profile.full_name}
              hoverEffect
              size="xs"
            />
            <span className="flex flex-col leading-tight">
              <span className="font-medium">{profile.full_name}</span>
              <span className="text-xs opacity-70">@{profile.nickname}</span>
            </span>
          </Link>

          {/* Date */}
          <p className="text-sm opacity-80">{formattedDate}</p>

          {/* Additional metadata */}
          {metadata.map((meta, i) => (
            <p key={i} className="text-sm opacity-80">{meta}</p>
          ))}
        </div>
      </div>

      {/* Optional content below both columns */}
      {children}
    </div>
  );
}
