import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Manage events',
  description: 'Admin event management',
});

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
