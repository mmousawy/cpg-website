import { driver, type DriveStep, type Driver } from 'driver.js';

import type { Profile } from '@/context/AuthContext';
import {
  persistPhotosManageTourOutcome,
  persistPhotosUploadTourOutcome,
} from '@/lib/profileTours';
import {
  PHOTOS_MANAGE_TOUR_TARGETS,
  PHOTOS_TOUR_TARGETS,
} from '@/tours/photosFirstRunTour.constants';

import '@/tours/photosFirstRunTour.css';

/** driver.js replaces the default Finish handler when onDoneClick is set — must destroy explicitly. */
function onTourDoneClick(markFinished: () => void) {
  return (_element: Element | undefined, _step: DriveStep, opts: { driver: Driver }) => {
    markFinished();
    opts.driver.destroy();
  };
}

function shouldIncludeSidebarStep(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

export function createPhotosFirstRunTourSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: PHOTOS_TOUR_TARGETS.library,
      popover: {
        title: 'Your photo library',
        description:
          'This is where your uploads live. Drag and drop images here.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: PHOTOS_TOUR_TARGETS.upload,
      popover: {
        title: 'Upload photos',
        description:
          'You can also pick files with the dedicated upload button. New uploads start as private until you change visibility.',
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  if (shouldIncludeSidebarStep()) {
    steps.push({
      element: PHOTOS_TOUR_TARGETS.editSidebar,
      popover: {
        title: 'Describe a photo',
        description:
          'After uploading, click a photo to set title, description, tags, license, and whether it is public or private. Private photos stay off the gallery and your public profile.',
        side: 'left',
        align: 'start',
      },
    });
  }

  steps.push(
    {
      element: PHOTOS_TOUR_TARGETS.albumsTab,
      popover: {
        title: 'Albums',
        description:
          'You can make albums to group photos. Open the Albums tab, create one with the New album button, then select photos from the library.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: PHOTOS_TOUR_TARGETS.help,
      popover: {
        title: 'More help',
        description:
          'Open the help link anytime for written guides on uploading and organizing photos.',
        side: 'bottom',
        align: 'end',
        doneBtnText: 'Finish',
      },
    },
  );

  return steps;
}

export function startPhotosFirstRunTour(options: {
  persistDismissOnEnd: boolean;
  userId: string;
  profile?: Profile | null;
  refreshProfile?: () => Promise<void>;
}): Driver {
  let finished = false;
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    popoverClass: 'cpg-photos-tour-popover',
    stageRadius: 8,
    stagePadding: 6,
    animate: true,
    allowClose: true,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Finish',
    steps: createPhotosFirstRunTourSteps(),
    onDoneClick: onTourDoneClick(() => {
      finished = true;
    }),
    onDestroyed: () => {
      if (options.persistDismissOnEnd) {
        void persistPhotosUploadTourOutcome(
          options.userId,
          finished ? 'finished' : 'dismissed',
          options.profile,
          options.refreshProfile,
        );
      }
    },
  });

  driverObj.drive();
  return driverObj;
}

function isDesktopLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

export function createPhotosManageTourSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: PHOTOS_MANAGE_TOUR_TARGETS.selectPhoto,
      popover: {
        title: 'Select photos',
        description:
          'Click a photo to edit it. Shift-click or drag a box to select several and edit them together. Drag a photo to change the order.',
        side: 'bottom',
        align: 'center',
      },
    },
  ];

  if (isDesktopLayout()) {
    steps.push({
      element: PHOTOS_MANAGE_TOUR_TARGETS.editForm,
      popover: {
        title: 'Edit details',
        description:
          'Set title, description, tags, license, and whether a photo is public or private. New uploads start private; public photos appear in the gallery and on your public profile. Delete is here too.',
        side: 'left',
        align: 'start',
      },
    });
    steps.push({
      element: PHOTOS_MANAGE_TOUR_TARGETS.sidebarAlbum,
      popover: {
        title: 'Add to album',
        description: 'Use the Add to album button to add the selected photo or photos to one of your albums.',
        side: 'left',
        align: 'start',
      },
    });
  } else {
    steps.push({
      element: PHOTOS_MANAGE_TOUR_TARGETS.mobileEdit,
      popover: {
        title: 'Edit details',
        description:
          'Tap Edit to change title, description, tags, license, and visibility. New uploads start private; public photos appear in the gallery and on your public profile.',
        side: 'top',
        align: 'end',
      },
    });
    steps.push({
      element: PHOTOS_MANAGE_TOUR_TARGETS.mobileAlbum,
      popover: {
        title: 'Add to album',
        description: 'Use the Add to album button to add the selected photo or photos to one of your albums.',
        side: 'top',
        align: 'start',
      },
    });
  }

  steps.push(
    {
      element: PHOTOS_MANAGE_TOUR_TARGETS.filter,
      popover: {
        title: 'Filter your library',
        description:
          'Switch between All, Public, and Private to find uploads quickly.',
        side: 'bottom',
        align: 'end',
        doneBtnText: 'Finish',
      },
    },
  );

  return steps;
}

export function startPhotosManageTour(options: {
  persistDismissOnEnd: boolean;
  userId: string;
  profile?: Profile | null;
  refreshProfile?: () => Promise<void>;
}): Driver {
  let finished = false;
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    popoverClass: 'cpg-photos-tour-popover',
    stageRadius: 8,
    stagePadding: 6,
    animate: true,
    allowClose: true,
    disableActiveInteraction: true,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Finish',
    steps: createPhotosManageTourSteps(),
    onDoneClick: onTourDoneClick(() => {
      finished = true;
    }),
    onDestroyed: () => {
      if (options.persistDismissOnEnd) {
        void persistPhotosManageTourOutcome(
          options.userId,
          finished ? 'finished' : 'dismissed',
          options.profile,
          options.refreshProfile,
        );
      }
    },
  });

  driverObj.drive();
  return driverObj;
}
