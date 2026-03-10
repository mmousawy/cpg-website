import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My challenges',
  description: 'View and manage your challenge submissions',
});

export default function ChallengesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
