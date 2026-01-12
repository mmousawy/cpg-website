import { ManageDataProvider } from '@/context/ManageDataContext';

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManageDataProvider>{children}</ManageDataProvider>;
}
