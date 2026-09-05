import Container from '@/components/layout/Container';
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
          <h2
            className="text-lg font-semibold font-heading text-foreground"
          >
            {title}
          </h2>
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
