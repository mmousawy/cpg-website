'use client';

import NewsletterComposer from '@/components/admin/NewsletterComposer';
import SignupBypassGenerator from '@/components/admin/SignupBypassGenerator';
import PageContainer from '@/components/layout/PageContainer';

export default function AdminToolsPage() {
  return (
    <PageContainer>
      <h1
        className="text-2xl sm:text-3xl font-bold"
      >
        Admin tools
      </h1>
      <p
        className="text-base sm:text-lg mt-2 text-foreground/70"
      >
        Administrative utilities and settings
      </p>

      <div
        className="space-y-6 mt-8"
      >
        <NewsletterComposer />
        <SignupBypassGenerator />
      </div>
    </PageContainer>
  );
}
