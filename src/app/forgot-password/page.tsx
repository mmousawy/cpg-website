import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { createNoIndexMetadata } from '@/utils/metadata';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata = createNoIndexMetadata({
  title: 'Forgot password',
  description: 'Reset your password for your Creative Photography Group account',
});

export default function ForgotPasswordPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <ForgotPasswordClient />
      </div>
    </>
  );
}
