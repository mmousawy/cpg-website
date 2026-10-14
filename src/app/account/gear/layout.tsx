import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';

export default function AccountGearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UnsavedChangesProvider>
      {children}
    </UnsavedChangesProvider>
  );
}
