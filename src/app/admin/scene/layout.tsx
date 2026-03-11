import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Scene events',
  description: 'Manage community scene events',
});

export default function SceneLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
