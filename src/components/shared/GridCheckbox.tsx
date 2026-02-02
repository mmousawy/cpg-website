import clsx from 'clsx';

interface GridCheckboxProps {
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  /**
   * Whether to always show the checkbox (vs only on hover)
   * @default false
   */
  alwaysVisible?: boolean;
  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * Reusable checkbox component for grid items (photos, submissions, etc.)
 * Shows a circular checkbox in the top-left corner with selection state styling.
 */
export default function GridCheckbox({
  isSelected,
  onClick,
  alwaysVisible = false,
  className,
}: GridCheckboxProps) {
  return (
    <div
      data-no-select
      className={clsx(
        'absolute left-2 top-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded border-2 bg-background transition-all',
        isSelected
          ? 'border-primary bg-primary text-white opacity-100 shadow-[0_0_0_2px_#ffffff8a]'
          : alwaysVisible
            ? 'border-white/80 bg-white/60 opacity-100 shadow-[inset_0_0_0_1px_#0000005a,0_0_0_1px_#0000005a]'
            : 'border-white/80 bg-white/60 opacity-0 shadow-[inset_0_0_0_1px_#0000005a,0_0_0_1px_#0000005a] group-hover:opacity-100',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {isSelected && (
        <svg
          className="size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </div>
  );
}
