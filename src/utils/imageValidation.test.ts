import { describe, expect, it } from 'vitest';

import { validateImageFile } from '@/utils/imageValidation';

function file(name: string, type: string, sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('validateImageFile', () => {
  it('accepts jpeg, png, gif, and webp', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validateImageFile(file('a.png', 'image/png'))).toBeNull();
    expect(validateImageFile(file('a.gif', 'image/gif'))).toBeNull();
    expect(validateImageFile(file('a.webp', 'image/webp'))).toBeNull();
  });

  it('accepts jpeg aliases and extension-only types', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpg'))).toBeNull();
    expect(validateImageFile(file('a.jpg', 'image/pjpeg'))).toBeNull();
    expect(validateImageFile(file('cover.JPG', ''))).toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateImageFile(file('a.heic', 'image/heic'))?.type).toBe('file_type');
    expect(validateImageFile(file('a.tif', ''))?.type).toBe('file_type');
  });

  it('rejects files over the size limit', () => {
    const error = validateImageFile(file('a.jpg', 'image/jpeg', 6 * 1024 * 1024), {
      maxSizeBytes: 5 * 1024 * 1024,
    });
    expect(error?.type).toBe('file_size');
    expect(error?.message).toMatch(/5 MB/);
  });
});
