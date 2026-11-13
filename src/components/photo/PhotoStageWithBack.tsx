'use client';

import PhotoPageBackButton from '@/components/photo/PhotoPageBackButton';
import { useRef, type ReactNode } from 'react';

type PhotoStageWithBackProps = {
  children: ReactNode;
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
};

export default function PhotoStageWithBack({
  children,
  fallbackHref,
  fallbackLabel,
  className,
}: PhotoStageWithBackProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={stageRef}
      className={className}
    >
      <PhotoPageBackButton
        fallbackHref={fallbackHref}
        fallbackLabel={fallbackLabel}
        revealTargetRef={stageRef}
      />
      {children}
    </div>
  );
}
