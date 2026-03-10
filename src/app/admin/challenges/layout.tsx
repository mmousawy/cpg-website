import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Manage challenges',
  description: 'Admin challenge management',
});

export default function ChallengesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
