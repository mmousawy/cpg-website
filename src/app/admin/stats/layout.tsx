import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Statistics',
  description: 'Admin statistics dashboard',
});

export default function AdminStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
