import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function LoginLayout({
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
