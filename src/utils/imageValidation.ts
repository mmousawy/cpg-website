const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Cap at ~33 MP (8K resolution: 7680×4320 ≈ 33.2 MP).
// imgproxy must be configured with IMGPROXY_MAX_SRC_RESOLUTION >= 33.
const MAX_PIXELS = 33_000_000;

interface ImageValidationOptions {
  maxSizeBytes?: number;
  maxPixels?: number;
  allowedTypes?: string[];
}

interface ImageValidationError {
  type: 'file_type' | 'file_size' | 'resolution';
  message: string;
}

/**
 * Validate an image file's type and size synchronously.
 * Returns an error object or null if valid.
 */
export function validateImageFile(
  file: File,
  options: Pick<ImageValidationOptions, 'maxSizeBytes' | 'allowedTypes'> = {},
): ImageValidationError | null {
  const {
    maxSizeBytes = 10 * 1024 * 1024,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = options;

  if (!allowedTypes.includes(file.type)) {
    return {
      type: 'file_type',
      message: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)',
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      type: 'file_size',
      message: `Image must be smaller than ${maxMB} MB`,
    };
  }

  return null;
}

/**
 * Check image resolution by loading it in a browser Image element.
 * Returns an error if the image exceeds the max pixel count.
 */
export async function validateImageResolution(
  file: File,
  options: Pick<ImageValidationOptions, 'maxPixels'> = {},
): Promise<ImageValidationError | null> {
  const { maxPixels = MAX_PIXELS } = options;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = url;
    });

    const totalPixels = img.width * img.height;
    if (totalPixels > maxPixels) {
      const megapixels = Math.round(totalPixels / 1_000_000);
      const maxMP = Math.round(maxPixels / 1_000_000);
      return {
        type: 'resolution',
        message: `Image resolution too high (${megapixels} MP). Maximum is ${maxMP} MP — please resize before uploading.`,
      };
    }

    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Full image validation: type, size, and resolution.
 */
export async function validateImage(
  file: File,
  options: ImageValidationOptions = {},
): Promise<ImageValidationError | null> {
  const fileError = validateImageFile(file, options);
  if (fileError) return fileError;

  return validateImageResolution(file, options);
}
