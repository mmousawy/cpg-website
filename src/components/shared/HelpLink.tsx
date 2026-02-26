import Link from 'next/link';

import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

type HelpLinkProps = {
  href: string;
  label?: string;
  className?: string;
  iconClassName?: string;
};

export default function HelpLink({ href, label, className = '', iconClassName = 'size-6' }: HelpLinkProps) {
  const resolvedHref = href.startsWith('/') ? href : `/help#${href}`;

  return (
    <Link
      href={resolvedHref}
      title={label}
      aria-label={label || 'Help'}
      className={`ml-0.5 inline-flex size-6 shrink-0 translate-y-px items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-primary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
    >
      <QuestionMarkCircleSVG
        className={iconClassName}
      />
    </Link>
  );
}
