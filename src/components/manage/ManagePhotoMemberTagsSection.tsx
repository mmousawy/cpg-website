'use client';

import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import { PhotoMemberTagList } from '@/components/photo/PhotoMemberTags';
import { useOpenPhotoMemberTagsModal } from '@/hooks/useOpenPhotoMemberTagsModal';
import type { PhotoWithAlbums } from '@/types/photos';

type ManagePhotoMemberTagsSectionProps = {
  photo: PhotoWithAlbums;
};

export default function ManagePhotoMemberTagsSection({ photo }: ManagePhotoMemberTagsSectionProps) {
  const openPhotoMemberTagsModal = useOpenPhotoMemberTagsModal();

  return (
    <div
      className="mb-6"
    >
      <span
        className="mb-2 flex items-center text-sm font-medium"
      >
        People on this photo
        <HelpLink
          href="/help#photo-member-tags"
          label="How tagging people on a photo works"
          size="sm"
        />
      </span>
      <Button
        type="button"
        variant="secondary"
        onClick={() => openPhotoMemberTagsModal(photo)}
      >
        Tag people
      </Button>
      <PhotoMemberTagList
        photoId={photo.id}
        className="mb-0 mt-3"
      />
    </div>
  );
}
