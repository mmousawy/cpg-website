'use client';

import SignupBypassGenerator from '@/components/admin/SignupBypassGenerator';
import PageContainer from '@/components/layout/PageContainer';

export default function AdminToolsPage() {
  return (
    <PageContainer>
      <h1
        className="text-3xl font-bold"
      >
        Admin Tools
      </h1>
      <p
        className="mt-2 text-sm text-foreground/70"
      >
        Administrative utilities and settings
      </p>

      <div
        className="space-y-6 mt-8"
      >
        <SignupBypassGenerator />
      </div>
    </PageContainer>
  );
}
