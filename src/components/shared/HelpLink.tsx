import Link from 'next/link';

import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

type HelpLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

export default function HelpLink({ href, label, className = '' }: HelpLinkProps) {
  const resolvedHref = href.startsWith('/') ? href : `/help#${href}`;

  return (
    <Link
      href={resolvedHref}
      title={label}
      aria-label={label || 'Help'}
      className={`inline-flex size-8 shrink-0 translate-y-px items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-primary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
    >
      <QuestionMarkCircleSVG
        className="size-6"
      />
    </Link>
  );
}
