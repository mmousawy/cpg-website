import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRouteProvidersLayout>
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('onboarding-page')",
        }}
      />
      {children}
    </AuthRouteProvidersLayout>
  );
}
