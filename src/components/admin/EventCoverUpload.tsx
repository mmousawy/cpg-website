'use client';

import Button from '@/components/shared/Button';
import Image from 'next/image';
import TrashSVG from 'public/icons/trash.svg';

interface EventCoverUploadProps {
  coverImageFile: File | null;
  coverImagePreview: string | null;
  coverImage: string;
  onCoverImageChange: (file: File | null) => void;
  onCoverImageRemove: () => void;
  coverImageInputRef: React.RefObject<HTMLInputElement | null>;
  onError?: (error: string) => void;
}

export default function EventCoverUpload({
  coverImageFile,
  coverImagePreview,
  coverImage,
  onCoverImageChange,
  onCoverImageRemove,
  coverImageInputRef,
  onError,
}: EventCoverUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onError?.('Invalid file type. Please use JPEG, PNG, GIF, or WebP.');
        return;
      }

      // Validate file size (max 5 MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        onError?.('File too large. Maximum size is 5 MB.');
        return;
      }

      onCoverImageChange(file);
      onError?.('');
    }
  };

  return (
    <div
      className="flex flex-col gap-2"
    >
      <label
        className="text-sm font-medium"
      >
        Cover Image *
      </label>

      {(coverImagePreview || coverImageFile) ? (
        <div
          className="space-y-3"
        >
          <div
            className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-color"
          >
            <Image
              src={coverImageFile ? URL.createObjectURL(coverImageFile) : coverImagePreview!}
              alt="Cover preview"
              fill
              className="object-cover"
            />
          </div>
          <div
            className="flex gap-2"
          >
            <Button
              type="button"
              onClick={() => coverImageInputRef.current?.click()}
              variant="secondary"
              size="sm"
            >
              Change Image
            </Button>
            <Button
              type="button"
              onClick={onCoverImageRemove}
              variant="secondary"
              size="sm"
              icon={<TrashSVG
                className="h-4 w-4"
              />}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border-2 border-dashed border-border-color p-8 text-center"
        >
          <p
            className="mb-3 text-sm text-foreground/70"
          >
            No cover image selected
          </p>
          <Button
            type="button"
            onClick={() => coverImageInputRef.current?.click()}
            variant="secondary"
            size="sm"
          >
            Select image
          </Button>
        </div>
      )}

      <input
        ref={coverImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <p
        className="text-xs text-foreground/50"
      >
        Upload a cover image for your event (max 5 MB)
      </p>
    </div>
  );
}
