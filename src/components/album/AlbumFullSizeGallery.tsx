"use client";

import { useEffect } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import Image from "next/image";
import type { AlbumPhoto } from "@/types/albums";

function exifToString(exif: any) {
  if (!exif) return null;
  const fields = [
    exif.Make && `Camera: ${exif.Make} ${exif.Model}`,
    exif.LensModel && `Lens: ${exif.LensModel}`,
    exif.FNumber && `Aperture: ƒ/${exif.FNumber}`,
    exif.ExposureTime && `Shutter: ${exif.ExposureTime}s`,
    exif.ISO && `ISO: ${exif.ISO}`,
    exif.FocalLength && `Focal: ${exif.FocalLength}mm`,
    exif.DateTimeOriginal && `Taken: ${exif.DateTimeOriginal}`,
    (exif.GPSLatitude && exif.GPSLongitude) && `GPS: ${exif.GPSLatitude}, ${exif.GPSLongitude}`
  ].filter(Boolean);
  return fields.length ? fields.join(" | ") : null;
}

export default function AlbumFullSizeGallery({ photos }: { photos: AlbumPhoto[] }) {
  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: "#album-gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
      showHideAnimationType: 'zoom',
    });
    lightbox.init();
    return () => lightbox.destroy();
  }, []);

  if (!photos || photos.length === 0) return null;
  return (
    <div id="album-gallery" className="flex flex-col gap-12">
      {photos.map((photo) => (
        <div key={photo.id} className="w-full">
          <a
            href={photo.photo_url}
            data-pswp-width={photo.width || 1200}
            data-pswp-height={photo.height || 800}
            data-pswp-caption={photo.title || ''}
            data-pswp-exif={photo.exif_data ? exifToString(photo.exif_data) : ''}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              src={photo.photo_url}
              alt={photo.title || 'Album photo'}
              width={photo.width || 1200}
              height={photo.height || 800}
              className="w-full h-auto rounded-lg object-contain bg-background-light cursor-zoom-in"
              sizes="(max-width: 768px) 100vw, 800px"
              priority={false}
            />
          </a>
          {photo.title && (
            <div className="mt-2 text-center text-base opacity-70">{photo.title}</div>
          )}
          {photo.exif_data && (
            <div className="mt-1 text-center text-xs opacity-60">{exifToString(photo.exif_data)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
