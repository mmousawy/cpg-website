import type { ComponentType } from 'react';

import CameraAnatomyInteractive from './CameraAnatomyInteractive';
import ExposureTriangleInteractive from './ExposureTriangleInteractive';

export const learnInteractiveIds = ['camera-anatomy', 'exposure-triangle'] as const;

export type LearnInteractiveId = (typeof learnInteractiveIds)[number];

export const learnInteractives: Record<LearnInteractiveId, ComponentType> = {
  'camera-anatomy': CameraAnatomyInteractive,
  'exposure-triangle': ExposureTriangleInteractive,
};

export function isLearnInteractiveId(value: string): value is LearnInteractiveId {
  return (learnInteractiveIds as readonly string[]).includes(value);
}
