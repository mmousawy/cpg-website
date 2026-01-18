'use client';

import type { UploadingPhoto } from '@/hooks/usePhotoUpload';
import clsx from 'clsx';
import Image from 'next/image';

interface UploadingPhotoCardProps {
  upload: UploadingPhoto;
  onDismiss?: (id: string) => void;
}

/**
 * Card showing an uploading photo with progress indicator
 */
export default function UploadingPhotoCard({ upload, onDismiss }: UploadingPhotoCardProps) {
  const { id, previewUrl, progress, status, error } = upload;

  const isComplete = status === 'complete';
  const isError = status === 'error';
  const isUploading = status === 'uploading';
  const isProcessing = status === 'processing';

  return (
    <div
      className="relative aspect-square overflow-hidden bg-background-medium"
    >
      {/* Preview image */}
      <Image
        src={previewUrl}
        alt="Uploading..."
        fill
        className={clsx(
          'object-cover transition-all duration-300',
          !isComplete && 'opacity-60 blur-[1px]',
        )}
        sizes="(max-width: 768px) 33vw, 200px"
        unoptimized // Use object URL directly
      />

      {/* Progress overlay */}
      {!isComplete && !isError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/30"
        >
          {/* Circular progress indicator */}
          <div
            className="relative size-12"
          >
            <svg
              className="size-12 -rotate-90"
              viewBox="0 0 48 48"
            >
              {/* Background circle */}
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              {/* Progress circle */}
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                className="transition-all duration-200"
              />
            </svg>
            {/* Percentage text */}
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className="text-xs font-bold text-white drop-shadow-md"
              >
                {isProcessing ? '...' : `${progress}%`}
              </span>
            </div>
          </div>

          {/* Status text */}
          <p
            className="mt-2 text-xs font-medium text-white drop-shadow-md"
          >
            {isUploading && 'Uploading...'}
            {isProcessing && 'Processing...'}
            {status === 'pending' && 'Waiting...'}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {isError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/80 p-2"
        >
          <svg
            className="size-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p
            className="mt-1 text-center text-xs font-medium text-white line-clamp-2"
          >
            {error || 'Failed'}
          </p>
          {onDismiss && (
            <button
              onClick={() => onDismiss(id)}
              className="mt-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Bottom progress bar (alternative/additional indicator) */}
      {!isComplete && !isError && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-black/30"
        >
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
