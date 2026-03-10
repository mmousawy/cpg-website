import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Manage members',
  description: 'Admin member management',
});

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
