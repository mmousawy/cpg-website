import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Admin tools',
  description: 'Admin tools and utilities',
});

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
