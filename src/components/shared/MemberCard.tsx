import Avatar from '@/components/auth/Avatar';
import Link from 'next/link';

interface MemberCardProps {
  member: {
    id: string;
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  };
  /** Optional badge text (e.g., "5 photos this week") */
  badge?: string;
  className?: string;
}

/**
 * Reusable member card component showing avatar, name, and optional badge
 * Links to the member's profile page
 */
export default function MemberCard({ member, badge, className }: MemberCardProps) {
  if (!member.nickname) {
    return null;
  }

  return (
    <Link
      href={`/@${member.nickname}`}
      className={`group flex flex-col items-center gap-2 rounded-lg border border-border-color bg-background-light px-2 py-3 transition-colors hover:border-primary hover:bg-background ${className || ''}`}
    >
      <Avatar
        avatarUrl={member.avatar_url}
        fullName={member.full_name}
        size="lg"
        hoverEffect
      />
      <div
        className="flex grow flex-col items-center text-center"
      >
        <p
          className="font-medium text-sm leading-tight"
        >
          {member.full_name || `@${member.nickname}`}
        </p>
        {member.full_name && (
          <p
            className="mt-0.5 text-xs text-foreground/60"
          >
            @
            {member.nickname}
          </p>
        )}
        {badge && (
          <p
            className="mt-auto pt-2 text-xs text-foreground/90"
          >
            {badge}
          </p>
        )}
      </div>
    </Link>
  );
}
