import { notFound } from 'next/navigation';

import { isEmailPreviewDev } from '../emailTemplates';

export default function EmailPreviewIndexPage() {
  if (!isEmailPreviewDev()) {
    notFound();
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center"
    >
      <h1
        className="mb-2 font-heading text-lg font-semibold text-foreground"
      >
        Select a template
      </h1>
      <p
        className="max-w-sm text-sm text-foreground/60"
      >
        Choose an email template from the sidebar to preview its rendered HTML.
      </p>
    </div>
  );
}
