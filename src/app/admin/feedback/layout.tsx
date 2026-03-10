import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Feedback',
  description: 'Admin feedback overview',
});

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
