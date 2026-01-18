import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { createNoIndexMetadata } from '@/utils/metadata';
import SignupClient from './SignupClient';

export const metadata = createNoIndexMetadata({
  title: 'Sign up',
  description: 'Create a new account to join the Creative Photography Group community',
});

export default function SignupPage() {
  return (
    <>
      <JavaScriptRequired />
      <div
        className="js-content"
      >
        <SignupClient />
      </div>
    </>
  );
}
