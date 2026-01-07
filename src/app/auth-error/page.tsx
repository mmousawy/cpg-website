import Link from 'next/link';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { routes } from '@/config/routes';

import ErrorSVG from 'public/icons/error.svg';

export default function AuthErrorPage() {
  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <ErrorSVG className="h-8 w-8 fill-red-500" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Authentication error</h1>
        <p className="text-foreground/70 mb-6">
          Something went wrong during the authentication process.
          This could be due to an expired link or an invalid session.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={routes.login.url}
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-alt hover:text-slate-950"
          >
            Try again
          </Link>
          <Link
            href={routes.home.url}
            className="text-primary hover:text-primary-alt"
          >
            Go to homepage
          </Link>
        </div>
      </Container>
    </PageContainer>
  );
}
