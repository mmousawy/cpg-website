import Gallery from "./Gallery";
import PageContainer from "@/components/layout/PageContainer";
import getImgDimensions from '@/utils/utils';

export type ImagesList = Array<{ src: string, width?: number, height?: number }>;

const images: ImagesList = [
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20241214-DC4A4299.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20241214-DC4A4301.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20241214-DC4A4303.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20250125-DC4A4703.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20241214-DC4A4306.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20250125-DC4A4713.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20250125-DC4A4744.jpg' },
  { src: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/gallery/Murtada-al-Mousawy-20250125-DC4A4738.jpg' },
];

const enrichedImages = await Promise.all(
  images?.map(async (image) => {
    const dimensions = await getImgDimensions(image.src);

    return {
      src: image.src,
      width: dimensions.width,
      height: dimensions.height,
    };
  }) ?? []
);

export default function About() {
  return (
    <PageContainer variant="alt" className="mt-auto">
      <Gallery images={enrichedImages} />
    </PageContainer>
  );
}
