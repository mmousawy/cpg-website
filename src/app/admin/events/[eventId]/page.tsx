'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import exifr from 'exifr';

import type { Tables } from '@/database.types';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/shared/Button';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';

import ArrowLink from '@/components/shared/ArrowLink';
import { revalidateEvent } from '@/app/actions/revalidate';
import CheckSVG from 'public/icons/check.svg';
import TrashSVG from 'public/icons/trash.svg';
import clsx from 'clsx';
import ErrorMessage from '@/components/shared/ErrorMessage';
import SuccessMessage from '@/components/shared/SuccessMessage';

// Shared input styling
const inputClassName = "rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none";

type Event = Pick<Tables<'events'>, 'id' | 'title' | 'description' | 'date' | 'time' | 'location' | 'cover_image' | 'slug'>

export default function AdminEventFormPage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin
  const { user } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

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
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState('');

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

      let query = supabase
        .from('events')
        .select('*');

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

        // Load RSVPs for this event
        const { data: rsvpsData } = await supabase
          .from('events_rsvps')
          .select('id, uuid, name, email, confirmed_at, canceled_at, attended_at, created_at')
          .eq('event_id', data.id)
          .order('created_at', { ascending: false });

        setRsvps(rsvpsData || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    }
    setIsLoading(false);
  };

  const handleMarkAttended = async (rsvpId: number) => {
    setMarkingId(rsvpId);

    const result = await fetch('/api/admin/mark-attendance', {
      method: 'POST',
      body: JSON.stringify({ rsvp_id: rsvpId }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result.ok) {
      if (!isNewEvent) {
        await fetchEvent();
      }
    }

    setMarkingId(null);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone and will remove all RSVPs.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

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
      finalSlug = title.trim()
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
            pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude'],
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
        const { data: { publicUrl } } = supabase.storage
          .from('event-covers')
          .getPublicUrl(filePath);

        coverImageUrl = publicUrl;

        // Store photo metadata
        const { error: metadataError } = await supabase
          .from('photos')
          .insert({
            storage_path: filePath,
            url: publicUrl,
            width: dimensions.width,
            height: dimensions.height,
            file_size: coverImageFile.size,
            mime_type: coverImageFile.type,
            exif_data: exifData,
            user_id: user?.id,
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
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          {isNewEvent ? 'Create new event' : 'Edit event'}
        </h1>
        <p className="text-lg opacity-70">
          {isNewEvent ? 'Fill in the details for your event' : 'Update the event details'}
        </p>
      </div>

      {isLoading ? (
        <Container className="text-center animate-pulse">
          <p className="text-foreground/50">Loading event...</p>
        </Container>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleSave}>
            {/* Event Details */}
            <Container>
              <h2 className="mb-6 text-xl font-semibold">Event Details</h2>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                  Event Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={handleTitleBlur}
                    required
                    className={inputClassName}
                    placeholder="e.g., Monthly Meetup at Coffee Shop"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="slug" className="text-sm font-medium">
                  URL Slug *
                  </label>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    pattern="[-a-z0-9]+"
                    className={inputClassName}
                    placeholder="url-friendly-event-name"
                  />
                  <p className="text-xs text-muted-foreground">
                  Used in the URL: {process.env.NEXT_PUBLIC_SITE_URL}/events/{slug || 'your-slug-here'}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                  Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className={inputClassName}
                    placeholder="Describe your event, what to expect, any special notes..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="date" className="text-sm font-medium">
                    Date *
                    </label>
                    <input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="time" className="text-sm font-medium">
                    Time
                    </label>
                    <input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="location" className="text-sm font-medium">
                  Location
                  </label>
                  <textarea
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    rows={3}
                    className={inputClassName}
                    placeholder="e.g., Central Park, New York, NY"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                  Cover Image *
                  </label>

                  {(coverImagePreview || coverImageFile) ? (
                    <div className="space-y-3">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-color">
                        <Image
                          src={coverImageFile ? URL.createObjectURL(coverImageFile) : coverImagePreview!}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => coverImageInputRef.current?.click()}
                          variant="secondary"
                          size="sm"
                        >
                        Change Image
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImagePreview(null);
                            setCoverImage('');
                            if (coverImageInputRef.current) {
                              coverImageInputRef.current.value = '';
                            }
                          }}
                          variant="secondary"
                          size="sm"
                          icon={<TrashSVG className="h-4 w-4" />}
                        >
                        Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-border-color p-8 text-center">
                      <p className="mb-3 text-sm text-foreground/70">
                      No cover image selected
                      </p>
                      <Button
                        type="button"
                        onClick={() => coverImageInputRef.current?.click()}
                        variant="secondary"
                        size="sm"
                      >
                      Select Image
                      </Button>
                    </div>
                  )}

                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                      // Validate file type
                        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                        if (!allowedTypes.includes(file.type)) {
                          setError('Invalid file type. Please use JPEG, PNG, GIF, or WebP.');
                          return;
                        }

                        // Validate file size (max 5 MB)
                        const maxSize = 5 * 1024 * 1024;
                        if (file.size > maxSize) {
                          setError('File too large. Maximum size is 5 MB.');
                          return;
                        }

                        setCoverImageFile(file);
                        setError(null);
                      }
                    }}
                    className="hidden"
                  />

                  <p className="text-xs text-foreground/50">
                  Upload a cover image for your event (max 5 MB)
                  </p>
                </div>
              </div>

              {error && (
                <ErrorMessage variant="compact" className="mt-4">{error}</ErrorMessage>
              )}

              {success && (
                <SuccessMessage variant="compact" className="mt-4">
                  {isNewEvent ? 'Event created successfully! Redirecting...' : 'Event updated successfully!'}
                </SuccessMessage>
              )}

              <div className="mt-6 flex gap-3">
                <Button type="submit" disabled={isSaving} variant="primary">
                  {isSaving ? 'Saving...' : isNewEvent ? 'Create Event' : 'Save Changes'}
                </Button>
                <Button href="/admin/events" variant="secondary">
                Cancel
                </Button>
              </div>
            </Container>
          </form>

          {/* Attendance Section - Only show for existing events */}
          {!isNewEvent && event && (
            <Container>
              <h2 className="mb-6 text-xl font-semibold">Event Attendance</h2>
              <div className="mb-6 rounded-lg border border-border-color bg-background p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="font-medium text-foreground">
                    {rsvps.filter(r => r.confirmed_at && !r.canceled_at).length} confirmed
                  </span>
                  <span className="font-medium text-green-600">
                    {rsvps.filter(r => r.attended_at).length} attended
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {rsvps.filter(r => r.confirmed_at && !r.canceled_at).length === 0 ? (
                  <p className="text-center text-sm text-foreground/70 py-4">No confirmed RSVPs yet</p>
                ) : (
                  rsvps.filter(r => r.confirmed_at && !r.canceled_at).map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className={clsx(
                        "flex items-center justify-between rounded-lg border border-border-color p-3",
                        rsvp.attended_at && "text-green-600 border-green-600/30 bg-green-500/5",
                      )}
                    >
                      <div>
                        <p className="font-medium">{rsvp.name || 'Unknown'}</p>
                        <p className="text-sm text-foreground/60">{rsvp.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rsvp.attended_at ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                            <CheckSVG className="h-3 w-3 fill-green-600" />
                          Attended
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleMarkAttended(rsvp.id)}
                            disabled={markingId === rsvp.id}
                            size="sm"
                            className="rounded-full border-green-500/30 text-green-600 hover:border-green-500 hover:bg-green-500/10"
                          >
                            {markingId === rsvp.id ? 'Marking...' : 'Mark attended'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Container>
          )}

          {/* Danger Zone - Only show for existing events */}
          {!isNewEvent && (
            <Container className="border-red-500/30 bg-red-500/5">
              <h3 className="mb-2 font-semibold text-red-600">Danger zone</h3>
              <p className="mb-4 text-sm text-foreground/70">
              Once you delete an event, there is no going back. This will permanently delete the event and all associated RSVPs.
              </p>
              <Button
                onClick={handleDelete}
                variant="danger"
                icon={<TrashSVG className="h-4 w-4" />}
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
