'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import type { Profile } from '@/context/AuthContext';
import {
  isPhotosManageTourDismissed,
  isPhotosUploadTourDismissed,
} from '@/lib/profileTours';
import { startPhotosFirstRunTour, startPhotosManageTour } from '@/tours/photosFirstRunTour';
import {
  PHOTOS_MANAGE_TOUR_TARGETS,
  PHOTOS_TOUR_TARGETS,
} from '@/tours/photosFirstRunTour.constants';
import type { Driver } from 'driver.js';
import { useContext, useEffect, useRef } from 'react';

type UsePhotosFirstRunTourOptions = {
  userId?: string;
  profile?: Profile | null;
  refreshProfile?: () => Promise<void>;
  photosPending: boolean;
  /** Empty library chrome is on screen (real empty state or upload mock). */
  uploadTourActive: boolean;
  isUploadTourMock: boolean;
  /** Photo grid with at least one photo is on screen (or manage mock with photos). */
  manageTourActive: boolean;
  isManageTourMock: boolean;
  /** Select the first photo so edit / action-bar targets exist. */
  prepareManageTour: () => void;
};

function waitForSelector(selector: string, maxFrames = 10): Promise<boolean> {
  return new Promise((resolve) => {
    let frames = 0;
    const tick = () => {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      frames += 1;
      if (frames >= maxFrames) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function usePhotosFirstRunTour({
  userId,
  profile,
  refreshProfile,
  photosPending,
  uploadTourActive,
  isUploadTourMock,
  manageTourActive,
  isManageTourMock,
  prepareManageTour,
}: UsePhotosFirstRunTourOptions) {
  const { isOpen: isModalOpen } = useContext(ModalContext);
  const driverRef = useRef<Driver | null>(null);
  const uploadStartedRef = useRef(false);
  const manageStartedRef = useRef(false);

  const destroyDriver = () => {
    driverRef.current?.destroy();
    driverRef.current = null;
  };

  useEffect(() => {
    return () => {
      destroyDriver();
      uploadStartedRef.current = false;
      manageStartedRef.current = false;
    };
  }, []);

  // Tear down upload tour when empty chrome goes away (e.g. first upload).
  useEffect(() => {
    if (!uploadTourActive && uploadStartedRef.current) {
      destroyDriver();
      uploadStartedRef.current = false;
    }
  }, [uploadTourActive]);

  useEffect(() => {
    if (!userId || isModalOpen) return;

    const shouldRunUpload = uploadTourActive;
    const shouldRunManage = manageTourActive;

    if (!shouldRunUpload && !shouldRunManage) return;
    if (shouldRunUpload && shouldRunManage) return;

    if (shouldRunUpload) {
      if (!isUploadTourMock && !profile) return;
      if (!isUploadTourMock && photosPending) return;
      if (!isUploadTourMock && isPhotosUploadTourDismissed(profile)) return;
      if (uploadStartedRef.current) return;

      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          if (uploadStartedRef.current || !uploadTourActive) return;
          const ready = await waitForSelector(PHOTOS_TOUR_TARGETS.library);
          if (!ready) return;

          uploadStartedRef.current = true;
          destroyDriver();
          driverRef.current = startPhotosFirstRunTour({
            persistDismissOnEnd: !isUploadTourMock,
            userId,
            profile,
            refreshProfile,
          });
        });
      });

      return () => cancelAnimationFrame(frame);
    }

    if (shouldRunManage) {
      if (!isManageTourMock && !profile) return;
      if (!isManageTourMock && photosPending) return;
      if (!isManageTourMock && isPhotosManageTourDismissed(profile)) return;
      if (manageStartedRef.current) return;

      prepareManageTour();

      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          if (manageStartedRef.current || !manageTourActive) return;
          const ready = await waitForSelector(PHOTOS_MANAGE_TOUR_TARGETS.selectPhoto);
          if (!ready) return;

          const isDesktop = window.matchMedia('(min-width: 768px)').matches;
          const secondaryTarget = isDesktop
            ? PHOTOS_MANAGE_TOUR_TARGETS.editForm
            : PHOTOS_MANAGE_TOUR_TARGETS.mobileEdit;
          const tertiaryTarget = isDesktop
            ? PHOTOS_MANAGE_TOUR_TARGETS.sidebarAlbum
            : PHOTOS_MANAGE_TOUR_TARGETS.mobileAlbum;
          const secondaryReady = await waitForSelector(secondaryTarget);
          const tertiaryReady = await waitForSelector(tertiaryTarget);
          if (!secondaryReady || !tertiaryReady) return;

          manageStartedRef.current = true;
          destroyDriver();
          driverRef.current = startPhotosManageTour({
            persistDismissOnEnd: !isManageTourMock,
            userId,
            profile,
            refreshProfile,
          });
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [
    userId,
    profile,
    refreshProfile,
    photosPending,
    isModalOpen,
    uploadTourActive,
    isUploadTourMock,
    manageTourActive,
    isManageTourMock,
    prepareManageTour,
  ]);
}
