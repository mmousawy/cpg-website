import Link from 'next/link';
import clsx from 'clsx';
import ArrowLeftSVG from 'public/icons/arrow-left.svg';
import ArrowRightSVG from 'public/icons/arrow-right.svg';

type ArrowLinkProps = {
  href: string
  direction?: 'left' | 'right'
  children: React.ReactNode
  className?: string
}

export default function ArrowLink({
  href,
  direction = 'right',
  children,
  className,
}: ArrowLinkProps) {
  const ArrowIcon = direction === 'left' ? ArrowLeftSVG : ArrowRightSVG;
  const hoverTransform = direction === 'left'
    ? 'group-hover:-translate-x-0.5'
    : 'group-hover:translate-x-0.5';

  return (
    <Link
      href={href}
      className={clsx(
        'group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4',
        className,
      )}
    >
      {direction === 'left' && (
        <ArrowIcon
          className={clsx('size-4 fill-current transition-transform', hoverTransform)}
        />
      )}
      {children}
      {direction === 'right' && (
        <ArrowIcon
          className={clsx('size-4 fill-current transition-transform', hoverTransform)}
        />
      )}
    </Link>
  );
}
