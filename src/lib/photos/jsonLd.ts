import { buildPersonRefJsonLd } from '@/lib/profile/jsonLd';
import { getLicenseInfo, type LicenseType } from '@/utils/licenses';
import { getAbsoluteUrl } from '@/utils/metadata';

type ImageObjectInput = {
  name: string;
  description?: string | null;
  contentUrl: string;
  pageUrl: string;
  creatorNickname: string;
  creatorName: string;
  dateCreated?: string | null;
  license?: LicenseType | null;
  copyrightNotice?: string | null;
};

export function buildImageObjectJsonLd(input: ImageObjectInput) {
  const licensePage = getAbsoluteUrl('/help/licenses');
  const licenseInfo = input.license ? getLicenseInfo(input.license) : null;
  const licenseUrl = licenseInfo?.url || licensePage;

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: input.name,
    ...(input.description && { description: input.description }),
    contentUrl: input.contentUrl,
    url: input.pageUrl,
    creator: buildPersonRefJsonLd(input.creatorNickname, input.creatorName),
    creditText: input.creatorName,
    license: licenseUrl,
    acquireLicensePage: licensePage,
    ...(input.copyrightNotice && { copyrightNotice: input.copyrightNotice }),
    ...(input.dateCreated && { dateCreated: input.dateCreated }),
  };
}
