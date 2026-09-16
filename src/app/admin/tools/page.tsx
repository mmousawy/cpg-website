'use client';

import NewsletterComposer from '@/components/admin/NewsletterComposer';
import SignupBypassGenerator from '@/components/admin/SignupBypassGenerator';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';

export default function AdminToolsPage() {
  return (
    <PageContainer>
      <PageHeading
        title="Admin tools"
        description="Administrative utilities and settings"
      />

      <div
        className="space-y-6"
      >
        <NewsletterComposer />
        <SignupBypassGenerator />
      </div>
    </PageContainer>
  );
}
