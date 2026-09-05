'use client';

import Image from 'next/image';

import AwardStarSVG from 'public/icons/award-star.svg';
import CheckAddSVG from 'public/icons/check-add.svg';
import SharedAlbumSVG from 'public/icons/shared-album.svg';

type SubmissionSuccessVariant = 'challenge' | 'album';

interface SubmissionSuccessContentProps {
  destinationTitle: string;
  submittedCount: number;
  photoUrls?: string[];
  variant?: SubmissionSuccessVariant;
}

const variantConfig = {
  challenge: {
    badgeClassName: 'bg-challenge-badge/10 border-challenge-badge/30',
    badgeTextClassName: 'text-challenge-badge',
    badgeIconClassName: 'fill-challenge-badge',
    infoBoxClassName: 'bg-challenge-badge/10 border-challenge-badge/30',
    infoHeadingClassName: 'text-challenge-badge',
    heading: "You're in!",
    subtitle: (count: number) => (
      count === 1
        ? 'Your photo has been submitted'
        : `Your ${count} photos have been submitted`
    ),
    infoHeading: 'What happens next?',
    infoText: 'Your submission is now pending review. Once approved, your photo will appear in the challenge gallery for everyone to see!',
    BadgeIcon: AwardStarSVG,
  },
  album: {
    badgeClassName: 'bg-primary/10 border-primary/30',
    badgeTextClassName: 'text-primary',
    badgeIconClassName: 'fill-primary',
    infoBoxClassName: 'bg-primary/10 border-primary/30',
    infoHeadingClassName: 'text-primary',
    heading: 'Photos added!',
    subtitle: (count: number) => (
      count === 1
        ? 'Your photo has been added to the album'
        : `Your ${count} photos have been added to the album`
    ),
    infoHeading: 'What happens next?',
    infoText: 'Your photos are now visible in the album for everyone to enjoy!',
    BadgeIcon: SharedAlbumSVG,
  },
} as const;

export default function SubmissionSuccessContent({
  destinationTitle,
  submittedCount,
  photoUrls = [],
  variant = 'challenge',
}: SubmissionSuccessContentProps) {
  const config = variantConfig[variant];
  const BadgeIcon = config.BadgeIcon;

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

      {/* Destination name */}
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 backdrop-blur-sm border ${config.badgeClassName}`}
      >
        <BadgeIcon
          className={`size-4 ${config.badgeIconClassName}`}
        />
        <span
          className={`text-base font-medium ${config.badgeTextClassName}`}
        >
          {destinationTitle}
        </span>
      </div>

      {/* Title */}
      <h2
        className="text-xl font-bold text-foreground"
      >
        {config.heading}
      </h2>

      {/* Subtitle */}
      <p
        className="text-lg text-foreground/80 mb-4"
      >
        {config.subtitle(submittedCount)}
      </p>

      {/* Info box */}
      <div
        className={`w-full max-w-sm rounded-lg border p-3 ${config.infoBoxClassName}`}
      >
        <p
          className="text-sm"
        >
          <strong
            className={`inline-block mb-2 ${config.infoHeadingClassName}`}
          >
            {config.infoHeading}
          </strong>
          <br />
          {config.infoText}
        </p>
      </div>
    </div>
  );
}
