import Link from 'next/link';
import { notFound } from 'next/navigation';

import { emailTemplateSlugs, isEmailPreviewDev } from './emailTemplates';

export default function EmailPreviewIndexPage() {
  if (!isEmailPreviewDev()) {
    notFound();
  }

  return (
    <main
      className="mx-auto max-w-lg p-6 font-sans"
    >
      <h1
        className="mb-1 text-xl font-semibold text-[#171717]"
      >
        Email previews
      </h1>
      <p
        className="mb-6 text-sm text-[#666666]"
      >
        Development only. Click a template to preview it.
      </p>
      <ul
        className="list-inside list-disc space-y-1 text-sm"
      >
        {emailTemplateSlugs.map((slug) => (
          <li
            key={slug}
          >
            <Link
              href={`/email/${slug}`}
              className="text-[#38785f] underline"
            >
              {slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
