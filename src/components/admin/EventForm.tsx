'use client';

import Container from '@/components/layout/Container';
import Input from '@/components/shared/Input';
import { RichTextDescriptionField } from '@/components/shared/RichTextDescriptionField';
import Textarea from '@/components/shared/Textarea';
import EventCoverUpload from './EventCoverUpload';

interface EventFormData {
  title: string;
  slug: string;
  description: string;
  date: string;
  time: string;
  location: string;
}

interface EventFormProps {
  formData: EventFormData;
  onFormDataChange: (data: Partial<EventFormData>) => void;
  onTitleChange: (title: string) => void;
  onTitleBlur: () => void;
  onSlugChange: (slug: string) => void;
  coverImageFile: File | null;
  coverImagePreview: string | null;
  coverImage: string;
  onCoverImageChange: (file: File | null) => void;
  onCoverImageRemove: () => void;
  coverImageInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EventForm({
  formData,
  onFormDataChange,
  onTitleChange,
  onTitleBlur,
  onSlugChange,
  coverImageFile,
  coverImagePreview,
  coverImage,
  onCoverImageChange,
  onCoverImageRemove,
  coverImageInputRef,
  onSubmit,
}: EventFormProps) {
  return (
    <form
      id="event-form"
      onSubmit={onSubmit}
    >
      <Container>
        <h2
          className="mb-6 text-xl font-semibold"
        >
          Event details
        </h2>
        <div
          className="space-y-6"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="title"
              className="text-sm font-medium"
            >
              Event title *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              required
              placeholder="e.g., Monthly Meetup at Coffee Shop"
            />
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
              value={formData.slug}
              onChange={(e) => onSlugChange(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              mono
              placeholder="url-friendly-event-name"
            />
            <p
              className="text-xs text-muted-foreground"
            >
              Used in the URL:
              {' '}
              {process.env.NEXT_PUBLIC_SITE_URL}
              /events/
              {formData.slug || 'your-slug-here'}
            </p>
          </div>

          <RichTextDescriptionField
            id="description"
            value={formData.description}
            onChange={(val) => onFormDataChange({ description: val })}
            placeholder="Describe your event, what to expect, any special notes..."
          />

          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div
              className="flex flex-col gap-2"
            >
              <label
                htmlFor="date"
                className="text-sm font-medium"
              >
                Date *
              </label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => onFormDataChange({ date: e.target.value })}
                required
              />
            </div>

            <div
              className="flex flex-col gap-2"
            >
              <label
                htmlFor="time"
                className="text-sm font-medium"
              >
                Time
              </label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => onFormDataChange({ time: e.target.value })}
              />
            </div>
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="location"
              className="text-sm font-medium"
            >
              Location
            </label>
            <Textarea
              id="location"
              value={formData.location}
              onChange={(e) => onFormDataChange({ location: e.target.value })}
              rows={3}
              placeholder="e.g., Central Park, New York, NY"
            />
          </div>

          <EventCoverUpload
            coverImageFile={coverImageFile}
            coverImagePreview={coverImagePreview}
            coverImage={coverImage}
            onCoverImageChange={onCoverImageChange}
            onCoverImageRemove={onCoverImageRemove}
            coverImageInputRef={coverImageInputRef}
          />
        </div>
      </Container>
    </form>
  );
}
