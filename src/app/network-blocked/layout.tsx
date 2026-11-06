import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'You have been blocked',
  description: 'You have been blocked from Creative Photography Group by an administrator or an automated system.',
});

export default function NetworkBlockedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('network-blocked-page')",
        }}
      />
      {children}
    </>
  );
}
