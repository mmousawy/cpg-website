import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { createNoIndexMetadata } from '@/utils/metadata';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata = createNoIndexMetadata({
  title: 'Reset password',
  description: 'Set a new password for your Creative Photography Group account',
});

export default function ResetPasswordPage() {
  return (
    <>
      <JavaScriptRequired />
      <div
        className="js-content"
      >
        <ResetPasswordClient />
      </div>
    </>
  );
}
