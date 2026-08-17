import Button from '@/components/shared/Button';

export default function SkipToContent() {
  return (
    <Button
      href="#main-content"
      variant="primary"
      className="fixed left-4 top-4 z-50 -translate-y-[calc(100%+1.5rem)] focus:translate-y-0"
    >
      Skip to content
    </Button>
  );
}
