import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My photos',
  description: 'View and manage your uploaded photos',
});

export default function PhotosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
