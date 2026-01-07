import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import SignupClient from './SignupClient';

export default function SignupPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <SignupClient />
      </div>
    </>
  );
}
