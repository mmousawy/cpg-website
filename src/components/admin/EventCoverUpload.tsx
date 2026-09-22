'use client';

import { useState } from 'react';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { validateImage } from '@/utils/imageValidation';
import Image from 'next/image';
import TrashSVG from 'public/icons/trash.svg';

const COVER_MAX_BYTES = 10 * 1024 * 1024;
const COVER_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

interface EventCoverUploadProps {
  coverImageFile: File | null;
  coverImagePreview: string | null;
  coverImage: string;
  onCoverImageChange: (file: File | null) => void;
  onCoverImageRemove: () => void;
  coverImageInputRef: React.RefObject<HTMLInputElement | null>;
  onError?: (error: string | null) => void;
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
  const [localError, setLocalError] = useState<string | null>(null);

  const resetInput = () => {
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  const applyFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const validationError = await validateImage(file, { maxSizeBytes: COVER_MAX_BYTES });
      if (validationError) {
        setLocalError(validationError.message);
        onError?.(validationError.message);
        return;
      }

      setLocalError(null);
      onError?.(null);
      onCoverImageChange(file);
    } catch {
      const message = 'Could not read that image. Please try a JPEG, PNG, GIF, or WebP under 10 MB.';
      setLocalError(message);
      onError?.(message);
    } finally {
      resetInput();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void applyFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void applyFile(e.dataTransfer.files?.[0]);
  };

  const previewSrc = coverImagePreview || coverImage || null;
  const isLocalPreview = !!previewSrc && (previewSrc.startsWith('blob:') || previewSrc.startsWith('data:'));
  const hasPreview = !!(previewSrc || coverImageFile);

  return (
    <div
      className="flex flex-col gap-2"
    >
      <span
        className="text-sm font-medium"
      >
        Cover image
      </span>

      {hasPreview ? (
        <div
          className="space-y-3"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-color"
          >
            {previewSrc && (
              <Image
                src={previewSrc}
                alt="Cover preview"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                unoptimized={isLocalPreview}
              />
            )}
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
              Change image
            </Button>
            <Button
              type="button"
              onClick={() => {
                setLocalError(null);
                onError?.(null);
                onCoverImageRemove();
              }}
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
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p
            className="mb-3 text-sm text-foreground/80"
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
        accept={COVER_ACCEPT}
        onChange={handleFileChange}
        className="sr-only"
      />

      {localError && (
        <ErrorMessage
          variant="compact"
          className="py-1.5 text-sm"
        >
          {localError}
        </ErrorMessage>
      )}

      <p
        className="text-xs text-foreground/50"
      >
        Required to publish. JPEG, PNG, GIF, or WebP (max 10 MB). You can also drop a photo here.
      </p>
    </div>
  );
}
