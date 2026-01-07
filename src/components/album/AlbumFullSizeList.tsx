import Image from 'next/image';
import type { AlbumPhoto } from '@/types/albums';

export default function AlbumFullSizeList({ photos }: { photos: AlbumPhoto[] }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div className="flex flex-col gap-12">
      {photos.map((photo) => (
        <div key={photo.id} className="w-full">
          <Image
            src={photo.photo_url}
            alt={photo.title || 'Album photo'}
            width={photo.width || 1200}
            height={photo.height || 800}
            className="w-full h-auto object-contain bg-background-light"
            sizes="(max-width: 768px) 100vw, 800px"
            priority={false}
          />
          {photo.title && (
            <div className="mt-2 text-center text-base opacity-70">{photo.title}</div>
          )}
        </div>
      ))}
    </div>
  );
}
