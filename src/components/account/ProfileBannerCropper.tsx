'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import {
  clampCropPosition,
  computeClampedCroppedAreaPixels,
  CROPPER_ZOOM_EPSILON,
  getBoundedCropDrawParams,
  getEffectiveMediaSize,
  getWidthFitZoom,
} from '@/components/account/cropperSizing';
import Button from '@/components/shared/Button';
import Cropper, { type Area, type MediaSize, type Point, type Size } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

/** Output aspect for profile banner crops (width / height) */
const BANNER_CROP_ASPECT = 3.2;

type ProfileBannerCropperProps = {
  imageSrc: string;
  onDismiss: () => void;
  onCancel: () => void;
  onApply: (croppedFile: File, croppedPreviewUrl: string) => void;
};

function getBannerCropSize(containerWidth: number): Size {
  return {
    width: containerWidth,
    height: containerWidth / BANNER_CROP_ASPECT,
  };
}

async function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = src;
  });
}

async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create canvas context');
  }

  const { outputWidth, outputHeight, source, dest } = getBoundedCropDrawParams(
    pixelCrop,
    image.naturalWidth,
    image.naturalHeight,
  );

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  if (source.width > 0 && source.height > 0) {
    const scaleX = outputWidth / pixelCrop.width;
    const scaleY = outputHeight / pixelCrop.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      dest.x,
      dest.y,
      source.width * scaleX,
      source.height * scaleY,
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to crop image'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

export default function ProfileBannerCropper({
  imageSrc,
  onDismiss,
  onCancel,
  onApply,
}: ProfileBannerCropperProps) {
  const modalContext = useContext(ModalContext);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [isCropperReady, setIsCropperReady] = useState(false);
  const hasInitializedZoom = useRef(false);
  const prevCropWidthRef = useRef(0);
  const cropperAreaRef = useRef<HTMLDivElement>(null);

  const cropSize = useMemo(
    () => (containerWidth > 0 ? getBannerCropSize(containerWidth) : null),
    [containerWidth],
  );

  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(newZoom, minZoom);
    setZoom(clampedZoom);
    if (clampedZoom <= minZoom + CROPPER_ZOOM_EPSILON) {
      setCrop((current) => ({ x: 0, y: current.y }));
    }
  }, [minZoom]);

  const handleZoomSliderChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    handleZoomChange(Number(event.target.value));
  }, [handleZoomChange]);

  const handleApplyRef = useRef<() => Promise<void>>(async () => {});
  const handleCancelRef = useRef(onCancel);
  const handleDismissRef = useRef(onDismiss);

  useEffect(() => {
    hasInitializedZoom.current = false;
    prevCropWidthRef.current = 0;
    setMediaSize(null);
    setContainerWidth(0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setIsCropperReady(false);
  }, [imageSrc]);

  const croppedAreaPixels = useMemo(() => {
    if (!mediaSize || !cropSize) {
      return null;
    }

    return computeClampedCroppedAreaPixels(
      crop,
      mediaSize,
      cropSize,
      cropSize.width,
      BANNER_CROP_ASPECT,
      zoom,
    );
  }, [crop, zoom, mediaSize, cropSize]);

  useLayoutEffect(() => {
    const element = cropperAreaRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [imageSrc]);

  useLayoutEffect(() => {
    if (!mediaSize || !cropSize) {
      return;
    }

    const effectiveMedia = getEffectiveMediaSize(mediaSize, cropSize.width);
    const widthFitZoom = getWidthFitZoom(effectiveMedia, cropSize);

    setMinZoom((currentMinZoom) => (
      Math.abs(currentMinZoom - widthFitZoom) <= CROPPER_ZOOM_EPSILON ? currentMinZoom : widthFitZoom
    ));

    if (!hasInitializedZoom.current) {
      hasInitializedZoom.current = true;
      prevCropWidthRef.current = cropSize.width;
      setZoom(widthFitZoom);
      setCrop({ x: 0, y: 0 });
      setIsCropperReady(true);
      return;
    }

    if (prevCropWidthRef.current !== cropSize.width) {
      prevCropWidthRef.current = cropSize.width;
      setZoom((currentZoom) => Math.max(currentZoom, widthFitZoom));
    }
  }, [mediaSize, cropSize]);

  const handleCropChange = useCallback((position: Point) => {
    if (!mediaSize || !cropSize) {
      setCrop(position);
      return;
    }

    const atMinZoom = zoom <= minZoom + CROPPER_ZOOM_EPSILON;
    setCrop(clampCropPosition(position, mediaSize, cropSize, cropSize.width, zoom, { lockX: atMinZoom }));
  }, [zoom, minZoom, mediaSize, cropSize]);

  const handleMediaSize = useCallback((media: MediaSize) => {
    setMediaSize(media);
  }, []);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels || isApplying) {
      return;
    }

    setIsApplying(true);

    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      const croppedFile = new File([blob], `banner-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const croppedPreviewUrl = URL.createObjectURL(croppedFile);
      onApply(croppedFile, croppedPreviewUrl);
    } catch (error) {
      console.error('Failed to crop banner image:', error);
    } finally {
      setIsApplying(false);
    }
  }, [croppedAreaPixels, imageSrc, isApplying, onApply]);

  useEffect(() => {
    handleApplyRef.current = handleApply;
    handleCancelRef.current = onCancel;
    handleDismissRef.current = onDismiss;
  }, [handleApply, onCancel, onDismiss]);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(() => {
      if (isApplying) {
        return false;
      }
      handleDismissRef.current();
      return true;
    });
    return () => modalContext.setBeforeCloseCheck(null);
  }, [modalContext, isApplying]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end gap-2"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleCancelRef.current()}
          disabled={isApplying}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleApplyRef.current()}
          disabled={!croppedAreaPixels || isApplying || !isCropperReady}
          loading={isApplying}
        >
          Apply
        </Button>
      </div>
    ),
    [croppedAreaPixels, isApplying, isCropperReady],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [modalContext, footerContent]);

  return (
    <div
      className="space-y-4"
    >
      <p
        className="text-sm text-foreground/70"
      >
        Drag to position your banner. The preview is unsaved until you click Apply, and still requires Save changes on the account form.
      </p>

      <div
        className="overflow-hidden rounded-xl border border-border-color"
      >
        <div
          className="relative w-full min-h-64 aspect-[3.2/1] bg-black/40"
        >
          <div
            ref={cropperAreaRef}
            className={isCropperReady ? 'absolute inset-0' : 'absolute inset-0 invisible'}
          >
            {cropSize && (
              <Cropper
                key={imageSrc}
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={BANNER_CROP_ASPECT}
                cropSize={cropSize}
                objectFit="horizontal-cover"
                minZoom={minZoom}
                maxZoom={3}
                zoomSpeed={0.2}
                cropShape="rect"
                showGrid={false}
                restrictPosition={false}
                onCropChange={handleCropChange}
                onZoomChange={handleZoomChange}
                setMediaSize={handleMediaSize}
                onMediaLoaded={handleMediaSize}
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="banner-zoom"
          className="mb-2 block text-sm font-medium"
        >
          Zoom
        </label>
        <input
          id="banner-zoom"
          type="range"
          min={minZoom}
          max={3}
          step={0.01}
          value={zoom}
          onChange={handleZoomSliderChange}
          className="w-full"
          disabled={!isCropperReady}
        />
      </div>
    </div>
  );
}
