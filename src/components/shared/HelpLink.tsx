import Link from 'next/link';

import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

const sizeMap = {
  sm: { wrapper: 'size-5', icon: 'size-4' },
  md: { wrapper: 'size-5', icon: 'size-4.5' },
  lg: { wrapper: 'size-7', icon: 'size-6' },
};

type HelpLinkProps = {
  href: string;
  label?: string;
  size?: keyof typeof sizeMap;
  className?: string;
};

export default function HelpLink({ href, label, size = 'md', className = '' }: HelpLinkProps) {
  const resolvedHref = href.startsWith('/') ? href : `/help#${href}`;
  const { wrapper, icon } = sizeMap[size];

  return (
    <Link
      href={resolvedHref}
      title={label}
      aria-label={label || 'Help'}
      className={`inline-flex ${wrapper} shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-primary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
    >
      <QuestionMarkCircleSVG
        className={`inline ${icon}`}
      />
    </Link>
  );
}
