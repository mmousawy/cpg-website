import Container from '@/components/layout/Container';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import type { ReactNode } from 'react';

type StatsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function StatsSection({ title, description, children, action }: StatsSectionProps) {
  return (
    <section
      className="space-y-6"
    >
      <div
        className="space-y-4"
      >
        <div>
          <StickySectionHeading
            className="text-foreground"
          >
            {title}
          </StickySectionHeading>
          {description && (
            <p
              className="mt-1 text-sm text-foreground/70"
            >
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <Container>
        {children}
      </Container>
    </section>
  );
}
