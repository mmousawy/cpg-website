import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import BlurImage from '@/components/shared/BlurImage';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import { notFound } from 'next/navigation';

// Cached data functions
import {
  getAllChallengeSlugs,
  getChallengeBySlug,
  getChallengeContributors,
  getChallengePhotos,
} from '@/lib/data/challenges';
import { createMetadata } from '@/utils/metadata';

import ChallengeCoverImage from '@/components/challenges/ChallengeCoverImage';
import ChallengeGallery from '@/components/challenges/ChallengeGallery';
import SubmitButton from '@/components/challenges/SubmitButton';
import ChallengeComments from './ChallengeComments';

import Button from '@/components/shared/Button';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import AwardStarSVG from 'public/icons/award-star.svg';
import CalendarSVG from 'public/icons/calendar2.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import PhotoStackSVG from 'public/icons/photo-stack.svg';
import ClockSVG from 'public/icons/time.svg';

// Pre-render all challenges at build time
export async function generateStaticParams() {
  const slugs = await getAllChallengeSlugs();
  // Must return at least one result for Next.js Cache Components validation
  if (slugs.length === 0) {
    return [{ slug: 'sample' }];
  }
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';

  if (!slug) {
    return createMetadata({
      title: 'Challenge not found',
      description: 'The requested challenge could not be found',
    });
  }

  const { challenge } = await getChallengeBySlug(slug);

  if (!challenge) {
    return createMetadata({
      title: 'Challenge not found',
      description: 'The requested challenge could not be found',
    });
  }

  return createMetadata({
    title: challenge.title,
    description: challenge.prompt,
    image: challenge.cover_image_url,
    canonical: `/challenges/${slug}`,
    type: 'article',
    keywords: ['photo challenge', 'photography', challenge.title],
  });
}

/**
 * Format deadline countdown
 */
function formatDeadline(endsAt: string | null, serverNow: number): string | null {
  if (!endsAt) return null;

  const deadline = new Date(endsAt);
  const now = new Date(serverNow);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 7) {
    return `${Math.ceil(days / 7)} weeks left`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  } else {
    return 'Ending soon';
  }
}

/**
 * Format date for display (e.g., "Monday 15 January 2026")
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug) {
    notFound();
  }

  // Fetch challenge data
  const [challengeData, photos, contributors] = await Promise.all([
    getChallengeBySlug(slug),
    getChallengeBySlug(slug).then((d) =>
      d.challenge ? getChallengePhotos(d.challenge.id) : [],
    ),
    getChallengeBySlug(slug).then((d) =>
      d.challenge ? getChallengeContributors(d.challenge.id) : [],
    ),
  ]);

  const { challenge, serverNow } = challengeData;

  if (!challenge) {
    notFound();
  }

  // Check if challenge is accepting submissions
  const isEnded =
    !challenge.is_active ||
    Boolean(challenge.ends_at && new Date(challenge.ends_at) < new Date(serverNow));

  const deadline = formatDeadline(challenge.ends_at, serverNow);
  const photoCount = photos.length;

  // Transform contributors to AvatarPerson format
  const contributorAvatars: AvatarPerson[] = contributors.map((c) => ({
    id: c.user_id,
    avatarUrl: c.avatar_url,
    fullName: c.full_name,
    nickname: c.nickname,
  }));

  return (
    <>
      {/* Hero Section with Cover Image */}
      {challenge.cover_image_url && (
        <div
          className="relative h-[clamp(14rem,25svw,20rem)] w-full overflow-hidden"
        >
          <BlurImage
            src={challenge.cover_image_url}
            alt={challenge.title}
            fill
            className="object-cover"
            sizes="100vw"
            preload
            blurhash={challenge.image_blurhash}
          />

          {/* Frosted glass blur layer with eased gradient mask */}
          <div
            className="absolute inset-x-0 bottom-0 h-full backdrop-blur-md scrim-gradient-mask-strong"
          />

          {/* Eased gradient overlay */}
          <div
            className="absolute inset-x-0 bottom-0 h-full scrim-gradient-overlay-strong"
          />

          {/* Title overlay */}
          <div
            className="absolute inset-x-0 bottom-0 px-2 pb-0 sm:px-8"
          >
            <div
              className="mx-auto max-w-screen-md"
            >
              {/* Challenge badge */}
              <div
                className="mb-2 flex items-center gap-2"
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-challenge-badge/70 text-shadow-sm backdrop-blur-sm px-2 py-1 text-xs font-medium text-white border border-challenge-badge/90"
                >
                  <AwardStarMiniSVG
                    className="h-4 w-4 fill-current"
                  />
                  Challenge
                </span>
                {isEnded ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                  >
                    <ClockMiniSVG
                      className="h-4 w-4 -ml-0.5 fill-current"
                    />
                    Ended
                  </span>
                ) : deadline && deadline !== 'Ended' ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/70 text-shadow-sm backdrop-blur-sm px-2 py-1 text-xs font-semibold text-white border border-amber-500/90"
                  >
                    <ClockMiniSVG
                      className="h-4 w-4 -ml-0.5 fill-current"
                    />
                    {deadline}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-green-600/70 px-2.5 py-1 text-xs font-semibold text-white text-shadow-sm backdrop-blur-sm border border-green-600/90"
                  >
                    Open
                  </span>
                )}
              </div>
              <h1
                className="text-3xl font-bold sm:text-4xl md:text-5xl"
              >
                {challenge.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <PageContainer
        className={challenge.cover_image_url ? '!pt-6 sm:!pt-8' : ''}
      >
        <Container>
          {/* Title (if no cover image) */}
          {!challenge.cover_image_url && (
            <div
              className="mb-6"
            >
              {/* Challenge badge */}
              <div
                className="mb-3 flex items-center gap-2"
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-challenge-badge px-2 py-1 text-xs font-medium text-white"
                >
                  <AwardStarMiniSVG
                    className="h-4 w-4 fill-current"
                  />
                  Challenge
                </span>
                {isEnded ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2 py-1 text-xs font-medium"
                  >
                    <ClockMiniSVG
                      className="h-4 w-4 -ml-0.5 fill-current"
                    />
                    Ended
                  </span>
                ) : deadline && deadline !== 'Ended' ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2 py-1 text-xs font-semibold text-white"
                  >
                    <ClockMiniSVG
                      className="h-4 w-4 -ml-0.5 fill-current"
                    />
                    {deadline}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Open
                  </span>
                )}
              </div>
              <h1
                className="text-3xl font-bold sm:text-4xl"
              >
                {challenge.title}
              </h1>
            </div>
          )}

          {/* Content wrapper with clearfix for floated image */}
          <div
            className="overflow-hidden"
          >
            {challenge.cover_image_url && (
              <ChallengeCoverImage
                url={challenge.cover_image_url}
                title={challenge.title}
                blurhash={challenge.image_blurhash}
              />
            )}

            {/* About this challenge */}
            <div>
              {/* Stats Bar */}
              <div
                className="grid gap-x-4 gap-y-2 mb-6"
              >
                {/* Photo count */}
                <span
                  className="flex items-start gap-2 text-sm font-semibold text-foreground/70"
                >
                  <PhotoStackSVG
                    className="size-5 shrink-0 fill-foreground/70 stroke-none"
                  />
                  {photoCount}
                  {' '}
                  photo
                  {photoCount !== 1 ? 's' : ''}
                  {' '}
                  submitted
                </span>

                {/* Deadline */}
                {isEnded ? (
                  <span
                    className="flex items-start gap-2 text-sm font-semibold text-foreground/70"
                  >
                    <CalendarSVG
                      className="size-5 shrink-0 fill-foreground/70"
                    />
                    Ended on
                    {' '}
                    {formatDate(challenge.ends_at)}
                  </span>
                ) : deadline ? (
                  <span
                    className="flex items-start gap-2 text-sm font-semibold text-foreground/70"
                  >
                    <CalendarSVG
                      className="size-5 shrink-0 fill-foreground/70 stroke-none"
                    />
                    Ends on:
                    {' '}
                    {formatDate(challenge.ends_at)}
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-2 text-sm font-semibold text-foreground/70"
                  >
                    <ClockSVG
                      className="size-5 shrink-0 fill-foreground/70 stroke-none"
                    />
                    Open indefinitely
                  </span>
                )}
              </div>
              <h2
                className="mb-3 text-lg font-semibold"
              >
                About this challenge
              </h2>
              <p
                className="whitespace-pre-line max-sm:text-sm text-foreground/90 leading-relaxed max-w-[50ch] mb-4"
              >
                {challenge.prompt}
              </p>
            </div>
          </div>

          <div
            className="flex justify-between sm:flex-row flex-col gap-4 sm:items-center mt-2 border-t border-t-border-color pt-6"
          >
            {/* Contributors badge */}
            <StackedAvatarsPopover
              people={contributorAvatars}
              singularLabel="contributor"
              pluralLabel="contributors"
              emptyMessage="No contributors yet"
              showInlineCount={true}
              showCountOnMobile={true}
              avatarSize="xs"
            />
            {/* Submit Button */}
            {!isEnded && (
              <SubmitButton
                challengeId={challenge.id}
                challengeTitle={challenge.title}
                maxPhotosPerUser={challenge.max_photos_per_user}
              />
            )}

            {isEnded && (
              <Button
                variant="secondary"
                disabled
              >
                Submissions closed
              </Button>
            )}
          </div>
        </Container>
      </PageContainer>

      {/* Photo Gallery */}
      <WidePageContainer
        className="pt-0!"
      >
        {photos.length > 0 ? (
          <ChallengeGallery
            photos={photos}
          />
        ) : (
          <ChallengeEmptyState
            isEnded={isEnded}
          />
        )}
      </WidePageContainer>

      {/* Comments Section */}
      <PageContainer
        variant="alt"
        className="border-t border-t-border-color"
      >
        <ChallengeComments
          challengeId={challenge.id}
        />
      </PageContainer>
    </>
  );
}

/**
 * Engaging empty state for when there are no photos
 */
function ChallengeEmptyState({ isEnded }: { isEnded: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 max-w-md mx-auto text-center"
    >
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
      >
        <AwardStarSVG
          className="h-10 w-10 fill-primary"
        />
      </div>
      <h3
        className="text-xl font-semibold mb-2"
      >
        {isEnded ? 'No submissions' : 'No photos yet!'}
      </h3>
      <p
        className="text-foreground/60 leading-relaxed"
      >
        {isEnded
          ? 'This challenge ended without any accepted submissions.'
          : 'Be the first to share your creativity! Submit your photos and inspire others to join.'}
      </p>
    </div>
  );
}
