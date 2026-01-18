import ImageSVG from 'public/icons/image.svg';

export default function PhotoEditEmptyState() {
  return (
    <div
      className="flex min-h-full flex-col items-center justify-center p-10 text-center"
    >
      <ImageSVG
        className="mb-2 size-10 opacity-80"
      />
      <h3
        className="mb-2 text-lg font-medium opacity-70"
      >
        Select a photo to edit
      </h3>
      <p
        className="text-sm text-foreground/60"
      >
        Choose a photo to view and edit its details
      </p>
    </div>
  );
}
