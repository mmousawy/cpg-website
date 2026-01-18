import PageContainer from '@/components/layout/PageContainer';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Page not found',
  description: 'The page you are looking for could not be found',
});

export default function Custom404() {
  return (
    <PageContainer>
      <div
        className="flex min-h-[50vh] items-center justify-center"
      >
        <h2
          className="flex gap-3 text-2xl leading-tight opacity-70 max-sm:text-xl"
        >
          <span
            className="border-r border-r-foreground pr-3"
          >
            404
          </span>
          This page could not be found.
        </h2>
      </div>
    </PageContainer>
  );
}
