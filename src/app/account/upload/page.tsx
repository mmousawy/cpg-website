'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { uploadPhoto } from '@/utils/uploadPhoto';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { UploadDropzone, AlbumPicker } from '@/components/manage';
import Button from '@/components/shared/Button';
import Image from 'next/image';

interface UploadProgress {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select album from URL param
  useEffect(() => {
    const albumId = searchParams.get('album');
    if (albumId) {
      setSelectedAlbumIds([albumId]);
    }
  }, [searchParams]);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setUploadProgress((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        file,
        status: 'pending' as const,
      })),
    ]);
  };

  const handleStartUpload = async () => {
    if (!user || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const uploadPromises = files.map(async (file, index) => {
      // Update status to uploading
      setUploadProgress((prev) => {
        const newProgress = [...prev];
        newProgress[index] = { ...newProgress[index], status: 'uploading' };
        return newProgress;
      });

      try {
        await uploadPhoto(file, user.id, supabase, {
          albumIds: selectedAlbumIds,
          isPublic: true,
          bucketName: 'user-photos',
        });

        // Update status to success
        setUploadProgress((prev) => {
          const newProgress = [...prev];
          newProgress[index] = { ...newProgress[index], status: 'success' };
          return newProgress;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        // Update status to error
        setUploadProgress((prev) => {
          const newProgress = [...prev];
          newProgress[index] = {
            ...newProgress[index],
            status: 'error',
            error: message,
          };
          return newProgress;
        });
        throw err;
      }
    });

    try {
      await Promise.all(uploadPromises);
      // Navigate to photos page after successful upload
      setTimeout(() => {
        router.push('/account/photos');
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Some uploads failed';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
  };

  const allUploaded = uploadProgress.length > 0 && uploadProgress.every((p) => p.status === 'success');

  return (
    <WidePageContainer>
      <div
        className="mb-6 flex items-center justify-between gap-4"
      >
        <div>
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Upload Photos
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Add photos to your library
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.back()}
        >
          ← Back
        </Button>
      </div>

      <div
        className="space-y-6"
      >
        {/* Dropzone */}
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          disabled={isUploading}
        />

        {/* File previews */}
        {files.length > 0 && (
          <div>
            <h2
              className="mb-4 text-lg font-semibold"
            >
              {isUploading
                ? `Uploading ${uploadProgress.filter((p) => p.status === 'uploading').length} of ${files.length} photos...`
                : `${files.length} photo${files.length === 1 ? '' : 's'} ready to upload`}
            </h2>
            <div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {files.map((file, index) => {
                const progress = uploadProgress[index];
                const previewUrl = URL.createObjectURL(file);

                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border-color bg-background-light"
                  >
                    <Image
                      src={previewUrl}
                      alt={file.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                    {progress?.status === 'success' && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-green-500/20"
                      >
                        <div
                          className="rounded-full bg-green-500 p-2 text-white"
                        >
                          <svg
                            className="size-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                    {progress?.status === 'error' && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-red-500/20"
                      >
                        <div
                          className="rounded-full bg-red-500 p-2 text-white"
                        >
                          <svg
                            className="size-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                    {progress?.status === 'pending' && !isUploading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove photo"
                      >
                        <svg
                          className="size-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Album picker */}
        {files.length > 0 && (
          <div
            className="rounded-lg border border-border-color bg-background-light p-6"
          >
            <AlbumPicker
              selectedAlbumIds={selectedAlbumIds}
              onSelectionChange={setSelectedAlbumIds}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500"
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        {files.length > 0 && (
          <div
            className="flex justify-end gap-4"
          >
            <Button
              variant="secondary"
              onClick={() => {
                setFiles([]);
                setUploadProgress([]);
                setError(null);
              }}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              onClick={handleStartUpload}
              disabled={isUploading || allUploaded}
              loading={isUploading}
            >
              {allUploaded ? 'Done - Go to Photos' : 'Upload Photos'}
            </Button>
          </div>
        )}
      </div>
    </WidePageContainer>
  );
}
