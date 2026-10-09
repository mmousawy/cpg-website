import clsx from 'clsx';
import PhotoSVG from 'public/icons/photo.svg';

type EventPhotoCountProps = {
  count: number;
  /** Overlay on the cover image. `sm` matches compact cards; `md` matches the events list. */
  onCover?: 'sm' | 'md';
  className?: string;
};

export default function EventPhotoCount({ count, onCover, className }: EventPhotoCountProps) {
  if (count <= 0) return null;

  const label = count === 1 ? 'photo' : 'photos';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap',
        onCover
          ? 'absolute z-5 rounded-full bg-black/60 font-medium text-white shadow-sm backdrop-blur-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]'
          : 'gap-1.5 text-sm font-medium text-foreground/80',
        onCover === 'sm' && 'bottom-2 left-2 px-2 py-0.5 text-[11px]',
        onCover === 'md' && 'bottom-3 left-3 px-2.5 py-1 text-xs',
        className,
      )}
    >
      <PhotoSVG
        className="size-[18px] shrink-0 fill-current"
      />
      <span>
        {count}
        {' '}
        {label}
      </span>
    </span>
  );
}
