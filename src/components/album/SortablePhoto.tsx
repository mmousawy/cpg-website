import React from 'react'
import Image from 'next/image'
import EditSVG from 'public/icons/edit.svg'
import TrashSVG from 'public/icons/trash.svg'
import Button from '../shared/Button'
import type { AlbumPhoto } from '@/types/albums'

interface SortablePhotoProps {
  photo: AlbumPhoto
  onDelete: (photoId: string, photoUrl: string) => void
  onEditCaption: (photoId: string, currentTitle: string | null) => void
  isEditing: boolean
  editingCaption: string
  onCaptionChange: (value: string) => void
  onSaveCaption: () => void
  onCancelEdit: () => void
  attributes?: any
  listeners?: any
  setNodeRef?: any
  style?: React.CSSProperties
  isDragging?: boolean
}

const SortablePhoto: React.FC<SortablePhotoProps> = ({
  photo,
  onDelete,
  onEditCaption,
  isEditing,
  editingCaption,
  onCaptionChange,
  onSaveCaption,
  onCancelEdit,
  attributes = {},
  listeners = {},
  setNodeRef = undefined,
  style = {},
  isDragging = false,
}) => (
  <div
    ref={setNodeRef}
    style={style}
    className={`group relative overflow-hidden rounded-lg border border-border-color bg-background${isDragging ? ' z-50' : ''}`}
  >
    <div className="aspect-square overflow-hidden" {...attributes} {...listeners}>
      <Image
        src={photo.photo_url}
        alt={photo.title || ''}
        width={300}
        height={300}
        className="size-full cursor-move object-cover"
      />
    </div>
    <div className="p-2">
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editingCaption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Add a caption..."
            className="w-full rounded border border-border-color bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={onSaveCaption} size="sm">Save</Button>
            <Button onClick={onCancelEdit} variant="secondary" size="sm">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="flex-1 text-sm text-foreground/70">{photo.title || 'No caption'}</p>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEditCaption(photo.id, photo.title)}
              className="rounded p-1 hover:bg-background-alt"
              aria-label="Edit caption"
            >
              <EditSVG className="size-4 text-foreground/70" />
            </button>
            <button
              onClick={() => onDelete(photo.id, photo.photo_url)}
              className="rounded p-1 hover:bg-red-600/10"
              aria-label="Delete photo"
            >
              <TrashSVG className="size-4 text-red-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)

export default SortablePhoto
