'use client';

import { useState } from 'react';

import ChallengeCard from '@/components/challenges/ChallengeCard';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import { useAllChallenges } from '@/hooks/useChallenges';

import PlusSVG from 'public/icons/plus.svg';
import SadSVG from 'public/icons/sad.svg';

export default function AdminChallengesPage() {
  const { data: challenges, isLoading } = useAllChallenges();
  const [serverNow] = useState(() => Date.now());

  // Sort: active first, then by created date
  const activeChallenges = (challenges || []).filter((c) => c.is_active);
  const inactiveChallenges = (challenges || []).filter((c) => !c.is_active);

  return (
    <PageContainer>
      <div
        className="mb-8 flex items-start justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Manage challenges
          </h1>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            Create, edit, and review photo challenges
          </p>
        </div>
        <Button
          href="/admin/challenges/new"
          icon={<PlusSVG
            className="h-5 w-5"
          />}
          variant="primary"
        >
          Create challenge
        </Button>
      </div>

      {isLoading ? (
        <div
          className="text-center animate-pulse py-12"
        >
          <p
            className="text-foreground/50"
          >
            Loading challenges...
          </p>
        </div>
      ) : (challenges || []).length === 0 ? (
        <div
          className="text-center py-12"
        >
          <SadSVG
            className="mb-4 inline-block h-12 w-12 fill-foreground/50"
          />
          <p
            className="mb-4 text-foreground/80"
          >
            No challenges yet
          </p>
        </div>
      ) : (
        <div
          className="space-y-10"
        >
          {/* Active Challenges */}
          {activeChallenges.length > 0 && (
            <section>
              <h2
                className="mb-4 text-lg font-semibold opacity-70"
              >
                Active challenges
              </h2>
              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {activeChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    serverNow={serverNow}
                    showAdminActions
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive Challenges */}
          {inactiveChallenges.length > 0 && (
            <section>
              <h2
                className="mb-4 text-lg font-semibold opacity-70"
              >
                Inactive challenges
              </h2>
              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60"
              >
                {inactiveChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    serverNow={serverNow}
                    showAdminActions
                    isPast
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}
