'use client';

import RichTextEditor from '@/components/shared/RichTextEditor';
import { useEmailImageUpload } from '@/hooks/useEmailImageUpload';

export interface RichTextDescriptionFieldProps {
  label?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
}

/**
 * Drop-in form field that bundles a label with RichTextEditor and image upload.
 * Use for challenge prompts, event descriptions, album descriptions, etc.
 */
export function RichTextDescriptionField({
  label = 'Description',
  id = 'description',
  value,
  onChange,
  placeholder = 'Enter content...',
  disabled = false,
  error = false,
  required = false,
}: RichTextDescriptionFieldProps) {
  const uploadImage = useEmailImageUpload();

  return (
    <div
      className="flex flex-col gap-2"
    >
      <label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {label}
        {required && <span
          className="text-red-500"
        >
          {' '}
          *
        </span>}
      </label>
      <RichTextEditor
        id={id}
        value={value}
        onChange={onChange}
        onImageUpload={uploadImage}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
      />
    </div>
  );
}
