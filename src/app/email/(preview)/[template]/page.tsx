import { render } from '@react-email/render';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { getEmailAssetsUrl } from '@/emails/utils/siteUrl';

import { emailTemplateLoaders, isEmailPreviewDev } from '../../emailTemplates';
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
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-6"
      >
        <div
          className="max-w-md text-center"
        >
          <h1
            className="mb-3 font-heading text-xl font-bold text-foreground"
          >
            Template not found:
            {' '}
            {template}
          </h1>
          <p
            className="text-sm text-foreground/60"
          >
            Pick another template from the sidebar, or
            {' '}
            <Link
              href="/email"
              className="text-primary hover:underline"
            >
              go to the index
            </Link>
            .
          </p>
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
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
    >
      <iframe
        className="h-full min-h-0 w-full flex-1 border-0 bg-white"
        srcDoc={previewHtml}
        title={`Email preview: ${template}`}
      />
    </div>
  );
}
