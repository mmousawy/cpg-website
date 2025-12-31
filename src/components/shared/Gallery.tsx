'use client';

import { useEffect } from "react";
import Image from "next/image";
import PhotoSwipeLightbox from 'photoswipe/lightbox';

import useMasonry from "@/hooks/useMasonry";

import type { ImagesList } from "./About";

import 'photoswipe/style.css';

export default function Gallery({ images }: { images: ImagesList }) {
  const masonryContainer = useMasonry();

  useEffect(() => {
    let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
      gallery: '#gallery',
      children: 'a',
      pswpModule: () => import('photoswipe'),
    });

    lightbox.init();

    return () => {
      lightbox?.destroy();
      lightbox = null;
    };
  }, []);

  return (
    <div className="grid shrink-0 items-start gap-6 sm:grid-cols-2" id="gallery" ref={masonryContainer}>
      <div>
        <h2 className="mb-4 text-2xl font-bold leading-tight">What&apos;s Creative Photography Group?</h2>
        <p className="mb-5">
          We are a community of photographers who love to create and share our work with others. Our goal is to inspire and support each other in our photographic journeys. We welcome photographers of all skill levels and backgrounds to join us.
        </p>
        <p>
          Join our community for our monthly prompts, announcements, photo challenges, discussions and more!
        </p>
      </div>
      {images.map((image, index) => (
        <div key={index} data-image className="relative w-full overflow-hidden rounded-md opacity-0 transition-opacity duration-200">
          <a
            href={image.src}
            className="block size-full"
            data-pswp-width={image.width}
            data-pswp-height={image.height}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              src={image.src}
              alt=""
              width={400}
              height={500}
              className="size-full"
            />
          </a>
        </div>
      ))}
    </div>
  )
}
