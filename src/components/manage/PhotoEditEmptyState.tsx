import CameraSVG from 'public/icons/camera.svg';

export default function PhotoEditEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-12 text-center">
      <CameraSVG className="mb-4 size-16 opacity-80" />
      <h3 className="mb-2 text-lg font-medium">Select a photo to edit</h3>
      <p className="text-sm text-foreground/60">
        Choose a photo to view and edit its details
      </p>
    </div>
  );
}
