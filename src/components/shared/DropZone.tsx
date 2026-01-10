'use client';

import clsx from 'clsx';
import { useCallback, useState } from 'react';
import CameraSVG from 'public/icons/camera.svg';

interface DropZoneProps {
  children: React.ReactNode;
  onDrop: (files: File[]) => void;
  accept?: string[];
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  /** Show overlay when dragging */
  showOverlay?: boolean;
  /** Overlay message */
  overlayMessage?: string;
}

export default function DropZone({
  children,
  onDrop,
  accept = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  className,
  activeClassName,
  showOverlay = true,
  overlayMessage = 'Drop files to upload',
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      
      // Filter by accepted types
      const validFiles = droppedFiles.filter((file) => {
        if (accept.length === 0) return true;
        return accept.includes(file.type);
      });

      if (validFiles.length > 0) {
        onDrop(validFiles);
      }
    },
    [disabled, accept, onDrop],
  );

  return (
    <div
      className={clsx('relative', className, isDragging && activeClassName)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drag overlay */}
      {showOverlay && isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-[2px]">
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-primary bg-background/95 px-10 py-8 text-center shadow-xl">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <CameraSVG className="size-6 fill-primary" />
            </div>
            <p className="text-base font-medium text-primary">{overlayMessage}</p>
            <p className="mt-1 text-sm text-foreground/60">
              Release to upload
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

