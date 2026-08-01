import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function EmailLayout({
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
