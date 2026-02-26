import type { LicenseType } from '@/utils/licenses';
import { LICENSE_ORDER, LICENSE_TYPES } from '@/utils/licenses';
import Link from 'next/link';
import BySVG from 'public/icons/licenses/by.svg';
import CcSVG from 'public/icons/licenses/cc.svg';
import CopyrightSVG from 'public/icons/licenses/copyright.svg';
import NcSVG from 'public/icons/licenses/nc.svg';
import NdSVG from 'public/icons/licenses/nd.svg';
import ZeroSVG from 'public/icons/licenses/zero.svg';
import type { FAQSection } from './types';

const LICENSE_ICONS: Record<LicenseType, React.FC<React.SVGProps<SVGSVGElement>>[]> = {
  'all-rights-reserved': [CopyrightSVG],
  'cc-by-nc-nd-4.0': [CcSVG, BySVG, NcSVG, NdSVG],
  'cc-by-nc-4.0': [CcSVG, BySVG, NcSVG],
  'cc-by-4.0': [CcSVG, BySVG],
  cc0: [CcSVG, ZeroSVG],
};

export const licensesHelpSections: FAQSection[] = [
  {
    id: 'understanding',
    title: 'Understanding licenses',
    items: [
      {
        id: 'what-is-license',
        title: 'What is a license?',
        content: (
          <>
            <p
              className="mb-3"
            >
              A license tells others how they may use your photos. When you share a photo online, the license you choose defines whether others can download it, use it commercially, modify it, or if they need to ask your permission first.
            </p>
            <p>
              Setting a license helps protect your work and makes your expectations clear. It also helps others know what they can and cannot do with your images.
            </p>
          </>
        ),
      },
      {
        id: 'why-it-matters',
        title: 'Why does it matter for your photos?',
        content: (
          <p>
            Without a clear license, people may assume they cannot use your photos at all, or worse, use them without permission. By choosing a license, you communicate your intentions and protect your rights. Creative Commons licenses are widely recognized and legally enforceable worldwide.
          </p>
        ),
      },
    ],
  },
  {
    id: 'license-types',
    title: 'License types',
    items: LICENSE_ORDER.map((value) => {
      const info = LICENSE_TYPES[value];
      return {
        id: value,
        title: info.shortName,
        content: (
          <div
            className="flex flex-col gap-3"
          >
            <div
              className="flex items-center gap-2"
            >
              {LICENSE_ICONS[value].map((Icon, i) => (
                <Icon
                  key={i}
                  className="size-8 fill-current"
                />
              ))}
            </div>
            <p>
              {info.description}
            </p>
            {info.url && (
              <p>
                <Link
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline underline-offset-4"
                >
                  Read the full license text
                </Link>
              </p>
            )}
          </div>
        ),
      };
    }),
  },
  {
    id: 'setting-license',
    title: 'Setting your license',
    items: [
      {
        id: 'default-license',
        title: 'Default license for new uploads',
        content: (
          <>
            <p
              className="mb-3"
            >
              Go to Account settings and find the &quot;Copyright & licensing&quot; section. Set your default license there. All new photos you upload will use this license unless you change it.
            </p>
            <p>
              You can also set your copyright holder name, which appears in copyright notices and watermarks.
            </p>
          </>
        ),
      },
      {
        id: 'per-photo-license',
        title: 'Changing the license on a single photo',
        content: (
          <p>
            When editing a photo (from Manage photos or an album), use the License dropdown to change the license for that photo. The change applies only to that photo.
          </p>
        ),
      },
      {
        id: 'bulk-license',
        title: 'Changing the license on multiple photos',
        content: (
          <p>
            Select multiple photos on the Manage photos or album page, then use the License dropdown in the bulk edit sidebar. Choose a license to apply it to all selected photos.
          </p>
        ),
      },
    ],
  },
  {
    id: 'watermarking',
    title: 'Watermarking',
    items: [
      {
        id: 'what-watermark',
        title: 'What does watermarking do?',
        content: (
          <p>
            Watermarking adds a text overlay to your photos when they are uploaded. The text typically includes your copyright notice (e.g. &quot;© 2026 Your Name&quot;). This makes it harder for others to use your photos without attribution and helps identify you as the creator.
          </p>
        ),
      },
      {
        id: 'watermark-styles',
        title: 'Watermark styles',
        content: (
          <>
            <p
              className="mb-3"
            >
              You can choose from two styles in Account → Copyright & licensing:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                <strong>
                  Corner text
                </strong>
                {' '}
                — Small text in the bottom-right corner.
              </li>
              <li>
                <strong>
                  Diagonal text
                </strong>
                {' '}
                — Centered text at a 45° angle across the image.
              </li>
            </ul>
            <p>
              Enable &quot;Auto-watermark photos&quot; in your account settings to apply watermarks to all new uploads.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'exif-copyright',
    title: 'EXIF copyright',
    items: [
      {
        id: 'what-exif',
        title: 'What is EXIF copyright?',
        content: (
          <p>
            EXIF (Exchangeable Image File Format) is metadata embedded in image files. It can store technical data (camera, settings) and copyright information. When you enable &quot;Embed copyright in EXIF&quot;, we add your name and copyright notice to the photo&apos;s metadata so it travels with the file when downloaded.
          </p>
        ),
      },
      {
        id: 'exif-if-missing',
        title: 'When is EXIF copyright added?',
        content: (
          <p>
            We only add copyright metadata if the photo does not already have it. If your camera or editing software already embedded copyright info, we leave it unchanged. This avoids overwriting existing metadata.
          </p>
        ),
      },
    ],
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    items: [
      {
        id: 'change-license-later',
        title: 'Can I change a license later?',
        content: (
          <p>
            Yes. You can change the license on any photo at any time. However, if someone has already downloaded your photo, their copy retains the license it had at the time of download. Changing the license on the site only affects future views and downloads.
          </p>
        ),
      },
      {
        id: 'watermark-quality',
        title: 'Does the watermark affect image quality?',
        content: (
          <p>
            The watermark is overlaid on the image and becomes part of the file. The underlying photo quality is preserved. The watermark itself is rendered at high resolution to stay sharp.
          </p>
        ),
      },
      {
        id: 'download-behavior',
        title: 'What happens when someone downloads my photo?',
        content: (
          <p>
            The downloaded file includes whatever license and metadata were on the photo at the time of download. If you use watermarking, the downloaded image will include the watermark. If you embedded EXIF copyright, that metadata will be in the file.
          </p>
        ),
      },
    ],
  },
];
