import { redirect } from "next/navigation";
import https from 'https';
import sizeOf from 'image-size';

export type ImageDimensions = {
  width: number;
  height: number;
  orientation?: number;
  type?: string;
};

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

/**
 * Format a date as "joined X days/months/years ago"
 */
export function formatJoinedDate(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return 'joined today';
  } else if (diffDays < 30) {
    return `joined ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `joined ${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `joined ${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

export default async function getImgDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      const MAX_BYTES = 80000;

      response.on('data', (chunk) => {
        if (receivedBytes >= MAX_BYTES) return; // Stop processing new data

        const remainingBytes = MAX_BYTES - receivedBytes;
        chunks.push(chunk.slice(0, remainingBytes)); // Only take what’s needed
        receivedBytes += chunk.length;

        if (receivedBytes >= MAX_BYTES) {
          response.destroy(); // Stop receiving further data

          try {
            const buffer = Buffer.concat(chunks);
            const dimensions = sizeOf(buffer);
            resolve(dimensions); // Resolve immediately after getting enough data
          } catch (error) {
            reject(error);
          }
        }
      });

      response.on('error', (err) => reject(err));
      response.on('end', () => {
        if (receivedBytes < MAX_BYTES) {
          try {
            const buffer = Buffer.concat(chunks);
            const dimensions = sizeOf(buffer);
            resolve(dimensions);
          } catch (error) {
            reject(error);
          }
        }
      });
    }).on('error', (err) => reject(err));
  });
}
