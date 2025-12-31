import React from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import Button from './Button'
import Container from './Container'

interface AlbumDetailsFormProps {
  title: string
  slug: string
  description: string
  isPublic: boolean
  tags: string[]
  tagInput: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onIsPublicChange: (value: boolean) => void
  onTagInputChange: (value: string) => void
  onAddTag: (e: KeyboardEvent<HTMLInputElement>) => void
  onRemoveTag: (tag: string) => void
  onSave: () => void
  isSaving: boolean
  error: string | null
  success: boolean
  profileNickname: string | null
}

const AlbumDetailsForm: React.FC<AlbumDetailsFormProps> = ({
  title,
  slug,
  description,
  isPublic,
  tags,
  tagInput,
  onTitleChange,
  onDescriptionChange,
  onIsPublicChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onSave,
  isSaving,
  error,
  success,
  profileNickname,
}) => (
  <Container>
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
          placeholder="My Amazing Photo Album"
        />
        <p className="text-xs text-foreground/50">
          URL: {process.env.NEXT_PUBLIC_SITE_URL}/@{profileNickname || 'your-nickname'}/{slug || 'your-title'}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
          placeholder="Tell us about this album..."
        />
      </div>
      <div className="flex items-center">
        <input
          id="isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => onIsPublicChange(e.target.checked)}
          className="size-4 rounded border-neutral-300 text-blue-600"
        />
        <label htmlFor="isPublic" className="ml-2 text-sm">
          Make this album public (visible to everyone)
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="tags" className="text-sm font-medium">
          Tags
        </label>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-primary-alt size-4 flex items-center justify-center rounded-full -mr-1"
                  aria-label="Remove tag"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          id="tags"
          type="text"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          disabled={tags.length >= 5}
          onKeyDown={onAddTag}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
          placeholder={tags.length >= 5 ? 'Maximum of 5 tags reached' : 'Type a tag and press Enter to add'}
        />
        <p className="text-xs text-foreground/50">
          Add up to 5 tags to help people discover your album
        </p>
      </div>
    </div>
    {error && (
      <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
        {error}
      </div>
    )}
    {success && (
      <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-500">
        Album saved successfully!
      </div>
    )}
    <div className="mt-6">
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </Container>
)

export default AlbumDetailsForm
