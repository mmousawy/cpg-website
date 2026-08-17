import { HomeAlbumsSection } from '@/components/home/HomeAlbumsSection';
import { HomeExploreSection } from '@/components/home/HomeExploreSection';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { HomeMembersSection } from '@/components/home/HomeMembersSection';
import { HomeRecentPhotosSection } from '@/components/home/HomeRecentPhotosSection';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ActivitiesSliderWrapper from '@/components/shared/ActivitiesSliderWrapper';
import SignUpCTA from '@/components/shared/SignUpCTA';
import { socialLinks } from '@/config/socials';
import { createMetadata } from '@/utils/metadata';
import DiscordSVG from 'public/icons/discord.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

export const metadata = {
  ...createMetadata({
    title: 'Photography meetups & community in the Netherlands',
    description: 'A community for analog and digital photographers. Join us for monthly meetups, photo challenges, and skill-sharing talks in the Netherlands.',
    canonical: '/',
    keywords: ['photography', 'photography meetups', 'Netherlands', 'photo walks', 'photography community'],
  }),
  title: {
    absolute: 'Photography meetups & community in the Netherlands - Creative Photography Group',
  },
};

const socialIconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default function Home() {
  return (
    <>
      <HomeHeroSection />
      <div
        className="grid min-w-0 gap-10 md:gap-12 py-10 md:py-12 [&>*]:min-w-0"
      >
        <HomeExploreSection />
        <HomeAlbumsSection />
        <HomeRecentPhotosSection />

        <PageContainer
          className="py-0!"
        >
          <Container>
            <h2
              className="text-2xl font-bold mb-4 font-heading"
            >
              What&apos;s Creative Photography Group?
            </h2>

            <p
              className="max-w-[50ch] text-foreground/90 leading-relaxed mb-4"
            >
              We are a community of photographers who love to create and share our work with others.
              Our goal is to inspire and support each other in our photographic journeys.
              We welcome photographers of all skill levels and backgrounds to join us!
            </p>
            <p
              className="max-w-[50ch] text-foreground/90 leading-relaxed mb-6"
            >
              Join our community for monthly meetups, photo challenges, skill-sharing talks, and more.
              Whether you&apos;re just starting out or have been shooting for years, you&apos;ll find a welcoming space here.
            </p>

            <div>
              <h3
                className="text-lg font-semibold mb-4"
              >
                Connect with us
              </h3>
              <div
                className="flex flex-wrap gap-3"
              >
                {socialLinks.map((social) => {
                  const Icon = socialIconMap[social.name];
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-border-color-strong bg-background px-4 py-1.5 text-sm font-medium font-(family-name:--font-geist-mono) text-foreground transition-colors hover:bg-(--hover-bg) hover:border-(--hover-color) hover:text-(--hover-color)"
                      style={{
                        '--hover-color': social.color,
                        '--hover-bg': `${social.color}15`,
                      } as React.CSSProperties}
                    >
                      <Icon
                        className="size-6 shrink-0 transition-colors group-hover:fill-(--hover-color)"
                      />
                      <span>
                        {social.name}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </Container>
        </PageContainer>

        <SignUpCTA
          variant="banner"
        />

        <PageContainer
          className="py-0!"
        >
          <h2
            className="text-2xl text-center font-bold mb-6 px-2 sm:px-4 font-heading"
          >
            What keeps us clicking
          </h2>
          <ActivitiesSliderWrapper />
        </PageContainer>

        <HomeMembersSection />
      </div>
    </>
  );
}
