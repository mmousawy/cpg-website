import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from '@react-email/components';
import type { ReactNode } from 'react';

import Footer, { EmailSocialLinks } from './Footer';
import EmailHeader from './Header';
import { emailBodyStyle, emailContainerStyle } from './styles';

type EmailLayoutProps = {
  previewText: string;
  children: ReactNode;
  fullName?: string;
  recipientEmail?: string;
  optOutLink?: string;
  emailType?: 'events' | 'notifications' | 'newsletter' | 'photo_challenges';
  showFooter?: boolean;
  showSocialLinks?: boolean;
};

export default function EmailLayout({
  previewText,
  children,
  fullName,
  recipientEmail,
  optOutLink,
  emailType,
  showFooter = true,
  showSocialLinks = true,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {previewText}
      </Preview>
      <Tailwind>
        <Body
          style={emailBodyStyle}
        >
          <Container
            style={emailContainerStyle}
          >
            <EmailHeader />
            {children}
            {showFooter && (
              <Footer
                fullName={fullName}
                recipientEmail={recipientEmail}
                optOutLink={optOutLink}
                emailType={emailType}
              />
            )}
          </Container>
          {showSocialLinks && <EmailSocialLinks />}
        </Body>
      </Tailwind>
    </Html>
  );
}
