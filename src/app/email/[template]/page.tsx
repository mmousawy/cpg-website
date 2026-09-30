import { render } from '@react-email/render';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { getEmailAssetsUrl } from '@/emails/utils/siteUrl';

import { emailTemplateLoaders, emailTemplateSlugs, isEmailPreviewDev } from '../emailTemplates';
import EmailLoading from './loading';

export default function Email({
  params,
}: {
  params: Promise<{ template: string }>
}) {
  return (
    <Suspense
      fallback={<EmailLoading />}
    >
      <EmailContent
        params={params}
      />
    </Suspense>
  );
}

async function EmailContent({
  params,
}: {
  params: Promise<{ template: string }>
}) {
  if (!isEmailPreviewDev()) {
    notFound();
  }

  await connection();

  const { template } = await params;

  const templateLoader = emailTemplateLoaders[template];

  if (!templateLoader) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
      >
        <div
          className="text-center"
        >
          <h1
            className="mb-4 text-2xl font-bold"
          >
            Template not found:
            {template}
          </h1>
          <p
            className="mb-2 text-gray-600"
          >
            <Link
              href="/email"
              className="text-[#38785f] underline"
            >
              Back to all emails
            </Link>
          </p>
          <ul
            className="mt-2 text-sm"
          >
            {emailTemplateSlugs.map((t) => (
              <li
                key={t}
              >
                <Link
                  href={`/email/${t}`}
                  className="text-[#38785f] underline"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const EmailComponent = (await templateLoader()).default;
  const renderedTemplate = await render(<EmailComponent
    preview
  />);
  const previewHtml = renderedTemplate.replaceAll(`${getEmailAssetsUrl()}/email/`, '/email/');

  return (
    <iframe
      className="min-h-screen w-full"
      srcDoc={previewHtml}
      title={`Email preview: ${template}`}
    />
  );
}
