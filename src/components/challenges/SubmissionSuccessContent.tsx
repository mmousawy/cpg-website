'use client';

import Image from 'next/image';

import AwardStarSVG from 'public/icons/award-star.svg';
import CheckAddSVG from 'public/icons/check-add.svg';

interface SubmissionSuccessContentProps {
  challengeTitle: string;
  submittedCount: number;
  photoUrls?: string[];
}

export default function SubmissionSuccessContent({
  challengeTitle,
  submittedCount,
  photoUrls = [],
}: SubmissionSuccessContentProps) {
  // Show up to 4 photos in stack
  const stackedPhotos = photoUrls.slice(0, 4);
  const hasPhotos = stackedPhotos.length > 0;

  return (
    <div
      className="flex flex-col items-center text-center"
    >
      {/* Submitted photo(s) or fallback icon */}
      <div
        className="relative mb-6"
      >
        {/* Background glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-green-600/20 blur-xl scale-150"
        />

        {/* Photo stack container */}
        <div
          className="relative"
          style={{
            width: 112 + (Math.min(stackedPhotos.length, 4) - 1) * 8,
            height: 112 + (Math.min(stackedPhotos.length, 4) - 1) * 8,
          }}
        >
          {hasPhotos ? (
            // Stacked photos
            stackedPhotos.map((url, index) => (
              <div
                key={url}
                className="absolute overflow-hidden rounded-2xl shadow-lg ring-3 ring-white"
                style={{
                  width: 112,
                  height: 112,
                  transform: `translate(${index * 8}px, ${index * 8}px) rotate(${index * 3 - 3}deg)`,
                  zIndex: stackedPhotos.length - index,
                }}
              >
                <Image
                  src={url}
                  alt={`Submitted photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              </div>
            ))
          ) : (
            // Fallback icon
            <div
              className="flex h-28 w-28 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg"
            >
              <CheckAddSVG
                className="h-12 w-12 fill-white"
              />
            </div>
          )}
        </div>

        {/* Success checkmark badge */}
        <div
          className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 shadow-md ring-4 ring-white z-10"
          style={{
            transform: hasPhotos ? `translate(${(stackedPhotos.length - 1) * 8}px, ${(stackedPhotos.length - 1) * 8}px)` : undefined,
          }}
        >
          <CheckAddSVG
            className="h-5 w-5 fill-white"
          />
        </div>

        {/* Photo count badge for multiple photos */}
        {submittedCount > 1 && (
          <div
            className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold shadow-lg z-20"
            style={{
              transform: hasPhotos ? `translate(${(stackedPhotos.length - 1) * 8}px, 0)` : undefined,
            }}
          >
            {submittedCount}
          </div>
        )}
      </div>

      {/* Challenge name */}
      <div
        className="inline-flex items-center gap-2 rounded-full bg-challenge-badge/10 px-3 py-1 mb-6 backdrop-blur-sm border border-challenge-badge/30"
      >
        <AwardStarSVG
          className="size-4 fill-challenge-badge"
        />
        <span
          className="text-base font-medium text-challenge-badge"
        >
          {challengeTitle}
        </span>
      </div>

      {/* Title */}
      <h2
        className="text-xl font-bold text-foreground"
      >
        You&apos;re in!
      </h2>

      {/* Subtitle */}
      <p
        className="text-lg text-foreground/80 mb-4"
      >
        {submittedCount === 1
          ? 'Your photo has been submitted'
          : `Your ${submittedCount} photos have been submitted`}
      </p>

      {/* Info box */}
      <div
        className="w-full max-w-sm rounded-lg bg-challenge-badge/10 border border-challenge-badge/30 p-3"
      >
        <p
          className="text-sm"
        >
          <strong
            className="inline-block mb-2 text-challenge-badge"
          >
            What happens next?
          </strong>
          <br />
          Your submission is now pending review. Once approved, your photo will appear in the challenge gallery for everyone to see!
        </p>
      </div>
    </div>
  );
}
