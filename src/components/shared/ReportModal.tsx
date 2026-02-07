'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import PhotoListItem from '@/components/manage/PhotoListItem';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import { useAuth } from '@/context/AuthContext';
import type { Photo } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BotIdClient } from 'botid/client';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const REPORT_REASONS = [
  'Inappropriate or explicit content',
  'Copyright or intellectual property violation',
  'Spam or promotional content',
  'Harassment or bullying',
  'Impersonation',
  'Misleading or false information',
  'Other',
] as const;

type ReportModalProps = {
  entityType: 'photo' | 'album' | 'profile' | 'comment';
  entityId: string;
  entityLabel?: string; // e.g., "this photo", "user @nickname"
  onSuccess?: () => void;
};

export default function ReportModal({
  entityType,
  entityId,
  entityLabel,
  onSuccess,
}: ReportModalProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);
  const isAuthenticated = !!user;

  // Use refs for callbacks to prevent infinite loops
  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const handleCloseRef = useRef<(() => void) | null>(null);

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [details, setDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch entity data for preview
  const { data: photoData } = useQuery<{ photo: Photo; profileNickname: string | null } | null>({
    queryKey: ['photo', entityId],
    queryFn: async () => {
      if (entityType !== 'photo') return null;
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('id', entityId)
        .is('deleted_at', null)
        .single();
      if (error || !data) return null;

      // Fetch profile nickname
      let profileNickname: string | null = null;
      if (data.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', data.user_id)
          .maybeSingle();
        profileNickname = profileData?.nickname || null;
      }

      return {
        photo: data as Photo,
        profileNickname,
      };
    },
    enabled: entityType === 'photo',
  });

  const { data: albumData } = useQuery<{ album: any; profileNickname: string | null } | null>({
    queryKey: ['album', entityId],
    queryFn: async () => {
      if (entityType !== 'album') return null;

      // Fetch album
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select(`
          *,
          photos:album_photos(
            id,
            photo_url,
            photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
          )
        `)
        .eq('id', entityId)
        .is('deleted_at', null)
        .single();

      if (albumError || !albumData) return null;

      // Fetch profile nickname
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', albumData.user_id)
        .single();

      // Filter out deleted photos
      const activePhotos = (albumData.photos || []).filter((ap: any) => !ap.photo?.deleted_at);

      return {
        album: {
          ...albumData,
          photos: activePhotos,
        },
        profileNickname: profileData?.nickname || null,
      };
    },
    enabled: entityType === 'album',
  });

  // Update modal title with short_id and nickname when data is loaded
  useEffect(() => {
    if (entityType === 'photo' && photoData) {
      const title = photoData.photo.title || 'Untitled';
      const shortId = photoData.photo.short_id ? ` (${photoData.photo.short_id})` : '';
      const nickname = photoData.profileNickname ? ` by @${photoData.profileNickname}` : '';
      modalContext.setTitle(`Report photo: "${title}"${shortId}${nickname}`);
    }
  }, [photoData, entityType, modalContext]);

  useEffect(() => {
    if (entityType === 'album' && albumData) {
      const title = albumData.album.title || 'Untitled Album';
      const nickname = albumData.profileNickname ? ` by @${albumData.profileNickname}` : '';
      modalContext.setTitle(`Report album: "${title}"${nickname}`);
    }
  }, [albumData, entityType, modalContext]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      setError('Please provide a reason when selecting "Other"');
      return;
    }

    const reason = selectedReason === 'Other' && customReason.trim()
      ? customReason.trim()
      : selectedReason;
    if (!reason) {
      setError('Please select or provide a reason for reporting');
      return;
    }

    // Validate anonymous fields
    if (!isAuthenticated) {
      if (!reporterName.trim()) {
        setError('Please provide your name');
        return;
      }
      if (!reporterEmail.trim()) {
        setError('Please provide your email');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reporterEmail)) {
        setError('Please provide a valid email address');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          reason,
          details: details.trim() || null,
          ...(isAuthenticated ? {} : {
            reporterName: reporterName.trim(),
            reporterEmail: reporterEmail.trim(),
          }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      // Success
      modalContext.setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, customReason, isAuthenticated, reporterName, reporterEmail, entityType, entityId, details, modalContext, onSuccess]);

  // Update refs when callbacks change
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
    handleCloseRef.current = () => modalContext.setIsOpen(false);
  }, [handleSubmit, modalContext]);

  // Memoize footer to prevent infinite loops - use refs for callbacks
  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end gap-2"
      >
        <Button
          variant="secondary"
          onClick={() => handleCloseRef.current?.()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmitRef.current?.()}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Submit report
        </Button>
      </div>
    ),
    [isSubmitting],
  );

  // Set footer with action buttons - only update when footer content changes
  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [modalContext, footerContent]);

  // BotIdClient only works when deployed on Vercel
  const isVercel = process.env.NEXT_PUBLIC_VERCEL === '1';

  return (
    <>
      {!isAuthenticated && isVercel && (
        <BotIdClient
          protect={[
            { path: '/api/reports', method: 'POST' },
          ]}
        />
      )}
      <div
        className="space-y-4"
      >
        {/* Entity preview */}
        {entityType === 'photo' && photoData && (
          <div
            className="mb-4 w-fit"
          >
            <PhotoListItem
              photo={photoData.photo}
              variant="compact"
              className="items-center pr-1.5"
            />
          </div>
        )}
        {entityType === 'album' && albumData && albumData.profileNickname && (
          <div
            className="mb-4 w-fit"
          >
            <AlbumMiniCard
              title={albumData.album.title || 'Untitled Album'}
              slug={albumData.album.slug || ''}
              coverImageUrl={albumData.album.cover_image_url}
              href={`/@${albumData.profileNickname}/album/${albumData.album.slug}`}
              photoCount={albumData.album.photos?.length || 0}
              createdAt={albumData.album.created_at}
              className="pr-6"
            />
          </div>
        )}

        <p
          className="text-sm text-foreground/70"
        >
          Help us keep the community safe by reporting content that violates our guidelines.
        </p>

        {error && (
          <ErrorMessage
            variant="compact"
          >
            {error}
          </ErrorMessage>
        )}

        {/* Anonymous user fields */}
        {!isAuthenticated && (
          <div
            className="space-y-3"
          >
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
              >
                Your name
              </label>
              <Input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Enter your name"
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
              >
                Your email
              </label>
              <Input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                maxLength={255}
              />
            </div>
          </div>
        )}

        {/* Reason selection */}
        <div>
          <p
            className="block text-sm font-medium mb-1.5"
          >
            Reason for reporting
          </p>
          <div
            className="space-y-2"
          >
            {REPORT_REASONS.map((reasonOption) => (
              <label
                key={reasonOption}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={reasonOption}
                  checked={selectedReason === reasonOption}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="size-4 accent-primary cursor-pointer"
                  disabled={isSubmitting}
                />
                <span
                  className="text-sm text-foreground/80 group-hover:text-foreground"
                >
                  {reasonOption}
                </span>
              </label>
            ))}
          </div>
          {selectedReason === 'Other' && (
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please describe the issue..."
              rows={3}
              className="mt-3"
              disabled={isSubmitting}
              maxLength={500}
            />
          )}
        </div>

        {/* Additional details */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
          >
            Additional details
            {' '}
            <span
              className="text-foreground/60 text-xs"
            >
              (optional)
            </span>
          </label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide any additional context that might help us review this report..."
            rows={4}
            disabled={isSubmitting}
            maxLength={1000}
          />
        </div>
      </div>
    </>
  );
}
