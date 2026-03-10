import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My events',
  description: 'View and manage your event RSVPs',
});

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
