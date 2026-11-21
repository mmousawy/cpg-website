import LearnOverview from '@/components/learn/LearnOverview';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Learn',
  description: 'Photography lessons you can read or present at your next meetup.',
  canonical: '/learn',
});

export default function LearnPage() {
  return (
    <LearnOverview />
  );
}
