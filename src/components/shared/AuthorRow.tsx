import Avatar from '@/components/auth/Avatar';
import MemberHoverCard from '@/components/shared/MemberHoverCard';
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
 * Author display row: [avatar] Name + nickname
 * Used on photo/album pages
 */
export default function AuthorRow({ profile, className }: AuthorRowProps) {
  return (
    <div
      className={className}
    >
      <MemberHoverCard
        nickname={profile.nickname}
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
      >
        <Link
          href={`/@${profile.nickname}`}
          className="group flex items-center gap-3 w-fit"
        >
          <Avatar
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            hoverEffect
            size="md"
          />
          <div
            className="flex-1 min-w-0"
          >
            <p
              className="font-medium text-base group-hover:text-primary transition-colors leading-tight"
            >
              {profile.full_name || profile.nickname}
            </p>
            <p
              className="text-sm text-foreground/60 group-hover:text-primary/80 transition-colors leading-tight mt-0.5"
            >
              @
              {profile.nickname}
            </p>
          </div>
        </Link>
      </MemberHoverCard>
    </div>
  );
}
