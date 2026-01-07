import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <ResetPasswordClient />
      </div>
    </>
  );
}
