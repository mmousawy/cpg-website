import FolderSVG from 'public/icons/folder.svg';

export default function AlbumEditEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-12 text-center">
      <FolderSVG className="mb-4 size-16 opacity-80" />
      <h3 className="mb-2 text-lg font-medium">Select an album to edit</h3>
      <p className="text-sm text-foreground/60">
        Click on an album to view and edit its details
      </p>
    </div>
  );
}
