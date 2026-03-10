import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Tailwind,
  Text,
} from '@react-email/components';

import EmailHeader from './components/Header';
import Footer from './components/Footer';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const AccountDeletionEmail = ({
  preview,
  fullName,
  deletionDate,
}: {
  preview?: boolean;
  fullName: string;
  deletionDate: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    deletionDate = 'April 9, 2026';
  }

  const previewText = 'Your account is scheduled for deletion';

  return (
    <Html>
      <Head />
      <Preview>
        {previewText}
      </Preview>
      <Tailwind>
        <Body
          className="m-auto bg-[#f7f7f7] p-2 font-sans"
        >
          <Container
            className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-5"
          >
            <EmailHeader />

            <Heading
              className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]"
            >
              Account scheduled for deletion
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {fullName}
              ,
            </Text>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Your Creative Photography Group account has been scheduled for deletion. Here&apos;s what happens next:
            </Text>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                Immediately:
              </strong>
            </Text>
            <Text
              className="ml-4 text-[14px] leading-[24px] text-[#171717]"
            >
              • You have been signed out and can no longer log in
              {'\n'}
              • Your content is hidden from other users
            </Text>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                On
                {' '}
                {deletionDate}
                :
              </strong>
            </Text>
            <Text
              className="ml-4 text-[14px] leading-[24px] text-[#171717]"
            >
              • Your profile and account information will be permanently deleted
              {'\n'}
              • All your photos (including photos contributed to shared albums) will be removed
              {'\n'}
              • Your albums, comments, likes, and all other activity will be removed
              {'\n'}
              • Your stored files will be permanently deleted from our servers
            </Text>

            <Hr
              className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
            />

            <Text
              className="text-[14px] font-semibold leading-[24px] text-[#171717]"
            >
              Changed your mind?
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              If you want to keep your account, please contact us before
              {' '}
              {deletionDate}
              {' '}
              through our contact form and we&apos;ll cancel the deletion:
            </Text>

            <Text
              className="text-center"
            >
              <Link
                href={`${baseUrl}/contact`}
                className="mt-2 inline-block rounded-full border-[0.0625rem] border-[#e5e7ea] bg-[#f7f7f7] px-4 py-2 font-mono text-[14px] font-semibold leading-none text-[#171717] no-underline"
              >
                Contact us
              </Link>
            </Text>

            <Footer
              fullName={fullName}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AccountDeletionEmail;
