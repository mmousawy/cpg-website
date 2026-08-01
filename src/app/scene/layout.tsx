import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';

export default function SceneLayout({
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
