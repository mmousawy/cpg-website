import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import LoginClient from './LoginClient';

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
