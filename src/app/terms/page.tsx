import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Terms of Service',
  description: 'Terms of Service for Creative Photography Group',
  canonical: '/terms',
});

export default function TermsPage() {
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
              Terms of Service
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
              Welcome
            </h2>
            <p>
              Welcome to Creative Photography Group. By using our service, you agree to these Terms of Service. Please read them carefully.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Your content and copyright
            </h2>
            <p>
              <strong>
                You retain full ownership and copyright of all photos and content you upload to Creative Photography Group.
              </strong>
              {' '}
              We do not claim ownership of your content, and you are free to use your photos however you wish, including uploading them to other platforms or services.
            </p>
            <p>
              By uploading content to our service, you grant us a limited, non-exclusive license to:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Store and host your photos on our servers
              </li>
              <li>
                Display your photos to you and other users as part of the service
              </li>
              <li>
                Generate thumbnails and optimized versions for faster loading
              </li>
              <li>
                Include your photos in galleries, albums, and other features you choose to use
              </li>
            </ul>
            <p>
              This license is limited to operating and providing the Creative Photography Group service. We do not have the right to:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Sell or commercially exploit your photos
              </li>
              <li>
                License your photos to third parties
              </li>
              <li>
                Use your photos for advertising or marketing purposes without your explicit consent
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Deleting your content
            </h2>
            <p>
              You can delete your photos and content at any time. When you delete content from Creative Photography Group:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                The license you granted us terminates immediately
              </li>
              <li>
                Your content is removed from our servers and storage
              </li>
              <li>
                Your content is no longer visible to other users
              </li>
            </ul>
            <p>
              Note: If you have shared content with others (for example, photos in a shared album), those copies may remain visible until they are also deleted.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Acceptable use
            </h2>
            <p>
              You agree not to upload content that:
            </p>
            <ul
              className="mb-4 ml-6 list-disc"
            >
              <li>
                Violates any laws or regulations
              </li>
              <li>
                Infringes on someone else&apos;s copyright or intellectual property
              </li>
              <li>
                Contains hate speech, harassment, or threats
              </li>
              <li>
                Is pornographic, sexually explicit, or otherwise inappropriate
              </li>
              <li>
                Contains malware, viruses, or other harmful code
              </li>
            </ul>
            <p>
              We reserve the right to remove content that violates these guidelines and to suspend or terminate accounts that repeatedly violate our terms.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Account responsibility
            </h2>
            <p>
              You are responsible for maintaining the security of your account and for all activity that occurs under your account. You agree to notify us immediately if you become aware of any unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Service availability
            </h2>
            <p>
              We strive to provide reliable service, but we do not guarantee that the service will be available at all times. We may perform maintenance, updates, or experience technical issues that temporarily interrupt service.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Changes to terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. We will notify users of significant changes, and continued use of the service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2
              className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl"
            >
              Contact
            </h2>
            <p>
              If you have questions about these terms, please contact us through our website or community channels.
            </p>
          </section>
        </div>
      </Container>
    </PageContainer>
  );
}
