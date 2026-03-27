import Link from 'next/link';

import SectionMobileNav from '@/components/shared/SectionMobileNav';
import SectionSidebar from '@/components/shared/SectionSidebar';
import Container from '@/components/layout/Container';
import { SectionScrollProvider } from '@/context/SectionScrollContext';
import PageContainer from '@/components/layout/PageContainer';
import HelpAccordion from '@/components/shared/HelpAccordion';
import { routes } from '@/config/routes';
import { helpSections } from '@/content/help';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Help & FAQ',
  description: 'Get help with your Creative Photography Group account, events, photos, and more.',
  canonical: '/help',
});

export default function HelpPage() {
  const sectionIds = helpSections.map((s) => s.id);

  return (
    <SectionScrollProvider
      sectionIds={sectionIds}
    >
      <PageContainer>
        <div
          className="mb-8"
        >
          <div
            className="flex items-center gap-2 mb-2"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold"
            >
              Help & FAQ
            </h1>
          </div>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            Find answers to common questions about using Creative Photography Group.
          </p>
        </div>

        <div
          className="flex flex-col md:flex-row md:gap-4 lg:gap-8"
        >
          {/* Sticky sidebar - desktop only */}
          <SectionSidebar
            sections={helpSections}
            ariaLabel="Help sections"
          />

          {/* Main content */}
          <div
            className="min-w-0 flex-1 space-y-3 sm:space-y-8 text-sm sm:text-base"
          >
            {helpSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
              >
                <Container
                  variant="default"
                  className='pb-1! md:pb-2!'
                >
                  <h2
                    className="mb-4 text-xl font-semibold sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                  <div
                    className="space-y-0"
                  >
                    {section.items.map((item) => (
                      <HelpAccordion
                        key={item.id}
                        id={item.id}
                        title={item.title}
                      >
                        {item.content}
                      </HelpAccordion>
                    ))}
                  </div>
                </Container>
              </section>
            ))}

            <p>
              Still have questions?
              {' '}
              <Link
                href={routes.contact.url}
                className="text-primary hover:underline underline-offset-4"
              >
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </PageContainer>

      <SectionMobileNav
        sections={helpSections}
        ariaLabel="Help sections"
      />
    </SectionScrollProvider>
  );
}
