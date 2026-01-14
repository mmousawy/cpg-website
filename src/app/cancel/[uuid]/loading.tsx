import PageContainer from '@/components/layout/PageContainer';
import Container from '@/components/layout/Container';

export default function Loading() {
  return (
    <PageContainer>
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-background-light" />
      <Container>
        <div className="h-32 animate-pulse rounded bg-background-light" />
      </Container>
    </PageContainer>
  );
}
