import DevWorkbenchBootScript from '@/dev/workbench/DevWorkbenchBootScript';
import EmailPreviewAppLayout from '@/dev/email/EmailPreviewAppLayout';

export default function EmailPreviewWorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DevWorkbenchBootScript />
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <EmailPreviewAppLayout>
          {children}
        </EmailPreviewAppLayout>
      </div>
    </>
  );
}
