import type { GearCategory } from '@/lib/gear/types';

export type CuratedGearEntry = {
  sourceKey: string;
  category: GearCategory;
  brand: string;
  name: string;
};

/** Phones and a few common items Wikidata may miss on first import */
export const CURATED_GEAR: CuratedGearEntry[] = [
  { sourceKey: 'apple-iphone-16-pro', category: 'phone', brand: 'Apple', name: 'iPhone 16 Pro' },
  { sourceKey: 'apple-iphone-15-pro', category: 'phone', brand: 'Apple', name: 'iPhone 15 Pro' },
  { sourceKey: 'apple-iphone-14-pro', category: 'phone', brand: 'Apple', name: 'iPhone 14 Pro' },
  { sourceKey: 'google-pixel-9-pro', category: 'phone', brand: 'Google', name: 'Pixel 9 Pro' },
  { sourceKey: 'google-pixel-8-pro', category: 'phone', brand: 'Google', name: 'Pixel 8 Pro' },
  { sourceKey: 'samsung-galaxy-s24-ultra', category: 'phone', brand: 'Samsung', name: 'Galaxy S24 Ultra' },
  { sourceKey: 'kodak-portra-400', category: 'film', brand: 'Kodak', name: 'Portra 400' },
  { sourceKey: 'kodak-gold-200', category: 'film', brand: 'Kodak', name: 'Gold 200' },
  { sourceKey: 'ilford-hp5-plus', category: 'film', brand: 'Ilford', name: 'HP5 Plus' },
  { sourceKey: 'fujifilm-x100vi', category: 'camera_body', brand: 'Fujifilm', name: 'X100VI' },
];
