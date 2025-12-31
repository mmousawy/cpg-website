"use client";

import { useEffect } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import Image from "next/image";
import type { AlbumPhoto } from "@/types/albums";

function exifToString(exif: any) {
  if (!exif || typeof exif !== 'object') return null;
  const fields = [];
  if (exif.Make || exif.Model) fields.push(`Camera: ${exif.Make || ''}${exif.Model ? ' ' + exif.Model : ''}`.trim());
  if (exif.LensModel) fields.push(`Lens: ${exif.LensModel}`);
  if (exif.FNumber) fields.push(`Aperture: ƒ/${exif.FNumber}`);
  if (exif.ExposureTime) fields.push(`Shutter: 1/${exif.ExposureTime >= 1 ? exif.ExposureTime : (1 / exif.ExposureTime).toFixed(0)}`);
  if (exif.ISO) fields.push(`ISO: ${exif.ISO}`);
  if (exif.FocalLength) fields.push(`Focal: ${exif.FocalLength}mm`);
  if (exif.DateTimeOriginal) fields.push(`Taken: ${exif.DateTimeOriginal}`);
  if (exif.GPSLatitude && exif.GPSLongitude) fields.push(`GPS: ${exif.GPSLatitude}, ${exif.GPSLongitude}`);
  return fields.length ? fields.join(' | ') : null;
}

export default function AlbumFullSizeGallery({ photos }: { photos: AlbumPhoto[] }) {
  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: "#album-gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
      showHideAnimationType: 'zoom',
    });

    // Register custom caption element
    lightbox.on('uiRegister', function () {
      lightbox.pswp?.ui?.registerElement({
        name: 'custom-caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        html: '',
        onInit: (el, pswp) => {
          pswp.on('change', () => {
            const currSlideElement = pswp.currSlide?.data?.element;
            let captionHTML = '';
            if (currSlideElement) {
              const hiddenCaption = currSlideElement.querySelector('.hidden-caption-content');
              if (hiddenCaption) {
                captionHTML = hiddenCaption.innerHTML;
              } else {
                // fallback to alt attribute
                const img = currSlideElement.querySelector('img');
                captionHTML = img?.getAttribute('alt') || '';
              }
            }
            el.innerHTML = captionHTML || '';
          });
        }
      });
    });

    lightbox.init();
    return () => lightbox.destroy();
  }, []);

  if (!photos || photos.length === 0) return null;
  return (
    <div id="album-gallery" className="flex flex-col gap-12">
      {photos.map((photo) => {
        const exif = photo.image?.exif_data;
        return (
          <div key={photo.id} className="w-full">
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
                className="w-full h-auto rounded-lg object-contain bg-background-light cursor-zoom-in"
                sizes="(max-width: 768px) 100vw, 800px"
                priority={false}
                unoptimized={true}
              />
              {/* Hidden caption content for PhotoSwipe accessibility and overlay */}
              <div className="hidden-caption-content" style={{ display: 'none' }}>
                {photo.title && (
                  <div style={{ fontSize: '1.1em', fontWeight: 500 }}>{photo.title}</div>
                )}
                {exif && (
                  <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{exifToString(exif)}</div>
                )}
              </div>
            </a>
            {photo.title && (
              <div className="mt-2 text-center text-base opacity-70">{photo.title}</div>
            )}
            {exif && (
              <div className="mt-1 text-center text-xs opacity-60">{exifToString(exif)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
