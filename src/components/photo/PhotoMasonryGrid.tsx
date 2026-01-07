'use client';

import JustifiedPhotoGrid from './JustifiedPhotoGrid';
import type { Photo } from '@/types/photos';

interface PhotoMasonryGridProps {
  photos: Photo[];
  profileNickname: string;
}

export default function PhotoMasonryGrid({
  photos,
  profileNickname,
}: PhotoMasonryGridProps) {

  return <JustifiedPhotoGrid photos={photos} profileNickname={profileNickname} />;
}
