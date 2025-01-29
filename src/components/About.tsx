import sizeOf from 'image-size';

import Gallery from "./Gallery";

export type ImagesList = Array<{src: string, width?: number, height?: number }>;

const images: ImagesList = [
  { src: '/gallery/Murtada-al-Mousawy-20241214-DC4A4299.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20241214-DC4A4301.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20241214-DC4A4303.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20250125-DC4A4703.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20241214-DC4A4306.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20250125-DC4A4713.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20250125-DC4A4744.jpg' },
  { src: '/gallery/Murtada-al-Mousawy-20250125-DC4A4738.jpg' },
];

images.forEach(image => {
  const dimensions = sizeOf(`public/${image.src}`);

  image.width = dimensions.width;
  image.height = dimensions.height;
});

export default function About() {
  return (
    <section className="mt-auto flex justify-center border-t-[0.0625rem] border-t-border-color bg-background-light px-6 py-7 text-foreground sm:p-12">
      <div className="w-full max-w-screen-md gap-6">
        <Gallery images={images} />
      </div>
    </section>
  );
}
