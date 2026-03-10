import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { createNoIndexMetadata } from '@/utils/metadata';
import Link from 'next/link';

export const metadata = createNoIndexMetadata({
  title: 'Account Scheduled for Deletion',
  description: 'Your account is scheduled for deletion.',
});

export default function AccountDeletedPage() {
  return (
    <PageContainer>
      <Container
        padding="lg"
        className="mx-auto max-w-xl"
      >
        <div
          className="space-y-6 text-center"
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10"
          >
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold sm:text-3xl"
          >
            Account scheduled for deletion
          </h1>

          <p
            className="text-foreground/70"
          >
            Your account has been scheduled for permanent deletion. All your content will be permanently removed within 30 days.
          </p>

          <p
            className="text-foreground/70"
          >
            If you changed your mind and want to keep your account, please contact us as soon as possible through our contact form.
          </p>

          <div
            className="flex flex-col items-center gap-3 pt-4"
          >
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Contact us to cancel deletion
            </Link>
            <Link
              href="/"
              className="text-sm text-foreground/60 hover:text-foreground/80 transition-colors"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </Container>
    </PageContainer>
  );
}
