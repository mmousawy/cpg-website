type AccountMenuChevronProps = {
  direction: 'left' | 'right';
  className?: string;
};

export default function AccountMenuChevron({
  direction,
  className = 'h-4 w-4 shrink-0 opacity-50',
}: AccountMenuChevronProps) {
  const path = direction === 'right' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7';

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}
