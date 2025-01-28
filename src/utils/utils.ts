import { redirect } from "next/navigation";
import https from 'https';
import sizeOf from 'image-size';
import { ISizeCalculationResult } from "image-size/dist/types/interface";

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

export default async function getImgDimensions(url: string): Promise<ISizeCalculationResult> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Uint8Array[] = [];

      response
        .on('data', (chunk) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const dimensions = sizeOf(buffer);
            resolve(dimensions); // Resolves with the dimensions
          } catch (error) {
            reject(error); // Rejects if there's an error in sizeOf
          }
        })
        .on('error', (err) => {
          reject(err); // Rejects if there's an error in the response
        });
    }).on('error', (err) => {
      reject(err); // Rejects if there's an error in the https request
    });
  });
}
