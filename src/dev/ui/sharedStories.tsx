'use client';

import { useState } from 'react';

import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import Checkbox from '@/components/shared/Checkbox';
import Toggle from '@/components/shared/Toggle';
import Select from '@/components/shared/Select';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import TagInput from '@/components/shared/TagInput';
import InterestInput from '@/components/shared/InterestInput';
import GridCheckbox from '@/components/shared/GridCheckbox';
import EmptyState from '@/components/shared/EmptyState';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageLoading from '@/components/shared/PageLoading';
import Tag from '@/components/shared/Tag';
import TagShape from '@/components/shared/TagShape';
import TagCloud from '@/components/shared/TagCloud';
import TagCloudSkeleton from '@/components/shared/TagCloudSkeleton';
import CardBadges from '@/components/shared/CardBadges';
import CardLikes from '@/components/shared/CardLikes';
import ViewCount from '@/components/shared/ViewCount';
import ContentHeader from '@/components/shared/ContentHeader';
import ArrowLink from '@/components/shared/ArrowLink';
import HelpLink from '@/components/shared/HelpLink';
import HelpAccordion from '@/components/shared/HelpAccordion';
import Tooltip from '@/components/shared/Tooltip';
import Popover from '@/components/shared/Popover';
import BottomSheet from '@/components/shared/BottomSheet';
import AnimatedPopoverPanel from '@/components/shared/AnimatedPopoverPanel';
import DetailSidebar, {
  DetailSidebarAuthor,
  DetailSidebarFooter,
  DetailSidebarMeta,
  DetailSidebarSectionHeading,
  DetailSidebarTitle,
} from '@/components/shared/DetailSidebar';
import SectionSidebar from '@/components/shared/SectionSidebar';
import SectionMobileNav from '@/components/shared/SectionMobileNav';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SignUpCTA from '@/components/shared/SignUpCTA';
import DropZone from '@/components/shared/DropZone';
import JavaScriptRequired from '@/components/shared/JavaScriptRequired';
import { RichDescriptionView } from '@/components/shared/RichDescriptionView';
import AuthorRow from '@/components/shared/AuthorRow';
import ClickableAvatar from '@/components/shared/ClickableAvatar';
import MemberCard from '@/components/shared/MemberCard';
import StackedAvatarsPopover from '@/components/shared/StackedAvatarsPopover';
import ProfileStatsBadges from '@/components/shared/ProfileStatsBadges';
import InterestCloud from '@/components/shared/InterestCloud';
import { SectionScrollProvider } from '@/context/SectionScrollContext';

import {
  fixtureInterests,
  fixtureMember,
  fixtureMembers,
  fixtureProfileStats,
  fixtureTags,
} from './fixtures';
import type { UiStoryFrame } from './types';

function SelectDemo() {
  const [value, setValue] = useState('film');
  return (
    <Select
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'film', label: 'Film' },
        { value: 'digital', label: 'Digital' },
        { value: 'both', label: 'Both' },
      ]}
      placeholder="Choose format"
      className="max-w-xs"
    />
  );
}

function AutocompleteDemo() {
  const [value, setValue] = useState('');
  return (
    <AutocompleteInput
      value={value}
      onChange={setValue}
      suggestions={['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague']}
      placeholder="City"
      className="max-w-sm"
    />
  );
}

function TagInputDemo() {
  const [tags, setTags] = useState(['street', 'night']);
  return (
    <TagInput
      id="storyboard-tags"
      tags={tags}
      onAddTag={(t) => setTags((prev) => [...prev, t])}
      onRemoveTag={(t) => setTags((prev) => prev.filter((x) => x !== t))}
      placeholder="Add tag"
    />
  );
}

function InterestInputDemo() {
  const [interests, setInterests] = useState(['Portrait']);
  return (
    <InterestInput
      id="storyboard-interests"
      interests={interests}
      onAddInterest={(i) => setInterests((prev) => [...prev, i])}
      onRemoveInterest={(i) => setInterests((prev) => prev.filter((x) => x !== i))}
    />
  );
}

function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
      >
        Open sheet
      </Button>
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Example sheet"
      >
        <p
          className="text-sm text-foreground/80"
        >
          Bottom sheet body content for the storyboard.
        </p>
      </BottomSheet>
    </>
  );
}

function AnimatedPopoverDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="relative min-h-24"
    >
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen((o) => !o)}
      >
        Toggle panel
      </Button>
      <div
        className="absolute left-0 top-12"
      >
        <AnimatedPopoverPanel
          open={open}
          className="w-48 rounded-md border border-border-color bg-background-light p-2 shadow-md"
        >
          <p
            className="text-sm"
          >
            Animated popover panel
          </p>
        </AnimatedPopoverPanel>
      </div>
    </div>
  );
}

const sectionNav = [
  { id: 'profile', title: 'Profile' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'security', title: 'Security' },
];

export const sharedStoryFrames: Record<string, UiStoryFrame[]> = {
  Button: [
    {
      title: 'Variants',
      render: () => (
        <div
          className="flex flex-wrap gap-2"
        >
          <Button
            variant="primary"
          >
            Primary
          </Button>
          <Button
            variant="secondary"
          >
            Secondary
          </Button>
          <Button
            variant="danger"
          >
            Danger
          </Button>
          <Button
            variant="ghost"
          >
            Ghost
          </Button>
          <Button
            variant="tertiary"
          >
            Tertiary
          </Button>
        </div>
      ),
    },
    {
      title: 'States',
      render: () => (
        <div
          className="flex flex-wrap gap-2"
        >
          <Button
            loading
          >
            Loading
          </Button>
          <Button
            disabled
          >
            Disabled
          </Button>
          <Button
            href="/signup"
            variant="secondary"
          >
            As link
          </Button>
        </div>
      ),
    },
  ],
  Input: [
    {
      title: 'Default & error',
      render: () => (
        <div
          className="flex max-w-sm flex-col gap-3"
        >
          <Input
            placeholder="Email"
            type="email"
          />
          <Input
            placeholder="With error"
            error
            defaultValue="bad@"
          />
          <Input
            leftAddon="@"
            placeholder="nickname"
            mono
          />
        </div>
      ),
    },
  ],
  Textarea: [
    {
      title: 'Default',
      render: () => (
        <Textarea
          placeholder="Write a caption…"
          className="max-w-md"
          rows={3}
        />
      ),
    },
  ],
  Checkbox: [
    {
      title: 'Default',
      render: () => (
        <Checkbox
          id="storyboard-checkbox"
          label="Send me event reminders"
          defaultChecked
        />
      ),
    },
  ],
  Toggle: [
    {
      title: 'Default',
      render: () => (
        <Toggle
          id="storyboard-toggle"
          label="Visibility"
          leftLabel="Private"
          rightLabel="Public"
          defaultChecked
        />
      ),
    },
  ],
  Select: [{ title: 'Default', render: () => <SelectDemo /> }],
  AutocompleteInput: [{ title: 'Default', render: () => <AutocompleteDemo /> }],
  TagInput: [{ title: 'Default', render: () => <TagInputDemo /> }],
  InterestInput: [{ title: 'Default', render: () => <InterestInputDemo /> }],
  GridCheckbox: [
    {
      title: 'Default',
      render: () => (
        <div
          className="relative h-16 w-16 rounded bg-background-raised"
        >
          <GridCheckbox
            isSelected
            onClick={() => { }}
            alwaysVisible
          />
        </div>
      ),
    },
  ],
  EmptyState: [
    {
      title: 'Default',
      render: () => (
        <EmptyState
          title="No photos yet"
          description="Upload your first image to get started."
          action={
            <Button>
              Upload
            </Button>
          }
        />
      ),
    },
  ],
  ErrorMessage: [
    {
      title: 'Default',
      render: () => (
        <ErrorMessage>
          Something went wrong. Please try again.
        </ErrorMessage>
      ),
    },
  ],
  SuccessMessage: [
    {
      title: 'Default',
      render: () => (
        <SuccessMessage>
          Changes saved successfully.
        </SuccessMessage>
      ),
    },
  ],
  LoadingSpinner: [
    {
      title: 'Sizes',
      render: () => (
        <div
          className="flex items-center gap-6"
        >
          <LoadingSpinner
            size="sm"
          />
          <LoadingSpinner
            size="md"
          />
          <LoadingSpinner
            size="lg"
          />
        </div>
      ),
    },
  ],
  PageLoading: [
    {
      title: 'Default',
      render: () => (
        <PageLoading
          message="Loading gallery…"
        />
      ),
    },
  ],
  Tag: [
    {
      title: 'States',
      render: () => (
        <div
          className="flex flex-wrap gap-2"
        >
          <Tag
            text="street"
            count={12}
          />
          <Tag
            text="active"
            isActive
          />
          <Tag
            text="removable"
            onRemove={() => { }}
          />
        </div>
      ),
    },
  ],
  TagShape: [
    {
      title: 'Default',
      render: () => (
        <TagShape
          width={120}
          height={30}
          holeX={12}
          holeRadius={3}
          tipStart={10}
          tipPoint={2}
          bgColor="var(--primary)"
        />
      ),
    },
  ],
  TagCloud: [
    {
      title: 'Default',
      render: () => (
        <TagCloud
          tags={fixtureTags}
        />
      ),
    },
  ],
  TagCloudSkeleton: [
    {
      title: 'Default',
      render: () => (
        <TagCloudSkeleton />
      ),
    },
  ],
  CardBadges: [
    {
      title: 'Variants',
      render: () => (
        <div
          className="relative h-28 w-48 rounded-md bg-background-raised"
        >
          <CardBadges
            badges={[
              { variant: 'private', label: 'Private' },
              { variant: 'accepted', label: 'Accepted' },
            ]}
          />
        </div>
      ),
    },
  ],
  CardLikes: [
    {
      title: 'Default',
      render: () => (
        <CardLikes
          likesCount={42}
        />
      ),
    },
  ],
  ViewCount: [
    {
      title: 'Default',
      render: () => (
        <ViewCount
          count={1280}
        />
      ),
    },
  ],
  ContentHeader: [
    {
      title: 'Default',
      render: () => (
        <ContentHeader
          title="Morning light"
          description="Shot during the March photo walk."
          profile={fixtureMember}
          date="Mar 12, 2025"
          metadata={['f/2.8 · 1/250s · ISO 200']}
        />
      ),
    },
  ],
  ArrowLink: [
    {
      title: 'Default',
      render: () => (
        <ArrowLink
          href="/gallery"
        >
          View gallery
        </ArrowLink>
      ),
    },
  ],
  HelpLink: [
    {
      title: 'Default',
      render: () => (
        <HelpLink
          href="/help"
          label="How tagging works"
        />
      ),
    },
  ],
  HelpAccordion: [
    {
      title: 'Default',
      render: () => (
        <HelpAccordion
          id="demo"
          title="What is a shared album?"
        >
          <p
            className="text-sm opacity-80"
          >
            Members can contribute photos to one album.
          </p>
        </HelpAccordion>
      ),
    },
  ],
  Tooltip: [
    {
      title: 'Default',
      render: () => (
        <Tooltip
          content="Tooltip text"
        >
          <button
            type="button"
            className="rounded border border-border-color px-3 py-1 text-sm"
          >
            Hover me
          </button>
        </Tooltip>
      ),
    },
  ],
  Popover: [
    {
      title: 'Default',
      render: () => (
        <Popover
          trigger={
            <Button
              type="button"
              variant="secondary"
            >
              Open
            </Button>
          }
        >
          <p
            className="p-2 text-sm"
          >
            Popover content
          </p>
        </Popover>
      ),
    },
  ],
  BottomSheet: [{ title: 'Default', render: () => <BottomSheetDemo /> }],
  AnimatedPopoverPanel: [{ title: 'Default', render: () => <AnimatedPopoverDemo /> }],
  DetailSidebar: [
    {
      title: 'Compound layout',
      render: () => (
        <DetailSidebar
          className="max-w-sm"
        >
          <DetailSidebarAuthor>
            <AuthorRow
              profile={fixtureMember}
            />
          </DetailSidebarAuthor>
          <DetailSidebarTitle
            title="Untitled photo"
            description="A calm street at blue hour."
          />
          <DetailSidebarMeta>
            <DetailSidebarSectionHeading>
              Details
            </DetailSidebarSectionHeading>
            <p
              className="text-sm opacity-70"
            >
              Amsterdam · Mar 2025
            </p>
          </DetailSidebarMeta>
          <DetailSidebarFooter>
            <p
              className="text-sm"
            >
              Footer slot (likes, comments)
            </p>
          </DetailSidebarFooter>
        </DetailSidebar>
      ),
    },
  ],
  SectionSidebar: [
    {
      title: 'Default',
      render: () => (
        <SectionScrollProvider
          sectionIds={sectionNav.map((s) => s.id)}
        >
          <SectionSidebar
            sections={sectionNav}
          />
        </SectionScrollProvider>
      ),
    },
  ],
  SectionMobileNav: [
    {
      title: 'Default',
      render: () => (
        <SectionScrollProvider
          sectionIds={sectionNav.map((s) => s.id)}
        >
          <SectionMobileNav
            sections={sectionNav}
            sticky={false}
          />
        </SectionScrollProvider>
      ),
    },
  ],
  StickyActionBar: [
    {
      title: 'Bottom pill',
      render: () => (
        <StickyActionBar
          sticky={false}
          constrainWidth
        >
          <Button
            fullWidth
          >
            Save changes
          </Button>
        </StickyActionBar>
      ),
    },
  ],
  SignUpCTA: [
    {
      title: 'Inline',
      render: () => (
        <SignUpCTA
          variant="inline"
        />
      ),
    },
  ],
  DropZone: [
    {
      title: 'Default',
      render: () => (
        <DropZone
          onDrop={() => { }}
          className="rounded-md border border-dashed border-border-color p-8"
        >
          <p
            className="text-center text-sm opacity-70"
          >
            Drag files here
          </p>
        </DropZone>
      ),
    },
  ],
  JavaScriptRequired: [
    {
      title: 'Default',
      render: () => (
        <JavaScriptRequired />
      ),
    },
  ],
  RichDescriptionView: [
    {
      title: 'Plain & HTML',
      render: () => (
        <div
          className="space-y-4"
        >
          <RichDescriptionView
            html="Plain description line."
          />
          <RichDescriptionView
            html="<p>Rich <strong>HTML</strong> description.</p>"
          />
        </div>
      ),
    },
  ],
  AuthorRow: [
    {
      title: 'Default',
      render: () => (
        <AuthorRow
          profile={fixtureMember}
        />
      ),
    },
  ],
  ClickableAvatar: [
    {
      title: 'Default',
      render: () => (
        <ClickableAvatar
          nickname={fixtureMember.nickname}
          fullName={fixtureMember.full_name}
          avatarUrl={fixtureMember.avatar_url}
        />
      ),
    },
  ],
  MemberCard: [
    {
      title: 'Default',
      render: () => (
        <div
          className="max-w-40"
        >
          <MemberCard
            member={fixtureMember}
            badge="12 photos"
          />
        </div>
      ),
    },
  ],
  StackedAvatarsPopover: [
    {
      title: 'Default',
      render: () => (
        <StackedAvatarsPopover
          people={fixtureMembers}
          singularLabel="member"
          pluralLabel="members"
          showInlineCount
        />
      ),
    },
  ],
  ProfileStatsBadges: [
    {
      title: 'Default',
      render: () => (
        <ProfileStatsBadges
          stats={fixtureProfileStats}
        />
      ),
    },
  ],
  InterestCloud: [
    {
      title: 'Default',
      render: () => (
        <InterestCloud
          interests={fixtureInterests}
        />
      ),
    },
  ],
};
