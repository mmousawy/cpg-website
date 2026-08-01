import AuthRouteProvidersLayout from '@/components/layout/AuthRouteProvidersLayout';

export default function ResetPasswordLayout({
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
