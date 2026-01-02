"use client";

import { useEffect } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import Image from "next/image";
import type { AlbumPhoto, AlbumPhotoExtended } from "@/types/albums";

function exifToString(exif: any) {
  if (!exif || typeof exif !== 'object') return null;
  const fields = [];
  if (exif.Make || exif.Model) fields.push(`${exif.Make || ''}${exif.Model ? ' ' + exif.Model : ''}`.trim());
  if (exif.LensModel) fields.push(exif.LensModel);
  if (exif.FNumber) fields.push(`ƒ/${exif.FNumber}`);
  if (exif.ExposureTime) fields.push(`1/${exif.ExposureTime >= 1 ? exif.ExposureTime : Math.round(1 / exif.ExposureTime)}s`);
  if (exif.ISO) fields.push(`ISO ${exif.ISO}`);
  if (exif.FocalLength) fields.push(`${exif.FocalLength}mm`);
  return fields.length ? fields.join(' · ') : null;
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
      {photos.map((photo: AlbumPhotoExtended) => {
        const exif = photo.image?.exif_data;
        const exifString = exifToString(exif);

        return (
          <div key={photo.id} className="group relative w-full">
            <a
              href={photo.photo_url}
              data-pswp-width={photo.width || 1200}
              data-pswp-height={photo.height || 800}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src={photo.photo_url}
                alt={photo.title || 'Album photo'}
                width={photo.width || 1200}
                height={photo.height || 800}
                className="w-full h-auto object-contain bg-background-light cursor-zoom-in"
                sizes="(max-width: 768px) 100vw, 800px"
                priority={false}
                unoptimized={true}
              />
            </a>
            {/* EXIF overlay on hover */}
            {exifString && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 py-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-center text-sm text-white/90">
                  {exifString}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
