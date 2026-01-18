import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Unsubscribe',
  description: 'Unsubscribe from Creative Photography Group emails',
});

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    {children}
  </>;
}
