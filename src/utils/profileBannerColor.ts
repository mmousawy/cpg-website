export type ProfileBannerColors = {
  light: string;
  dark: string;
};

/**
 * Deterministic banner fill from a profile nickname (when no custom banner image).
 */
export function getProfileBannerColors(nickname: string): ProfileBannerColors {
  const normalized = nickname.trim().toLowerCase();
  let hash = 0;

  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 38 + (Math.abs(hash >> 8) % 22);
  const lightness = 40 + (Math.abs(hash >> 16) % 12);
  const darkLightness = Math.max(22, lightness - 20);
  const darkSaturation = Math.min(68, saturation + 8);

  return {
    light: `hsl(${hue} ${saturation}% ${lightness}%)`,
    dark: `hsl(${hue} ${darkSaturation}% ${darkLightness}%)`,
  };
}
