import type { Database } from '@/database.types';

export type LicenseType = Database['public']['Enums']['license_type'];

export const LICENSE_TYPES: Record<
  LicenseType,
  {
    value: LicenseType;
    name: string;
    shortName: string;
    description: string;
    url: string | null;
    allowsCommercial: boolean;
    allowsDerivatives: boolean;
    requiresAttribution: boolean;
  }
> = {
  'all-rights-reserved': {
    value: 'all-rights-reserved',
    name: 'All Rights Reserved',
    shortName: 'All Rights Reserved',
    description:
      'Only you can use this photo. Others must ask your permission before using, sharing, or modifying it in any way.',
    url: null,
    allowsCommercial: false,
    allowsDerivatives: false,
    requiresAttribution: false,
  },
  'cc-by-nc-nd-4.0': {
    value: 'cc-by-nc-nd-4.0',
    name: 'CC BY-NC-ND 4.0 — Attribution-NonCommercial-NoDerivatives',
    shortName: 'CC BY-NC-ND',
    description:
      "Others can share your photo with credit, but can't change it or use it commercially.",
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    allowsCommercial: false,
    allowsDerivatives: false,
    requiresAttribution: true,
  },
  'cc-by-nc-4.0': {
    value: 'cc-by-nc-4.0',
    name: 'CC BY-NC 4.0 — Attribution-NonCommercial',
    shortName: 'CC BY-NC',
    description:
      'Anyone can use or remix this photo for non-commercial purposes, as long as they credit you.',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    allowsCommercial: false,
    allowsDerivatives: true,
    requiresAttribution: true,
  },
  'cc-by-4.0': {
    value: 'cc-by-4.0',
    name: 'CC BY 4.0 — Attribution',
    shortName: 'CC BY',
    description:
      'Anyone can use, share, or remix this photo — even commercially — as long as they give you credit.',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    allowsCommercial: true,
    allowsDerivatives: true,
    requiresAttribution: true,
  },
  cc0: {
    value: 'cc0',
    name: 'CC0 — Public Domain Dedication',
    shortName: 'CC0',
    description:
      "You're giving up all rights. Anyone can use this photo for anything — no credit needed, no restrictions at all.",
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    allowsCommercial: true,
    allowsDerivatives: true,
    requiresAttribution: false,
  },
} as const;

export const LICENSE_ORDER: LicenseType[] = [
  'all-rights-reserved',
  'cc-by-nc-nd-4.0',
  'cc-by-nc-4.0',
  'cc-by-4.0',
  'cc0',
];

export function getLicenseInfo(license: LicenseType) {
  return LICENSE_TYPES[license];
}

export function formatCopyrightNotice(
  copyrightName: string,
  year: number,
  license: LicenseType,
): string {
  const info = getLicenseInfo(license);
  if (license === 'all-rights-reserved') {
    return `© ${year} ${copyrightName}. All Rights Reserved.`;
  }
  if (license === 'cc0') {
    return `© ${year} ${copyrightName}. Dedicated to the Public Domain (CC0).`;
  }
  return `© ${year} ${copyrightName}. Licensed under ${info.shortName}.`;
}
