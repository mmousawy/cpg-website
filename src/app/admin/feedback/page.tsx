'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import Avatar from '@/components/auth/Avatar';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import {
  useFeedbackCounts,
  useFeedbackForReview,
  useUpdateFeedback,
} from '@/hooks/useFeedback';
import type { FeedbackForReview, FeedbackStatus } from '@/types/feedback';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';

import CheckSVG from 'public/icons/check.svg';
import ContentSVG from 'public/icons/content.svg';
import FolderSVG from 'public/icons/folder.svg';

type TabStatus = FeedbackStatus;

function getSubjectLabel(subject: string) {
  return FEEDBACK_SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
}

export default function AdminFeedbackPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>('new');

  const { data: feedbackList, isLoading } = useFeedbackForReview(activeTab);
  const { data: counts } = useFeedbackCounts();
  const updateMutation = useUpdateFeedback();

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
  };

  const handleMarkAsRead = async (feedback: FeedbackForReview) => {
    if (feedback.status === 'new') {
      await updateMutation.mutateAsync({ feedbackId: feedback.id, status: 'read' });
    }
  };

  const handleArchive = async (feedback: FeedbackForReview) => {
    await updateMutation.mutateAsync({ feedbackId: feedback.id, status: 'archived' });
  };

  const tabs: { key: TabStatus; label: string; count: number }[] = [
    { key: 'new', label: 'New', count: counts?.new ?? 0 },
    { key: 'read', label: 'Read', count: counts?.read ?? 0 },
    { key: 'archived', label: 'Archived', count: counts?.archived ?? 0 },
  ];

  return (
    <PageContainer
      className="flex-1"
    >
      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold"
        >
          Feedback
        </h1>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          Review user-submitted feedback
        </p>
      </div>

      <div
        className="flex gap-2 mt-6 flex-wrap"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            variant={activeTab === tab.key ? 'primary' : 'secondary'}
            size="sm"
            className="pr-2.5"
          >
            {tab.label}
            {' '}
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-white/20' : 'bg-foreground/10',
              )}
            >
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div
          className="text-center py-12"
        >
          <p
            className="text-foreground/50 animate-pulse"
          >
            Loading feedback...
          </p>
        </div>
      ) : (feedbackList || []).length === 0 ? (
        <div
          className="text-center py-12"
        >
          <ContentSVG
            className="mb-4 inline-block h-12 w-12 fill-foreground/50"
          />
          <p
            className="mb-4 text-foreground/80"
          >
            {activeTab === 'new'
              ? 'No new feedback'
              : activeTab === 'read'
                ? 'No read feedback'
                : 'No archived feedback'}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"
        >
          {(feedbackList || []).map((feedback) => {
            const isAuthenticated = !!feedback.user_id;
            const isUpdating = updateMutation.isPending;

            return (
              <div
                key={feedback.id}
                className="relative rounded-lg border border-border-color bg-background-light p-4"
              >
                <div>
                  <div
                    className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                  >
                    <div
                      className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                    >
                      Date
                    </div>
                    <p
                      className="text-xs text-foreground/50"
                    >
                      {new Date(feedback.created_at).toLocaleString()}
                    </p>
                  </div>

                  <hr
                    className="border-border-color mt-3 mb-3"
                  />

                  <div
                    className="grid grid-cols-[70px_1fr] gap-4 items-start"
                  >
                    <div
                      className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                    >
                      From
                    </div>
                    <div
                      className="flex items-center gap-3"
                    >
                      {isAuthenticated && feedback.submitter ? (
                        <>
                          <Link
                            href={`/@${feedback.submitter.nickname}`}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <Avatar
                              avatarUrl={feedback.submitter.avatar_url}
                              fullName={feedback.submitter.full_name}
                              size="sm"
                            />
                          </Link>
                          <div
                            className="flex-1 min-w-0"
                          >
                            <Link
                              href={`/@${feedback.submitter.nickname}`}
                              className="text-sm font-medium hover:text-primary truncate block"
                            >
                              {feedback.submitter.full_name || feedback.submitter.nickname}
                            </Link>
                            <p
                              className="text-xs text-foreground/60 truncate"
                            >
                              @
                              {feedback.submitter.nickname}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
                          >
                            <span
                              className="text-primary font-semibold"
                            >
                              {feedback.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div
                            className="flex-1 min-w-0"
                          >
                            <p
                              className="text-sm font-medium truncate"
                            >
                              {feedback.name}
                            </p>
                            {feedback.email && (
                              <p
                                className="text-xs text-foreground/60 truncate"
                              >
                                {feedback.email}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <hr
                    className="border-border-color mt-3 mb-3"
                  />

                  <div
                    className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                  >
                    <div
                      className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                    >
                      Subject
                    </div>
                    <p
                      className="text-sm font-medium text-foreground/80"
                    >
                      {getSubjectLabel(feedback.subject)}
                    </p>
                  </div>

                  <hr
                    className="border-border-color mt-3 mb-3"
                  />

                  <div
                    className="grid grid-cols-[70px_1fr] gap-4 items-start"
                  >
                    <div
                      className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                    >
                      Message
                    </div>
                    <p
                      className="text-sm text-foreground/80 whitespace-pre-wrap wrap-break-word"
                    >
                      {feedback.message}
                    </p>
                  </div>

                  {feedback.screenshots && feedback.screenshots.length > 0 && (
                    <>
                      <hr
                        className="border-border-color mt-3 mb-3"
                      />
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-start"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                        >
                          Screenshots
                        </div>
                        <div
                          className="flex flex-wrap gap-2"
                        >
                          {feedback.screenshots.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg border border-border-color overflow-hidden hover:opacity-90"
                            >
                              <Image
                                src={url}
                                alt="Screenshot"
                                width={80}
                                height={80}
                                className="object-cover w-20 h-20"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {feedback.admin_notes && (
                    <>
                      <hr
                        className="border-border-color mt-3 mb-3"
                      />
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                        >
                          Admin notes
                        </div>
                        <p
                          className="text-sm text-foreground/70"
                        >
                          {feedback.admin_notes}
                        </p>
                      </div>
                    </>
                  )}

                  {(activeTab === 'new' || activeTab === 'read') && (
                    <>
                      <hr
                        className="border-border-color mt-3 mb-3"
                      />
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-center"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                        >
                          Actions
                        </div>
                        <div
                          className="flex gap-2"
                        >
                          {activeTab === 'new' && (
                            <Button
                              onClick={() => handleMarkAsRead(feedback)}
                              disabled={isUpdating}
                              size="sm"
                              className="flex-1"
                            >
                              <CheckSVG
                                className="size-4 fill-current"
                              />
                              Mark as read
                            </Button>
                          )}
                          <Button
                            onClick={() => handleArchive(feedback)}
                            disabled={isUpdating}
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                          >
                            <FolderSVG
                              className="size-4 fill-current"
                            />
                            Archive
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
