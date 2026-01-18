'use client';

import { useRef, useState, DragEvent } from 'react';
import clsx from 'clsx';
import Button from '@/components/shared/Button';
import CameraSVG from 'public/icons/camera.svg';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadDropzone({
  onFilesSelected,
  disabled = false,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/'),
    );

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('image/'),
    );

    if (files.length > 0) {
      onFilesSelected(files);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={clsx(
        'relative rounded-xl border-2 border-dashed transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border-color bg-background',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="flex flex-col items-center justify-center px-6 py-10 text-center"
      >
        <div
          className={clsx(
            'mb-4 flex size-14 items-center justify-center rounded-xl border transition-colors',
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border-color bg-background-light',
          )}
        >
          <CameraSVG
            className={clsx(
              'size-7 transition-colors',
              isDragging ? 'fill-primary' : 'fill-foreground/50',
            )}
          />
        </div>
        <p
          className="mb-1 text-base font-medium"
        >
          {isDragging ? 'Drop photos here' : 'Drag photos here'}
        </p>
        <p
          className="mb-4 text-sm text-foreground/60"
        >
          or click to browse • JPEG, PNG, GIF, WebP
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          Browse files
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
