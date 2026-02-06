// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ token: 'sample-token' }];
}

export default function UnsubscribeTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    {children}
  </>;
}
