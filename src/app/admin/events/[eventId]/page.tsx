'use client';

import exifr from 'exifr';
import { useParams, useRouter } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import AnnounceEventModal from '@/components/admin/AnnounceEventModal';
import EmailAttendeesModal from '@/components/admin/EmailAttendeesModal';
import EventForm from '@/components/admin/EventForm';
import EventRsvpList from '@/components/admin/EventRsvpList';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useFormChanges } from '@/hooks/useFormChanges';
import { useSupabase } from '@/hooks/useSupabase';
import { confirmDeleteEvent } from '@/utils/confirmHelpers';

import { revalidateEvent } from '@/app/actions/revalidate';
import EmailForwardSVG from 'public/icons/email-forward.svg';
import MegaphoneSVG from 'public/icons/megaphone.svg';
import TrashSVG from 'public/icons/trash.svg';

type Event = Pick<
  Tables<'events'>,
  'id' | 'title' | 'description' | 'date' | 'time' | 'location' | 'cover_image' | 'slug'
>;

type RSVPWithProfile = Pick<
  Tables<'events_rsvps'>,
  'id' | 'uuid' | 'name' | 'email' | 'confirmed_at' | 'canceled_at' | 'attended_at' | 'created_at'
> & {
  profiles: Pick<Tables<'profiles'>, 'nickname'> | Pick<Tables<'profiles'>, 'nickname'>[] | null;
};

export default function AdminEventFormPage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin
  const { user } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const params = useParams();
  const supabase = useSupabase();

  const eventSlug = params.eventId as string;
  const isNewEvent = eventSlug === 'new';

  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<RSVPWithProfile[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const modalContext = useContext(ModalContext);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [savedFormValues, setSavedFormValues] = useState<{
    title: string;
    slug: string;
    description: string;
    date: string;
    time: string;
    location: string;
    coverImage: string;
  } | null>(null);

  // Auto-generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    // Auto-generate slug only if it's empty (for both new and existing events)
    if (!slug.trim() && title.trim()) {
      setSlug(generateSlug(title));
    }
  };

  const handleSlugChange = (newSlug: string) => {
    const sanitized = generateSlug(newSlug);
    setSlug(sanitized);
    setIsSlugManuallyEdited(true);
  };

  const handleCoverImageChange = (file: File | null) => {
    setCoverImageFile(file);
    if (file) {
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCoverImageRemove = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setCoverImage('');
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  // Track form changes for unsaved changes warning
  const currentFormValues = {
    title,
    slug,
    description,
    date,
    time,
    location,
    coverImage,
  };

  useFormChanges(
    currentFormValues,
    savedFormValues,
    {},
    !!coverImageFile, // Track if a new cover image file is selected
  );

  useEffect(() => {
    // Admin access is guaranteed by ProtectedRoute layout
    if (!isNewEvent) {
      fetchEvent();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  const fetchEvent = async () => {
    setIsLoading(true);
    try {
      // Check if eventSlug is a numeric ID or an actual slug
      const isNumericId = /^\d+$/.test(eventSlug);

      let query = supabase.from('events').select('*');

      if (isNumericId) {
        query = query.eq('id', parseInt(eventSlug));
      } else {
        query = query.eq('slug', eventSlug);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event');
      } else if (data) {
        setEvent(data);
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setIsSlugManuallyEdited(true);
        setDescription(data.description || '');
        setDate(data.date || '');
        setTime(data.time || '');
        setLocation(data.location || '');
        setCoverImage(data.cover_image || '');
        setCoverImagePreview(data.cover_image || null);

        // Set saved form values for change tracking
        setSavedFormValues({
          title: data.title || '',
          slug: data.slug || '',
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          coverImage: data.cover_image || '',
        });

        // Load RSVPs for this event
        const { data: rsvpsData } = await supabase
          .from('events_rsvps')
          .select(
            'id, uuid, name, email, confirmed_at, canceled_at, attended_at, created_at, profiles!events_rsvps_user_id_profiles_fkey(nickname)',
          )
          .eq('event_id', data.id)
          .order('created_at', { ascending: false });

        setRsvps(rsvpsData || []);

        // Check if announcement already sent
        const { data: announcement } = await supabase
          .from('event_announcements')
          .select('id')
          .eq('event_id', data.id)
          .single();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    }
    setIsLoading(false);
  };

  const handleMarkAttended = async (rsvpId: number, unmark: boolean = false) => {
    setMarkingId(rsvpId);

    const result = await fetch('/api/admin/mark-attendance', {
      method: 'POST',
      body: JSON.stringify({ rsvp_id: rsvpId, unmark }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result.ok) {
      // Update local state instead of refetching everything
      setRsvps((prevRsvps) =>
        prevRsvps.map((rsvp) =>
          rsvp.id === rsvpId
            ? { ...rsvp, attended_at: unmark ? null : new Date().toISOString() }
            : rsvp,
        ),
      );
    }

    setMarkingId(null);
  };

  const handleAnnounceEvent = () => {
    if (!event || !modalContext) return;

    modalContext.setTitle(`Announce event: ${event.title}`);
    modalContext.setContent(
      <AnnounceEventModal
        eventId={event.id}
        onClose={() => modalContext.setIsOpen(false)}
      />,
    );
    modalContext.setSize('large');
    modalContext.setIsOpen(true);
  };

  const handleEmailAttendees = () => {
    if (!event) return;

    modalContext.setTitle(`Email attendees: ${event.title}`);
    modalContext.setContent(
      <EmailAttendeesModal
        eventId={event.id}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={() => {
          // Optionally refresh data
        }}
      />,
    );
    modalContext.setSize('large');
    modalContext.setIsOpen(true);
  };

  const handleDelete = async () => {
    const confirmed = await confirm(confirmDeleteEvent());

    if (!confirmed) return;

    // Check if eventSlug is a numeric ID or an actual slug
    const isNumericId = /^\d+$/.test(eventSlug);

    const result = await fetch('/api/admin/events', {
      method: 'DELETE',
      body: JSON.stringify({
        id: isNumericId ? parseInt(eventSlug) : undefined,
        slug: !isNumericId ? eventSlug : undefined,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result.ok) {
      // Revalidate event pages
      await revalidateEvent(eventSlug);
      router.push('/admin/events');
    } else {
      const data = await result.json();
      setError(data.message || 'Failed to delete event');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date || !slug.trim()) {
      setError('Title, slug, and date are required');
      return;
    }

    if (!coverImageFile && !coverImagePreview) {
      setError('Cover image is required');
      return;
    }

    // Generate slug from title if creating new event and slug is empty
    let finalSlug = slug.trim();
    if (isNewEvent && !finalSlug) {
      finalSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (!finalSlug) {
      setError('Slug is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let coverImageUrl = coverImage; // Use existing URL if no new file

      // Upload new cover image if selected
      if (coverImageFile) {
        // First, get image dimensions
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = document.createElement('img');
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = URL.createObjectURL(coverImageFile);
        });

        // Extract EXIF data
        let exifData = null;
        try {
          exifData = await exifr.parse(coverImageFile, {
            pick: [
              'Make',
              'Model',
              'DateTimeOriginal',
              'ExposureTime',
              'FNumber',
              'ISO',
              'FocalLength',
              'LensModel',
              'GPSLatitude',
              'GPSLongitude',
            ],
          });
        } catch (err) {
          console.warn('Failed to extract EXIF data:', err);
        }

        const fileExt = coverImageFile.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(filePath, coverImageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError('Failed to upload cover image');
          setIsSaving(false);
          return;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('event-covers').getPublicUrl(filePath);

        coverImageUrl = publicUrl;

        // Store photo metadata
        const { error: metadataError } = await supabase.from('photos').insert({
          storage_path: filePath,
          url: publicUrl,
          width: dimensions.width,
          height: dimensions.height,
          file_size: coverImageFile.size,
          mime_type: coverImageFile.type,
          exif_data: exifData,
          user_id: user?.id,
          original_filename: coverImageFile.name,
        });

        if (metadataError) {
          console.error('Error storing image metadata:', metadataError);
          // Don't fail the whole operation if metadata fails
        }
      }

      if (isNewEvent) {
        // Create new event
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert({
            title: title.trim(),
            slug: finalSlug,
            description: description.trim() || null,
            date,
            time: time || null,
            location: location.trim() || null,
            cover_image: coverImageUrl,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating event:', createError);
          setError(createError.message || 'Failed to create event');
          setIsSaving(false);
          return;
        }

        // Update saved form values after successful creation
        setSavedFormValues({
          title: title.trim(),
          slug: finalSlug,
          description: description.trim() || '',
          date,
          time: time || '',
          location: location.trim() || '',
          coverImage: coverImageUrl,
        });

        // Revalidate event pages
        await revalidateEvent(finalSlug);

        setSuccess(true);
        setTimeout(() => {
          router.push('/admin/events');
        }, 1500);
      } else {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: title.trim(),
            slug: finalSlug,
            description: description.trim() || null,
            date,
            time: time || null,
            location: location.trim() || null,
            cover_image: coverImageUrl,
          })
          .eq('slug', eventSlug);

        if (updateError) {
          console.error('Error updating event:', updateError);
          setError(updateError.message || 'Failed to update event');
          setIsSaving(false);
          return;
        }

        // Update local state with new cover image URL
        setCoverImage(coverImageUrl);
        setCoverImagePreview(coverImageUrl);
        setCoverImageFile(null);

        // Update saved form values after successful save
        setSavedFormValues({
          title: title.trim(),
          slug: finalSlug,
          description: description.trim() || '',
          date,
          time: time || '',
          location: location.trim() || '',
          coverImage: coverImageUrl,
        });

        // Revalidate event pages
        await revalidateEvent(finalSlug);

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="mb-2 text-3xl font-bold"
        >
          {isNewEvent ? 'Create new event' : 'Edit event'}
        </h1>
        <p
          className="text-lg opacity-70"
        >
          {isNewEvent ? 'Fill in the details for your event' : 'Update the event details'}
        </p>
      </div>

      {isLoading ? (
        <Container
          className="text-center animate-pulse"
        >
          <p
            className="text-foreground/50"
          >
            Loading event...
          </p>
        </Container>
      ) : (
        <div
          className="space-y-6"
        >
          <EventForm
            formData={{
              title,
              slug,
              description,
              date,
              time,
              location,
            }}
            onFormDataChange={(data) => {
              if (data.title !== undefined) setTitle(data.title);
              if (data.slug !== undefined) setSlug(data.slug);
              if (data.description !== undefined) setDescription(data.description);
              if (data.date !== undefined) setDate(data.date);
              if (data.time !== undefined) setTime(data.time);
              if (data.location !== undefined) setLocation(data.location);
            }}
            onTitleChange={handleTitleChange}
            onTitleBlur={handleTitleBlur}
            onSlugChange={handleSlugChange}
            coverImageFile={coverImageFile}
            coverImagePreview={coverImagePreview}
            coverImage={coverImage}
            onCoverImageChange={handleCoverImageChange}
            onCoverImageRemove={handleCoverImageRemove}
            coverImageInputRef={coverImageInputRef}
            error={error}
            success={success}
            isSaving={isSaving}
            isNewEvent={isNewEvent}
            onSubmit={handleSave}
          />

          {/* Attendance Section - Only show for existing events */}
          {!isNewEvent && event && (
            <EventRsvpList
              rsvps={rsvps}
              markingId={markingId}
              onMarkAttended={handleMarkAttended}
            />
          )}

          {/* Notifications Section - Only show for existing events */}
          {!isNewEvent && event && (
            <Container>
              <h2
                className="mb-6 text-xl font-semibold"
              >
                Notifications
              </h2>

              <div
                className="space-y-4"
              >
                {/* Announce Event Button */}
                <div>
                  <div
                    className="mb-2 flex items-center justify-between"
                  >
                    <div>
                      <h3
                        className="text-sm font-semibold"
                      >
                        Announce event
                      </h3>
                      <p
                        className="text-xs text-foreground/70"
                      >
                        Send a one-time announcement to all members who have are opted in to event
                        announcements
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAnnounceEvent}
                    variant="primary"
                  >
                    <MegaphoneSVG
                      className="size-5"
                    />
                    Announce event
                  </Button>
                </div>

                {/* Email Attendees Button */}
                <div>
                  <div
                    className="mb-2"
                  >
                    <h3
                      className="text-sm font-semibold"
                    >
                      Email attendees
                    </h3>
                    <p
                      className="text-xs text-foreground/70"
                    >
                      Send a custom message to confirmed attendees and hosts
                    </p>
                  </div>
                  <Button
                    onClick={handleEmailAttendees}
                    variant="secondary"
                  >
                    <EmailForwardSVG
                      className="size-5"
                    />
                    Email attendees
                  </Button>
                </div>
              </div>
            </Container>
          )}

          {/* Danger Zone - Only show for existing events */}
          {!isNewEvent && (
            <Container
              className="border-red-500/30 bg-red-500/5"
            >
              <h3
                className="mb-2 font-semibold text-red-600"
              >
                Danger zone
              </h3>
              <p
                className="mb-4 text-sm text-foreground/70"
              >
                Once you delete an event, there is no going back. This will permanently delete the
                event and all associated RSVPs.
              </p>
              <Button
                onClick={handleDelete}
                variant="danger"
                icon={<TrashSVG
                  className="h-4 w-4"
                />}
              >
                Delete event
              </Button>
            </Container>
          )}
        </div>
      )}
    </PageContainer>
  );
}
