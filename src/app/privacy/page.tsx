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
              Last updated: January 21, 2026
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
                Metadata associated with photos (titles, descriptions, tags, album associations)
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
              How we use your information
            </h2>
            <p>
              We use your information to:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Provide and operate the Creative Photography Group service
              </li>
              <li>
                Display your photos in galleries, albums, and your profile
              </li>
              <li>
                Send you important service updates and notifications (you can opt out of marketing emails)
              </li>
              <li>
                Improve our service and fix technical issues
              </li>
              <li>
                Ensure security and prevent abuse
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
              How we store your data
            </h2>
            <p>
              Your data is stored securely using Supabase, a modern database and storage platform. Your photos are stored in secure cloud storage, and your account information is stored in a protected database.
            </p>
            <p>
              We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.
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
                View all information we have about you
              </li>
              <li>
                <strong>
                  Update your data:
                </strong>
                {' '}
                Modify your profile information at any time
              </li>
              <li>
                <strong>
                  Delete your data:
                </strong>
                {' '}
                Delete your photos and account at any time
              </li>
              <li>
                <strong>
                  Data portability:
                </strong>
                {' '}
                Download your photos and data
              </li>
              <li>
                <strong>
                  Opt out:
                </strong>
                {' '}
                Unsubscribe from marketing emails while keeping important service notifications
              </li>
            </ul>
            <p>
              To exercise these rights, use the account settings in the app or contact us directly.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Data retention
            </h2>
            <p>
              We retain your data for as long as your account is active. When you delete content or your account, we remove the data from our active systems. Some data may remain in backups for a limited period for disaster recovery purposes, but it will not be accessible through the service.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Third-party services
            </h2>
            <p>
              We use Supabase for authentication, database, and storage services. Supabase processes your data according to their privacy policy and security standards. We do not share your data with other third parties except as necessary to provide the service.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Cookies and tracking
            </h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember your preferences, and improve the service. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Children&apos;s privacy
            </h2>
            <p>
              Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of significant changes, and continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or your data, please contact us through our website or community channels.
            </p>
          </section>
        </div>
      </Container>
    </PageContainer>
  );
}
