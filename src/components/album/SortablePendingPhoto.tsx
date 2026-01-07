import React from 'react';

interface SortablePendingPhotoProps {
  file: File
  index: number
  onDelete: (index: number) => void
  attributes?: any
  listeners?: any
  setNodeRef?: any
  style?: React.CSSProperties
  isDragging?: boolean
}

const SortablePendingPhoto: React.FC<SortablePendingPhotoProps> = ({
  file,
  index,
  onDelete,
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
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        className="size-full cursor-move object-cover"
      />
    </div>
    <div className="p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm text-foreground/70 truncate">{file.name}</p>
        <button
          onClick={() => onDelete(index)}
          className="rounded p-1 hover:bg-red-600/10"
          aria-label="Remove photo"
        >
          <span className="size-4 text-red-600">&times;</span>
        </button>
      </div>
    </div>
  </div>
);

export default SortablePendingPhoto;
