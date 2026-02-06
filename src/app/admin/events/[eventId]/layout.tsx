// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ eventId: '0' }];
}

export default function AdminEventIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    {children}
  </>;
}
