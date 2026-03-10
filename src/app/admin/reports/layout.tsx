import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Content reports',
  description: 'Admin content reports and moderation',
});

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
