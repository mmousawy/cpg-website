import { useTheme } from '@wrksz/themes/client';

export const appThemes = ['light', 'dark', 'midnight'] as const;
export type AppTheme = (typeof appThemes)[number];
export type AppThemeSelection = AppTheme | 'system';

export function useAppTheme() {
  return useTheme<AppTheme>();
}
