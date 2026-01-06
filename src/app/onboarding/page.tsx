import JavaScriptRequired from '@/components/shared/JavaScriptRequired'
import OnboardingClient from './OnboardingClient'

export default function OnboardingPage() {
  return (
    <>
      <JavaScriptRequired />
      <div className="js-content">
        <OnboardingClient />
      </div>
    </>
  )
}
