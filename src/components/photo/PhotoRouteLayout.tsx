import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';

export default function PhotoRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollToTopOnRouteChange />
      {children}
    </>
  );
}
