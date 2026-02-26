import SectionMobileNav from '@/components/shared/SectionMobileNav';
import SectionSidebar from '@/components/shared/SectionSidebar';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import HelpAccordion from '@/components/shared/HelpAccordion';
import { routes } from '@/config/routes';
import { licensesHelpSections } from '@/content/help/licenses';
import { SectionScrollProvider } from '@/context/SectionScrollContext';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Copyright & licensing',
  description:
    'Learn about photo licenses, watermarking, and EXIF copyright on Creative Photography Group.',
  canonical: '/help/licenses',
});

export default function LicensesHelpPage() {
  const sectionIds = licensesHelpSections.map((s) => s.id);

  return (
    <SectionScrollProvider
      sectionIds={sectionIds}
    >
      <PageContainer>
        <div
          className="mb-8"
        >
          <ArrowLink
            href={routes.help.url}
            direction="left"
            className="mb-2"
          >
            Help
          </ArrowLink>
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Copyright & licensing
          </h1>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            Set licenses for your photos, add watermarks, and embed copyright in
            EXIF metadata.
          </p>
        </div>

        <div
          className="flex flex-col md:flex-row md:gap-4 lg:gap-8"
        >
          <SectionSidebar
            sections={licensesHelpSections}
            ariaLabel="Help sections"
          />

          <div
            className="min-w-0 flex-1 space-y-3 sm:space-y-8 text-sm sm:text-base"
          >
            {licensesHelpSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="-scroll-mt-4"
              >
                <Container
                  variant="default"
                  className="pb-1! md:pb-2!"
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

            <ArrowLink
              href={routes.help.url}
              direction="left"
            >
              Back to Help
            </ArrowLink>
          </div>
        </div>

        <SectionMobileNav
          sections={licensesHelpSections}
          ariaLabel="Help sections"
        />
      </PageContainer>
    </SectionScrollProvider>
  );
}
