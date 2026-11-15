import StoryboardAppLayout from '@/dev/ui/StoryboardAppLayout';
import StoryboardBootScript from '@/dev/ui/StoryboardBootScript';

export default function DevUiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoryboardBootScript />
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <StoryboardAppLayout>
          {children}
        </StoryboardAppLayout>
      </div>
    </>
  );
}
