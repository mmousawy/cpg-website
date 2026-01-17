'use client';

interface TagShapeProps {
  width: number;
  height: number;
  holeX: number;
  holeRadius: number;
  tipStart: number;
  tipPoint: number;
  bgColor: string;
  className?: string;
}

/**
 * SVG component for the pointed left edge of a tag with a circular hole.
 * Uses a path with a hole cut out (no mask needed, so no useId required).
 */
export default function TagShape({
  width,
  height,
  holeX,
  holeRadius,
  tipStart,
  tipPoint,
  bgColor,
  className,
}: TagShapeProps) {
  const strokeWidth = 1;
  const inset = strokeWidth / 2;

  // Path boundaries
  const top = inset;
  const bottom = height - inset;
  const right = width - inset;
  const centerY = height / 2;

  // Create outer path (pentagon shape)
  // Then create inner circle path (drawn counter-clockwise to cut a hole)
  // SVG path with hole: draw outer clockwise, inner counter-clockwise
  const outerPath = `
    M ${tipStart} ${top}
    L ${right} ${top}
    L ${right} ${bottom}
    L ${tipStart} ${bottom}
    L ${tipPoint} ${centerY}
    Z
  `;

  // Circle as a path (counter-clockwise for hole)
  // Using two arc commands to draw a full circle
  const circleLeft = holeX - holeRadius;
  const circleRight = holeX + holeRadius;
  const holePath = `
    M ${circleLeft} ${centerY}
    A ${holeRadius} ${holeRadius} 0 0 0 ${circleRight} ${centerY}
    A ${holeRadius} ${holeRadius} 0 0 0 ${circleLeft} ${centerY}
    Z
  `;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      aria-hidden="true"
    >
      {/* Background with hole cut out */}
      <path
        d={`${outerPath} ${holePath}`}
        fill={bgColor}
        fillRule="evenodd"
      />
      {/* Border for outer shape */}
      <path
        d={outerPath}
        fill="none"
        stroke="var(--tag-border-color)"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
      />
      {/* Border for hole */}
      <circle
        cx={holeX}
        cy={centerY}
        r={holeRadius}
        fill="none"
        stroke="var(--tag-border-color)"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
