import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Privacy Policy',
  description: 'Privacy Policy for Creative Photography Group',
  canonical: '/privacy',
});

export default function PrivacyPage() {
  return (
    <PageContainer>
      <Container
        padding="lg"
        className="mx-auto max-w-3xl"
      >
        <div
          className="space-y-6 sm:space-y-8 text-sm sm:text-base"
        >
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
          >
            <h1
              className="mb-2 sm:mb-4 text-2xl font-bold sm:text-3xl"
            >
              Privacy Policy
            </h1>
            <p
              className="text-sm text-foreground/70"
            >
              Last updated: February 24, 2026
            </p>
          </div>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Introduction
            </h2>
            <p>
              At Creative Photography Group, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Information we collect
            </h2>
            <h3
              className="mb-3 text-lg font-medium sm:text-xl"
            >
              Account information
            </h3>
            <p>
              When you create an account, we collect:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Email address (for account verification and communication)
              </li>
              <li>
                Profile information (nickname, full name, bio, avatar)
              </li>
              <li>
                Authentication information (managed securely by Supabase)
              </li>
            </ul>
            <h3
              className="mb-3 text-lg font-medium sm:text-xl"
            >
              Photos and content
            </h3>
            <p>
              When you upload photos, we store:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Your photos (stored securely in Supabase storage)
              </li>
              <li>
                Metadata associated with photos (titles, descriptions, tags, album associations). We also extract and store EXIF data embedded in your photos, such as camera make and model, lens, exposure settings, focal length, date taken, and GPS coordinates. This data is displayed alongside your photos on the site.
              </li>
              <li>
                Thumbnails and optimized versions for faster loading
              </li>
            </ul>
            <h3
              className="mb-3 text-lg font-medium sm:text-xl"
            >
              Usage data
            </h3>
            <p>
              We may collect information about how you use the service, such as:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Pages visited and features used
              </li>
              <li>
                Interaction data (likes, comments, views)
              </li>
              <li>
                Device and browser information for technical support
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              How we use your information and legal basis
            </h2>
            <p>
              Under the GDPR (AVG), we need a legal basis for processing your data. Here is what we do and why:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                <strong>
                  Contract performance:
                </strong>
                {' '}
                Storing and displaying your photos in galleries, albums, and your profile. Managing your account and profile. Handling event RSVPs and sending confirmations. Sending service-related emails such as event reminders, comment notifications, and challenge updates.
              </li>
              <li>
                <strong>
                  Legitimate interest:
                </strong>
                {' '}
                Analyzing anonymous usage data (via Vercel Analytics) to improve the website. Detecting and preventing spam or abuse. Maintaining the security of the platform.
              </li>
              <li>
                <strong>
                  Consent:
                </strong>
                {' '}
                Sending newsletters and promotional announcements. Signing in with a third-party provider like Google or Discord.
              </li>
            </ul>
            <p>
              <strong>
                We do not sell, rent, or share your personal information or photos with third parties for their commercial purposes.
              </strong>
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Your rights
            </h2>
            <p>
              You have the right to:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                <strong>
                  Access your data:
                </strong>
                {' '}
                Request a copy of the personal data we hold about you
              </li>
              <li>
                <strong>
                  Update your data:
                </strong>
                {' '}
                Edit your profile, name, bio, and avatar through your account settings
              </li>
              <li>
                <strong>
                  Delete your data:
                </strong>
                {' '}
                Delete your photos yourself, or request full account deletion by contacting us
              </li>
              <li>
                <strong>
                  Data portability:
                </strong>
                {' '}
                Request a copy of your data in a portable format
              </li>
              <li>
                <strong>
                  Manage email preferences:
                </strong>
                {' '}
                Unsubscribe from specific email categories (newsletters, event updates, challenge announcements, notifications) using the unsubscribe link in any email, or through your account settings
              </li>
              <li>
                <strong>
                  Object to processing:
                </strong>
                {' '}
                Ask us to stop processing your data for purposes based on legitimate interest. If you object, we will stop unless we have compelling grounds to continue.
              </li>
              <li>
                <strong>
                  Lodge a complaint:
                </strong>
                {' '}
                File a complaint with the Autoriteit Persoonsgegevens (Dutch Data Protection Authority) at
                {' '}
                <a
                  href="https://autoriteitpersoonsgegevens.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  autoriteitpersoonsgegevens.nl
                </a>
              </li>
            </ul>
            <p>
              To exercise these rights, contact us through our website.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Data storage, retention, and third parties
            </h2>
            <p>
              Your account information, photos, and related data are stored using Supabase (authentication, database, and cloud storage). Anonymous web analytics are collected via Vercel Analytics, which does not use cookies or collect personal data (see the Cookies and tracking section below).
            </p>
            <p>
              These services may process data outside the EU/EEA (e.g. in the United States) under appropriate safeguards for international data transfers, including Standard Contractual Clauses (SCCs) approved by the European Commission. We do not share your data with other third parties except as necessary to provide the service.
            </p>
            <p>
              We retain your data for as long as your account is active. When you delete content or your account, we remove the data from our active systems. Some data may remain in backups for a limited period for disaster recovery purposes, but it will not be accessible through the service.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Cookies and tracking
            </h2>
            <p>
              We use cookies and similar technologies only where necessary. We do not use tracking cookies or share data with third parties for advertising purposes.
            </p>
            <h3
              className="mb-3 text-lg font-medium sm:text-xl"
            >
              Functional cookies (authentication)
            </h3>
            <p>
              When you log in, we use cookies to maintain your session. These are essential for the website to function and do not require your consent under Dutch law (Telecommunicatiewet).
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                <strong>
                  Cookie names:
                </strong>
                {' '}
                sb-*-auth-token (set by Supabase)
              </li>
              <li>
                <strong>
                  Purpose:
                </strong>
                {' '}
                Authentication and session management
              </li>
              <li>
                <strong>
                  Type:
                </strong>
                {' '}
                Functional / essential
              </li>
              <li>
                <strong>
                  Retention:
                </strong>
                {' '}
                Duration of your session (until you log out or the session expires)
              </li>
            </ul>
            <h3
              className="mb-3 text-lg font-medium sm:text-xl"
            >
              Web analytics (no cookies)
            </h3>
            <p>
              We use Vercel Analytics to understand how visitors use our website. This service does not use cookies. It collects anonymous, aggregated data only (e.g. page views) and cannot identify individual visitors or track you across other websites. No personal data is collected.
            </p>
            <p>
              You can control or delete cookies through your browser settings. Note that disabling functional cookies may prevent you from logging in or using certain features.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Children&apos;s privacy
            </h2>
            <p>
              Our service is not intended for users under the age of 16. In the Netherlands and the EU, we do not knowingly collect personal information from children under 16 without parental consent.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Data controller and contact
            </h2>
            <p>
              The data controller responsible for your personal data is Creative Photography Group. If you have questions about this Privacy Policy or your data, please contact us through our website or community channels.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of significant changes through our website or email. We encourage you to review this page periodically.
            </p>
          </section>
        </div>
      </Container>
    </PageContainer>
  );
}
