'use client';

import {
  countLibraryPhotosBefore,
  fetchManagePhotoById,
  seedPhotosThroughIndex,
  setPhotosInfiniteQueryData,
} from '@/hooks/managePhotosFetch';
import type { PhotoFilter } from '@/hooks/photoQueryCache';
import type { PhotoWithAlbums } from '@/types/photos';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

type UseManagePhotoDeepLinkOptions = {
  userId: string | undefined;
  photoIdFromUrl: string | null;
  pageSize: number;
  photos: PhotoWithAlbums[];
  onForceFilterAll: () => void;
  onEnsureSelection: (photoId: string) => void;
  onOpenMobileEdit: () => void;
  onPhotoNotFound: () => void;
  scrollContainerElRef: RefObject<HTMLElement | null>;
};

export function useManagePhotoDeepLink({
  userId,
  photoIdFromUrl,
  pageSize,
  photos,
  onForceFilterAll,
  onEnsureSelection,
  onOpenMobileEdit,
  onPhotoNotFound,
  scrollContainerElRef,
}: UseManagePhotoDeepLinkOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingPhoto, setPendingPhoto] = useState<PhotoWithAlbums | null>(null);
  const [scrollToPhotoId, setScrollToPhotoId] = useState<string | null>(null);
  const pageSizeRef = useRef(pageSize);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    if (!userId || !photoIdFromUrl) return;

    const photoId = photoIdFromUrl;
    onEnsureSelection(photoId);
    onForceFilterAll();

    let cancelled = false;

    const run = async () => {
      try {
        const photo = await fetchManagePhotoById(userId, photoId);
        if (cancelled) return;

        if (!photo) {
          router.replace('/account/photos');
          onPhotoNotFound();
          return;
        }

        setPendingPhoto(photo);

        const filter: PhotoFilter = 'all';
        const indexBefore = await countLibraryPhotosBefore(
          userId,
          filter,
          photo.sort_order,
          photo.created_at,
        );
        if (cancelled) return;

        const activePageSize = pageSizeRef.current;
        const { data, found } = await seedPhotosThroughIndex(
          userId,
          filter,
          activePageSize,
          photoId,
          indexBefore,
        );
        if (cancelled) return;

        setPhotosInfiniteQueryData(queryClient, userId, filter, activePageSize, data);

        if (!found) {
          setPendingPhoto(null);
          router.replace('/account/photos');
          onPhotoNotFound();
          return;
        }

        setScrollToPhotoId(photoId);
        router.replace('/account/photos');
      } catch {
        if (!cancelled) {
          setPendingPhoto(null);
          router.replace('/account/photos');
          onPhotoNotFound();
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [userId, photoIdFromUrl, pageSize, queryClient, router, onForceFilterAll, onEnsureSelection, onPhotoNotFound]);

  const pendingPhotoForSelection = useMemo(() => {
    if (!pendingPhoto) return null;
    if (photos.some((p) => p.id === pendingPhoto.id)) return null;
    return pendingPhoto;
  }, [photos, pendingPhoto]);

  useEffect(() => {
    if (!scrollToPhotoId) return;
    if (!photos.some((p) => p.id === scrollToPhotoId)) return;

    const targetId = scrollToPhotoId;
    const frame = requestAnimationFrame(() => {
      const scrollRoot = scrollContainerElRef.current;
      const el = document.querySelector(`[data-item-id="${CSS.escape(targetId)}"]`);
      if (el && scrollRoot) {
        const rootRect = scrollRoot.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - rootRect.top + scrollRoot.scrollTop - rootRect.height / 2 + elRect.height / 2;
        scrollRoot.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      } else if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }

      if (window.matchMedia('(max-width: 767px)').matches) {
        onOpenMobileEdit();
      }

      setScrollToPhotoId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [photos, scrollToPhotoId, scrollContainerElRef, onOpenMobileEdit]);

  return { pendingPhoto: pendingPhotoForSelection };
}
