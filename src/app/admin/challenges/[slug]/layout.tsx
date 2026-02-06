// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ slug: 'sample-slug' }];
}

export default function AdminChallengeSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    {children}
  </>;
}
