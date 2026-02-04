import Avatar from '@/components/auth/Avatar';
import Link from 'next/link';

interface AuthorRowProps {
  /** Profile data for the author */
  profile: {
    full_name: string | null;
    nickname: string;
    avatar_url: string | null;
  };
  className?: string;
}

/**
 * Compact author display row: [avatar] Name + nickname
 * Used on photo/album pages
 */
export default function AuthorRow({ profile, className }: AuthorRowProps) {
  return (
    <div
      className={className}
    >
      <Link
        href={`/@${profile.nickname}`}
        className="group flex items-center gap-2.5"
      >
        <Avatar
          avatarUrl={profile.avatar_url}
          fullName={profile.full_name}
          hoverEffect
          size="sm"
        />
        <div
          className="flex-1 min-w-0"
        >
          <p
            className="font-medium text-sm group-hover:text-primary transition-colors leading-tight"
          >
            {profile.full_name || profile.nickname}
          </p>
          <p
            className="text-xs text-foreground/60 group-hover:text-primary/80 transition-colors leading-tight mt-0.5"
          >
            @
            {profile.nickname}
          </p>
        </div>
      </Link>
    </div>
  );
}
