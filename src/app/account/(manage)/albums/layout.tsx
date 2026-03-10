import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My albums',
  description: 'View and manage your photo albums',
});

export default function AlbumsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
