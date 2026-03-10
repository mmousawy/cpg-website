import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Activity',
  description: 'View your recent activity and notifications',
});

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
