import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function SignupLayout({
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
