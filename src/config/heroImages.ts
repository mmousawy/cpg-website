import { getSupabasePublicObjectUrl } from '@/utils/supabaseHosts';

const HERO_FILES = [
  { file: 'home-hero1.jpg', blurhash: 'UxIN:UMxWqt6~WaKayt7-poJayWBxuayWBWB' },
  { file: 'home-hero2.jpg', blurhash: 'UgJt^=~qtR-:~p%gxbxutRV@V@of%MjtWVof' },
  { file: 'home-hero3.jpg', blurhash: 'UMGIDt4To#?b~9IV%gs8t5MxW.V??bIUWYtR' },
  { file: 'home-hero4.jpg', blurhash: 'UIDcdsHqIwxY~U-qIAxuv|-=RPoL-Uxuf,Rj' },
  { file: 'home-hero5.jpg', blurhash: 'UIG7l8@uZP}@t*AXAXNwOXI:EfOX-Ciwrr$*' },
  { file: 'home-hero6.jpg', blurhash: 'UNIXpr%3xunj-=tSRixt_NRPWANb-;aeoJoz' },
  { file: 'home-hero7.jpg', blurhash: 'UHDlya.8?u~q00IUD%D$I;n$njIpx]kDx]x]' },
] as const;

/** Homepage hero rotation — URLs + blurhashes for instant BlurImage placeholders */
export const HERO_IMAGES = HERO_FILES.map(({ file, blurhash }) => ({
  src: getSupabasePublicObjectUrl('cpg-public', `hero/${file}`),
  blurhash,
}));

/** ~21:9 decode aspect for wide hero placeholders */
export const HERO_BLURHASH_WIDTH = 64;
export const HERO_BLURHASH_HEIGHT = 27;
