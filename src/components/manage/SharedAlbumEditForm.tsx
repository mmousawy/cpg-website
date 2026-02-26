'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import AlbumRequestsPanel from '@/components/albums/AlbumRequestsPanel';
import InviteMembersModal from '@/components/albums/InviteMembersModal';
import SharedAlbumMemberList from '@/components/albums/SharedAlbumMemberList';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import TagInput from '@/components/shared/TagInput';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import { useAuth } from '@/hooks/useAuth';
import {
  useInviteToSharedAlbum,
  useRemoveAlbumMember,
  useResolveAlbumRequest,
  useSharedAlbumMembers,
  useSharedAlbumRequests,
} from '@/hooks/useSharedAlbumMembers';
import type { AlbumWithPhotos } from '@/types/albums';
import { confirmDeleteAlbum, confirmDisableAlbumSharing } from '@/utils/confirmHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContext, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import AlbumListItem from './AlbumListItem';
import SidebarPanel from './SidebarPanel';
import type { AlbumFormData } from './SingleAlbumEditForm';

import CheckMiniSVG from 'public/icons/check-mini.svg';
import TrashSVG from 'public/icons/trash.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

const sharedAlbumFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug must be less than 50 characters'),
  description: z.string().optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
  joinPolicy: z.enum(['open', 'closed']),
  maxPhotosPerUser: z.union([
    z.number().int().positive(),
    z.string().transform((s): number | null => {
      if (s === '') return null;
      const n = parseInt(s, 10);
      return Number.isNaN(n) || n < 1 ? null : n;
    }),
  ]).optional().nullable(),
});

export type SharedAlbumFormInput = z.input<typeof sharedAlbumFormSchema>;

export type SharedAlbumFormData = z.output<typeof sharedAlbumFormSchema>;

interface SharedAlbumEditFormProps {
  album: AlbumWithPhotos | null;
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (albumId: string, data: AlbumFormData | SharedAlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onCreate?: (data: AlbumFormData | SharedAlbumFormData) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
  hideTitle?: boolean;
}

const formDefaultValues: SharedAlbumFormInput = {
  title: '',
  slug: '',
  description: '',
  isPublic: true,
  tags: [],
  joinPolicy: 'open',
  maxPhotosPerUser: '',
};

export default function SharedAlbumEditForm({
  album,
  isNewAlbum = false,
  nickname,
  onSave,
  onDelete,
  onCreate,
  isLoading,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
  hideTitle = false,
}: SharedAlbumEditFormProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const albumId = album?.id;
  const albumOwnerId = album?.user_id ?? null;
  const isOwner = !!user && !!albumOwnerId && albumOwnerId === user.id;

  const { data: members = [] } = useSharedAlbumMembers(albumId && !isNewAlbum ? albumId : undefined);
  const { data: requests = [] } = useSharedAlbumRequests(albumId && !isNewAlbum ? albumId : undefined);
  const inviteMutation = useInviteToSharedAlbum(
    albumId ?? undefined,
    nickname ?? null,
    album?.slug ?? '',
    { albumTitle: album?.title },
  );
  const resolveMutation = useResolveAlbumRequest(
    albumId ?? undefined,
    nickname ?? null,
    album?.slug ?? '',
    { albumTitle: album?.title, ownerId: album?.user_id ?? undefined },
  );
  const removeMemberMutation = useRemoveAlbumMember(
    albumId ?? undefined,
    nickname ?? null,
    album?.slug ?? '',
  );
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisablingSharing, setIsDisablingSharing] = useState(false);
  const [hasEditedSlug, setHasEditedSlug] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SharedAlbumFormInput>({
    resolver: zodResolver(sharedAlbumFormSchema),
    defaultValues: formDefaultValues,
  });

  const watchedSlug = useWatch({ control, name: 'slug' });
  const watchedTags = useWatch({ control, name: 'tags' });
  const watchedIsPublic = useWatch({ control, name: 'isPublic' });
  const watchedJoinPolicy = useWatch({ control, name: 'joinPolicy' });
  const isSaving = isSubmitting || externalIsSaving;

  useEffect(() => {
    if (isDirtyRef) {
      isDirtyRef.current = isDirty;
    }
    onDirtyChange?.(isDirty);
  }, [isDirty, isDirtyRef, onDirtyChange]);

  useEffect(() => {
    if (!album || isNewAlbum) {
      reset(formDefaultValues);
      setHasEditedSlug(false);
      return;
    }

    const albumTags =
      album.tags?.map((t) => {
        if (typeof t === 'string') return t;
        if (t && typeof t === 'object' && 'tag' in t) return t.tag;
        return '';
      }).filter(Boolean) ?? [];

    const maxPhotos = album.max_photos_per_user;
    reset({
      title: album.title,
      slug: album.slug,
      description: album.description ?? '',
      isPublic: album.is_public ?? true,
      tags: albumTags,
      joinPolicy: (album.join_policy === 'open' || album.join_policy === 'closed') ? album.join_policy : 'open',
      maxPhotosPerUser: maxPhotos != null ? String(maxPhotos) : ('' as SharedAlbumFormInput['maxPhotosPerUser']),
    });
    setHasEditedSlug(false);
  }, [album, isNewAlbum, reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (isNewAlbum || !album) return;

      if (e.key === 'Delete' && !isSaving && !isDeleting) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setValue('title', value, { shouldDirty: true });
    if (isNewAlbum && !hasEditedSlug) {
      setValue('slug', generateSlug(value), { shouldDirty: false });
    }
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setValue('slug', sanitized, { shouldDirty: true });
    setHasEditedSlug(true);
  };

  const handleAddTag = (tag: string) => {
    const currentTags = watchedTags ?? [];
    if (currentTags.length < 5 && !currentTags.includes(tag)) {
      setValue('tags', [...currentTags, tag], { shouldDirty: true });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags ?? [];
    setValue('tags', currentTags.filter((t) => t !== tagToRemove), { shouldDirty: true });
  };

  const onSubmit = async (data: SharedAlbumFormInput) => {
    setLocalError(null);
    setLocalSuccess(false);

    try {
      if (isNewAlbum && onCreate) {
        const formData = sharedAlbumFormSchema.parse(data) as SharedAlbumFormData;
        await onCreate(formData);
      } else if (album) {
        const formData = sharedAlbumFormSchema.parse(data) as SharedAlbumFormData;
        await onSave(album.id, formData);
      }
      reset({
        ...data,
        maxPhotosPerUser: data.maxPhotosPerUser ?? '',
      });
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save album';
      setLocalError(message);
    }
  };

  const handleDelete = async () => {
    if (!album) return;

    const confirmed = await confirm(confirmDeleteAlbum(album));
    if (!confirmed) return;

    setIsDeleting(true);
    setLocalError(null);

    try {
      await onDelete(album.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete album';
      setLocalError(message);
      setIsDeleting(false);
    }
  };

  const handleDisableSharing = async () => {
    if (!album) return;

    const confirmed = await confirm(confirmDisableAlbumSharing(album));
    if (!confirmed) return;

    setIsDisablingSharing(true);
    setLocalError(null);

    try {
      const values = getValues();
      const albumFormData: AlbumFormData = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        description: values.description?.trim() ?? '',
        isPublic: values.isPublic,
        tags: values.tags ?? [],
      };
      await onSave(album.id, albumFormData);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable sharing';
      setLocalError(message);
    } finally {
      setIsDisablingSharing(false);
    }
  };

  const triggerSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const error = externalError ?? localError;
  const success = externalSuccess ?? localSuccess;

  if (isLoading) {
    return (
      <SidebarPanel
        title={isNewAlbum ? 'New album' : 'Edit shared album'}
        hideTitle={hideTitle}
      >
        <div
          className="flex items-center justify-center py-12"
        >
          <p
            className="opacity-70"
          >
            Loading...
          </p>
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      title={isNewAlbum ? 'New album' : 'Edit shared album'}
      hideTitle={hideTitle}
      footer={
        <div
          className="flex gap-2 w-full"
        >
          {!isNewAlbum && album && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              icon={<TrashSVG
                className="size-4 -ml-0.5"
              />}
            >
              Delete
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || (!isNewAlbum && !isDirty)}
            loading={isSaving}
            icon={<CheckMiniSVG
              className="size-5 -ml-0.5"
            />}
            className={!isNewAlbum && album ? 'ml-auto' : ''}
            fullWidth={isNewAlbum || !album}
          >
            {success ? 'Saved!' : isNewAlbum ? 'Create album' : 'Save'}
          </Button>
        </div>
      }
    >
      {!isNewAlbum && album && (
        <div
          className="mb-6"
        >
          <AlbumListItem
            album={album}
            variant="detailed"
            publicUrl={nickname ? `/@${nickname}/album/${album.slug}` : undefined}
          />
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="title"
            className="text-sm font-medium"
          >
            Title *
          </label>
          <Input
            id="title"
            type="text"
            {...register('title')}
            onChange={(e) => handleTitleChange(e.target.value)}
            error={!!errors.title}
            placeholder={isNewAlbum ? 'My Amazing Photo Album' : 'Community photo album'}
          />
          {errors.title && <p
            className="text-xs text-red-500"
          >
            {errors.title.message}
          </p>}
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="slug"
            className="text-sm font-medium"
          >
            URL slug *
          </label>
          <Input
            id="slug"
            type="text"
            maxLength={50}
            {...register('slug')}
            onChange={(e) => handleSlugChange(e.target.value)}
            onKeyDown={(e) => {
              const key = e.key;
              if (key.length === 1 && !/^[a-z0-9-\s]$/.test(key.toLowerCase())) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              const sanitized = pastedText.toLowerCase().replace(/[^a-z0-9-]/g, '');
              handleSlugChange(sanitized);
            }}
            error={!!errors.slug}
            mono
            placeholder="my-shared-album"
          />
          {errors.slug && <p
            className="text-xs text-red-500"
          >
            {errors.slug.message}
          </p>}
          {!isNewAlbum && hasEditedSlug && (
            <p
              className="text-xs text-amber-600 dark:text-amber-500"
            >
              <WarningMicroSVG
                className="size-4 fill-amber-600 dark:fill-amber-500 inline-block"
              />
              {' '}
              Changing the
              slug will change the album URL.
            </p>
          )}
          <p
            className="text-xs text-foreground/50"
          >
            URL:
            {' '}
            {nickname ? `/@${nickname}/album/${watchedSlug || 'your-slug'}` : '—'}
          </p>
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="description"
            className="text-sm font-medium"
          >
            Description
          </label>
          <Textarea
            id="description"
            {...register('description')}
            rows={4}
            placeholder="Describe this shared album..."
          />
        </div>

        <Toggle
          id="isPublic"
          leftLabel="Private"
          rightLabel="Public"
          {...register('isPublic')}
          label="Visibility"
        />

        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
          >
            Tags
          </label>
          <TagInput
            id="tags"
            tags={watchedTags ?? []}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            helperText="Add up to 5 tags"
          />
          {errors.tags && <p
            className="text-xs text-red-500"
          >
            {errors.tags.message}
          </p>}
        </div>

        <hr
          className="border-border-color"
        />

        {/* Shared album configuration — always visible */}
        <div
          className="space-y-4"
        >
          <h3
            className="text-sm font-medium"
          >
            Shared album configuration
          </h3>
          {!isNewAlbum && album && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDisableSharing}
              loading={isDisablingSharing}
              disabled={isSaving || isDisablingSharing}
              className="self-start"
            >
              Disable album sharing
            </Button>
          )}
          <Toggle
            id="joinPolicy"
            leftLabel="Anyone"
            rightLabel="By request or invite"
            label="Who can add photos"
            checked={watchedJoinPolicy === 'closed'}
            onChange={(e) => {
              setValue('joinPolicy', e.target.checked ? 'closed' : 'open', { shouldDirty: true });
            }}
          />
          {isNewAlbum && watchedJoinPolicy === 'open' && (
            <p
              className="text-xs text-amber-600 dark:text-amber-500"
            >
              <WarningMicroSVG
                className="size-4 fill-amber-600 dark:fill-amber-500 inline-block"
              />
              {' '}
              Anyone with the link can add photos without requesting access.
            </p>
          )}
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="maxPhotosPerUser"
              className="text-sm font-medium"
            >
              Photos per member limit
            </label>
            <Input
              id="maxPhotosPerUser"
              type="number"
              min={1}
              placeholder="Unlimited"
              {...register('maxPhotosPerUser')}
            />
            <p
              className="text-xs text-foreground/50"
            >
              Leave empty for unlimited photos per member
            </p>
          </div>

          {!isNewAlbum && album && (
            <>
              <AlbumRequestsPanel
                requests={requests}
                onAccept={(req) => resolveMutation.mutate({
                  requestId: req.id,
                  action: 'accept',
                  targetUserId: req.user_id,
                  requestType: req.type as 'invite' | 'request',
                })}
                onDecline={(req) => resolveMutation.mutate({
                  requestId: req.id,
                  action: 'decline',
                  targetUserId: req.user_id,
                  requestType: req.type as 'invite' | 'request',
                })}
                isResolving={resolveMutation.isPending}
              />
              <SharedAlbumMemberList
                members={members}
                albumOwnerId={albumOwnerId ?? ''}
                currentUserId={user?.id}
                isOwner={isOwner}
                onRemoveMember={async (userId) => {
                  const member = members.find((m) => m.user_id === userId);
                  const name = member?.profiles?.full_name || member?.profiles?.nickname || 'this member';
                  const confirmed = await confirm({
                    title: 'Remove member',
                    message: `Remove ${name} from this album? Their contributed photos will also be removed.`,
                    confirmLabel: 'Remove',
                    variant: 'danger',
                  });
                  if (confirmed) {
                    removeMemberMutation.mutate(userId);
                  }
                }}
                isRemoving={removeMemberMutation.isPending}
                onInviteClick={() => {
                  modalContext.setSize('small');
                  modalContext.setTitle('Invite members');
                  modalContext.setContent(
                    <InviteMembersModal
                      albumId={album.id}
                      existingMemberIds={members.map((m) => m.user_id)}
                      pendingUserIds={requests.map((r) => r.user_id)}
                      onInvite={(userIds) => inviteMutation.mutateAsync(userIds)}
                      onClose={() => modalContext.setIsOpen(false)}
                    />,
                  );
                  modalContext.setFooter(null);
                  modalContext.setIsOpen(true);
                }}
              />
            </>
          )}
        </div>

        {error && (
          <div
            className="rounded-md bg-red-500/10 p-3 text-sm text-red-500"
          >
            {error}
          </div>
        )}
      </form>
    </SidebarPanel>
  );
}
