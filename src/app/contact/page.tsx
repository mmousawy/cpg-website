import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { createMetadata } from '@/utils/metadata';
import ContactClient from './ContactClient';

export const metadata = createMetadata({
  title: 'Contact us',
  description: 'Get in touch with the Creative Photography Group. We\'d love to hear from you!',
  canonical: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <JavaScriptRequired />
      <div
        className="js-content"
      >
        <ContactClient />
      </div>
    </>
  );
}
