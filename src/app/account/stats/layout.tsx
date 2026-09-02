import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My stats',
  description: 'Your photography stats',
});

export default function AccountStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
