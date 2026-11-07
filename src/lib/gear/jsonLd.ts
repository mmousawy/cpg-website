import type { UserGearProfile } from '@/lib/gear/types';
import { buildPersonRefJsonLd } from '@/lib/profile/jsonLd';

type GearCollectionJsonLdInput = {
  name: string;
  url: string;
  creatorNickname: string;
  creatorName: string;
  profile: UserGearProfile;
  brandsByCatalogId?: Record<string, string>;
};

function kitEntries(
  profile: UserGearProfile,
  brandsByCatalogId: Record<string, string>,
): Array<{ name: string; brand?: string }> {
  const entries: Array<{ name: string; brand?: string }> = [];

  const add = (name: string, catalogId: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const brand = catalogId ? brandsByCatalogId[catalogId]?.trim() : undefined;
    entries.push(brand ? { name: trimmed, brand } : { name: trimmed });
  };

  add(profile.dailyDriverBody, profile.dailyDriverBodyCatalogId);
  add(profile.dailyDriverLens, profile.dailyDriverLensCatalogId);
  for (const item of profile.items) {
    add(item.name, item.catalogId);
  }

  return entries;
}

export function buildGearCollectionJsonLd(input: GearCollectionJsonLdInput) {
  const items = kitEntries(input.profile, input.brandsByCatalogId ?? {});

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url,
    author: buildPersonRefJsonLd(input.creatorNickname, input.creatorName),
    ...(items.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Thing',
            name: item.name,
            ...(item.brand && {
              brand: {
                '@type': 'Brand',
                name: item.brand,
              },
            }),
          },
        })),
      },
    }),
  };
}
