'use client';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import SignupBypassGenerator from '@/components/admin/SignupBypassGenerator';

export default function AdminToolsPage() {
  return (
    <PageContainer>
      <Container
        padding="lg"
      >
        <div
          className="mb-8"
        >
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
        </div>

        <div
          className="space-y-6"
        >
          <SignupBypassGenerator />
        </div>
      </Container>
    </PageContainer>
  );
}
