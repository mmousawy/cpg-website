'use client';

import clsx from 'clsx';
import CloseSVG from 'public/icons/close.svg';
import TagShape from './TagShape';

interface TagProps {
  text: string;
  count?: number;
  partialTotal?: number;
  size?: 'xs' | 'sm' | 'base' | 'lg';
  isActive?: boolean;
  onRemove?: () => void;
  className?: string;
}

// Size configurations with pre-calculated values
const SIZE_CONFIG = {
  xs: { fontSize: 12, height: 26, holeRadius: 2.4 },
  sm: { fontSize: 13, height: 28, holeRadius: 2.6 },
  base: { fontSize: 14, height: 30, holeRadius: 2.8 },
  lg: { fontSize: 15, height: 32, holeRadius: 3.0 },
} as const;

// Fixed layout values (in em, relative to font size)
const LAYOUT = {
  holeX: 1, // em
  tipStart: 0.75, // em
  tipPoint: 0.05, // em
  svgWidth: 1.5, // em
  cornerRadius: 0.4, // em
  padding: 0.5, // em
};

/**
 * Tag component with pointed left edge, circular hole, and optional count/remove section.
 */
export default function Tag({
  text,
  count,
  partialTotal,
  size = 'sm',
  isActive = false,
  onRemove,
  className,
}: TagProps) {
  const config = SIZE_CONFIG[size];
  const hasRightSection = count !== undefined || onRemove;
  const isLink = !onRemove;

  // Convert em to px for SVG
  const emToPx = (em: number) => em * config.fontSize;

  // SVG dimensions
  const svgWidth = emToPx(LAYOUT.svgWidth);
  const svgHeight = config.height - 2; // Account for border offset

  // Colors
  const bgColor = isActive ? 'var(--primary)' : 'var(--background-light)';
  const lightBgColor = isActive ? 'var(--primary-light)' : 'var(--background-medium)';

  // CSS custom properties for dynamic values (excluding border-color which is handled by classes)
  const cssVars = {
    '--tag-height': `${config.height}px`,
    '--tag-font-size': `${config.fontSize}px`,
    '--tag-padding': `${LAYOUT.padding}em`,
    '--tag-corner-radius': `${LAYOUT.cornerRadius}em`,
  } as React.CSSProperties;

  return (
    <span
      className={clsx(
        'relative flex items-center',
        // Text color
        isActive ? 'text-white' : isLink && 'group-hover:text-primary group-focus:text-primary',
        // Border color via CSS custom property (class-based for hover to work)
        isActive
          ? '[--tag-border-color:var(--primary)]'
          : '[--tag-border-color:var(--border-color-strong)]',
        isLink && !isActive && 'group-hover:[--tag-border-color:var(--primary)] group-focus:[--tag-border-color:var(--primary)]',
        className,
      )}
      style={cssVars}
    >
      {/* Left pointed edge with hole */}
      <TagShape
        className="shrink-0"
        width={svgWidth}
        height={svgHeight}
        holeX={emToPx(LAYOUT.holeX)}
        holeRadius={config.holeRadius}
        tipStart={emToPx(LAYOUT.tipStart)}
        tipPoint={emToPx(LAYOUT.tipPoint)}
        bgColor={bgColor}
      />

      {/* Label section */}
      <span
        className="flex items-center justify-center border-y border-r -ml-0.5"
        style={{
          height: svgHeight,
          padding: '0 var(--tag-padding)',
          backgroundColor: bgColor,
          borderColor: 'var(--tag-border-color)',
          fontSize: 'var(--tag-font-size)',
          borderRightStyle: hasRightSection ? 'dashed' : 'solid',
          borderTopRightRadius: hasRightSection ? 0 : `${LAYOUT.cornerRadius}em`,
          borderBottomRightRadius: hasRightSection ? 0 : `${LAYOUT.cornerRadius}em`,
        }}
      >
        <span
          className={clsx(
            'font-medium whitespace-nowrap uppercase leading-none',
            size === 'lg' && 'font-semibold',
          )}
        >
          {text}
        </span>
      </span>

      {/* Count section */}
      {count !== undefined && !onRemove && (
        <span
          className="flex items-center justify-center border -ml-px"
          style={{
            height: svgHeight,
            padding: '0 var(--tag-padding)',
            backgroundColor: lightBgColor,
            borderColor: 'var(--tag-border-color)',
            fontSize: 'var(--tag-font-size)',
            borderLeftStyle: 'dashed',
            borderTopRightRadius: `${LAYOUT.cornerRadius}em`,
            borderBottomRightRadius: `${LAYOUT.cornerRadius}em`,
          }}
        >
          <span
            className={clsx(
              'text-[0.85em] font-medium whitespace-nowrap leading-none opacity-60',
              isActive && 'opacity-80',
            )}
          >
            {partialTotal !== undefined ? `(${count}/${partialTotal})` : count}
          </span>
        </span>
      )}

      {/* Remove button section */}
      {onRemove && (
        <span
          className="flex items-center justify-center border -ml-px"
          style={{
            height: svgHeight,
            backgroundColor: lightBgColor,
            borderColor: 'var(--tag-border-color)',
            borderTopRightRadius: `${LAYOUT.cornerRadius}em`,
            borderBottomRightRadius: `${LAYOUT.cornerRadius}em`,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-full items-center justify-center px-[0.5em] hover:text-red-500 focus:text-red-500"
            aria-label={`Remove ${text} tag`}
          >
            <CloseSVG
              className="size-4 fill-current"
            />
          </button>
        </span>
      )}
    </span>
  );
}
