import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { createNoIndexMetadata } from '@/utils/metadata';
import LoginClient from './LoginClient';

export const metadata = createNoIndexMetadata({
  title: 'Log in',
  description: 'Log in to your Creative Photography Group account',
});

export default function LoginPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <LoginClient />
      </div>
    </>
  );
}
