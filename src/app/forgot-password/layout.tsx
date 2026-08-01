import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRouteProvidersLayout>
      {children}
    </AuthRouteProvidersLayout>
  );
}
