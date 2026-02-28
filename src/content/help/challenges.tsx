import Link from 'next/link';

import { routes } from '@/config/routes';

import type { FAQSection } from './types';

export const challengesFAQ: FAQSection = {
  id: 'challenges',
  title: 'Challenges',
  items: [
    {
      id: 'how-challenges-work',
      title: 'How photo challenges work',
      content: (
        <p>
          Challenges are themed photo prompts (e.g. &quot;Street Life&quot;, &quot;Minimalism&quot;). Each challenge has a deadline. You submit photos that fit the theme; submissions are reviewed by organizers who accept or reject them. Only accepted photos appear in the challenge gallery. If your photo is rejected, you&apos;ll see the reason in
          {' '}
          <strong>
            My challenge submissions
          </strong>
          {' '}
          (header menu → My challenges).
        </p>
      ),
    },
    {
      id: 'submit-challenge',
      title: 'Submitting to a challenge',
      content: (
        <p>
          Go to
          {' '}
          <strong>
            Challenges
          </strong>
          {' '}
          (main navigation) to open the Photography challenges page. Click an active challenge from the Active challenges section, then click
          {' '}
          <strong>
            Submit photos
          </strong>
          . You can select photos from your library or upload new ones directly in the submission modal. Only photos you own can be submitted. You can usually submit multiple photos per challenge, depending on the challenge rules.
        </p>
      ),
    },
    {
      id: 'challenge-status',
      title: 'Challenge submission status',
      content: (
        <>
          <p
            className="mb-4"
          >
            When you submit a photo to a challenge, organizers review it and accept or reject it. Here&apos;s how the process works:
          </p>
          <p
            className="mb-2 font-medium"
          >
            Status flow
          </p>
          <ul
            className="mb-4 list-disc space-y-1 pl-5 text-foreground/90"
          >
            <li>
              <strong>
                Pending
              </strong>
              {' '}
              — Awaiting review. You can withdraw before it&apos;s reviewed.
            </li>
            <li>
              <strong>
                Accepted
              </strong>
              {' '}
              — Appears in the challenge gallery.
            </li>
            <li>
              <strong>
                Rejected
              </strong>
              {' '}
              — Includes a reason from the reviewer.
            </li>
          </ul>
          <p
            className="mb-4"
          >
            View and manage your submissions at
            {' '}
            <strong>
              My challenges
            </strong>
            {' '}
            (header menu → click your avatar). The page is titled My challenge submissions.
          </p>
          <p
            className="mb-2 font-medium"
          >
            Privacy
          </p>
          <ul
            className="list-disc space-y-1 pl-5 text-foreground/90"
          >
            <li>
              Photos must be public to be submitted.
            </li>
            <li>
              Once accepted, a photo cannot be set to private.
            </li>
            <li>
              Submitted by mistake?
              {' '}
              <Link
                href={routes.contact.url}
                className="text-primary hover:underline underline-offset-4"
              >
                Contact us
              </Link>
              .
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'challenge-upload',
      title: 'Submitting from library vs uploading',
      content: (
        <>
          <p
            className="mb-4"
          >
            When submitting to a challenge, you can either select from your existing photos or upload new photos directly in the submission modal. Private photos are shown but cannot be selected. Both options are available — choose whichever fits your workflow.
          </p>
          <p
            className="text-foreground/80"
          >
            Note: Photos uploaded during submission are set to public and appear immediately on your profile&apos;s photo stream.
          </p>
        </>
      ),
    },
    {
      id: 'challenge-badges',
      title: 'Challenge badges on photos',
      content: (
        <p>
          When a photo is accepted into a challenge, it displays a challenge badge on the photo detail page and in
          {' '}
          <strong>
            Manage photos
          </strong>
          {' '}
          (header menu). This shows which challenges your work has been featured in.
        </p>
      ),
    },
  ],
};
