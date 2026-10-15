import type { ShootingFormat } from '@/lib/gear/types';

export function membersShootingFormatPath(format: ShootingFormat): string {
  return `/members/format/${encodeURIComponent(format)}`;
}

export function membersDailyDriverCameraPath(label: string): string {
  return `/members/camera/${encodeURIComponent(label)}`;
}

export function membersDailyDriverLensPath(label: string): string {
  return `/members/lens/${encodeURIComponent(label)}`;
}
