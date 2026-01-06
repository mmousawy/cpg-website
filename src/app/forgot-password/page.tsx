import JavaScriptRequired from '@/components/shared/JavaScriptRequired'
import ForgotPasswordClient from './ForgotPasswordClient'

export default function ForgotPasswordPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <ForgotPasswordClient />
      </div>
    </>
  )
}
