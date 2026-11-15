export type StoryboardSubcategory = {
  id: string;
  label: string;
  componentNames: string[];
};

/** Curated groupings for the storyboard sidebar (slug = URL segment under /dev/ui/{group}/). */
export const storyboardSubcategories: Record<string, StoryboardSubcategory[]> = {
  shared: [
    {
      id: 'actions',
      label: 'Actions',
      componentNames: ['Button', 'ArrowLink', 'StickyActionBar', 'SignUpCTA'],
    },
    {
      id: 'forms',
      label: 'Form controls',
      componentNames: [
        'Input',
        'Textarea',
        'Checkbox',
        'Toggle',
        'Select',
        'AutocompleteInput',
        'GridCheckbox',
        'InterestInput',
      ],
    },
    {
      id: 'tags',
      label: 'Tags',
      componentNames: ['Tag', 'TagShape', 'TagCloud', 'TagCloudSkeleton', 'TagInput'],
    },
    {
      id: 'feedback',
      label: 'Feedback',
      componentNames: ['EmptyState', 'ErrorMessage', 'SuccessMessage', 'LoadingSpinner', 'PageLoading'],
    },
    {
      id: 'overlays',
      label: 'Overlays',
      componentNames: ['Tooltip', 'Popover', 'BottomSheet', 'AnimatedPopoverPanel'],
    },
    {
      id: 'layout',
      label: 'Layout & nav',
      componentNames: ['DetailSidebar', 'SectionSidebar', 'SectionMobileNav', 'ContentHeader'],
    },
    {
      id: 'people',
      label: 'People',
      componentNames: [
        'AuthorRow',
        'MemberCard',
        'ClickableAvatar',
        'StackedAvatarsPopover',
        'ProfileStatsBadges',
        'InterestCloud',
      ],
    },
    {
      id: 'content',
      label: 'Content',
      componentNames: [
        'RichDescriptionView',
        'HelpAccordion',
        'HelpLink',
        'DropZone',
        'JavaScriptRequired',
      ],
    },
    {
      id: 'cards',
      label: 'Cards & metadata',
      componentNames: ['CardBadges', 'CardLikes', 'ViewCount'],
    },
  ],
  icons: [
    {
      id: 'profile-stats',
      label: 'Profile stats',
      componentNames: [
        'AlbumsIcon',
        'ChallengePhotosAcceptedIcon',
        'ChallengesParticipatedIcon',
        'CommentsMadeIcon',
        'CommentsReceivedIcon',
        'EventsAttendedIcon',
        'LikesGivenIcon',
        'LikesReceivedIcon',
        'MemberSinceIcon',
        'PhotosIcon',
        'ViewsReceivedIcon',
      ],
    },
    {
      id: 'charts',
      label: 'Charts',
      componentNames: ['StatsChartIcons'],
    },
  ],
};

export function getStoryboardSubcategories(groupId: string): StoryboardSubcategory[] {
  return storyboardSubcategories[groupId] ?? [];
}

export function getStoryboardSubcategory(
  groupId: string,
  subcategoryId: string,
): StoryboardSubcategory | undefined {
  return getStoryboardSubcategories(groupId).find((s) => s.id === subcategoryId);
}

export function findSubcategoryForComponent(
  groupId: string,
  componentName: string,
): StoryboardSubcategory | undefined {
  for (const sub of getStoryboardSubcategories(groupId)) {
    if (sub.componentNames.includes(componentName)) {
      return sub;
    }
  }
  return undefined;
}

export function getDefaultStoryboardPath(): string {
  return '/dev/ui/shared/actions';
}

export function getFirstStoryboardPathForGroup(groupId: string): string | null {
  const subs = getStoryboardSubcategories(groupId);
  if (subs.length > 0) {
    return `/dev/ui/${groupId}/${subs[0].id}`;
  }
  return null;
}
