'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type ReactQuillType from 'react-quill-new';

const ReactQuill = dynamic(
  () => import('react-quill-new').then((mod) => {
    const Quill = (mod.default as any).Quill || (mod as any).Quill;
    if (Quill) {
      const BaseImage = Quill.import('formats/image') as any;
      class StyledImage extends BaseImage {
        static formats(domNode: HTMLElement) {
          const formats: Record<string, string> = {};
          const width = domNode.getAttribute('width');
          if (width) formats.width = width;
          const cls = domNode.getAttribute('class');
          if (cls) formats['class'] = cls;
          const style = domNode.getAttribute('style');
          if (style) formats.style = style;
          return formats;
        }

        format(name: string, value: string) {
          if (name === 'width' || name === 'class' || name === 'style') {
            if (value) {
              (this as any).domNode.setAttribute(name, value);
            } else {
              (this as any).domNode.removeAttribute(name);
            }
          } else {
            super.format(name, value);
          }
        }
      }
      StyledImage.blotName = 'image';
      StyledImage.tagName = 'IMG';
      Quill.register('formats/image', StyledImage, true);
    }

    const RQ = mod.default;
    type RQProps = React.ComponentProps<typeof RQ>;
    const QuillWithRef = ({ forwardedRef, ...props }: RQProps & { forwardedRef?: React.RefObject<ReactQuillType | null> }) => (
      <RQ
        ref={forwardedRef}
        {...props}
      />
    );
    QuillWithRef.displayName = 'ReactQuillWithRef';
    return QuillWithRef;
  }),
  { ssr: false },
);

const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline'],
  [{ header: [2, 3, false] }],
  ['link', 'image'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

const IMAGE_SIZES = [
  { label: 'S', width: 128 },
  { label: 'M', width: 256 },
  { label: 'L', width: 320 },
  { label: 'Full', width: 0 },
] as const;

type ImageAlign = 'left' | 'center' | 'right';

const IMAGE_ALIGNMENTS: { label: string; value: ImageAlign; icon: string }[] = [
  { label: 'Left', value: 'left', icon: '←' },
  { label: 'Center', value: 'center', icon: '↔' },
  { label: 'Right', value: 'right', icon: '→' },
];

const ALIGN_CLASSES: Record<ImageAlign, string> = {
  'left': 'img-align-left',
  'center': 'img-align-center',
  'right': 'img-align-right',
};

function getAlignFromClass(img: HTMLImageElement): ImageAlign {
  for (const [align, cls] of Object.entries(ALIGN_CLASSES)) {
    if (img.classList.contains(cls)) return align as ImageAlign;
  }
  return 'center';
}

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

function isEmptyContent(html: string): boolean {
  if (!html || !html.trim()) return true;
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped === '';
}


function ImageSizeToolbar({
  target,
  wrapperRef,
  onResize,
  onAlign,
  onClose,
}: {
  target: HTMLImageElement;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onResize: (img: HTMLImageElement, width: number) => void;
  onAlign: (img: HTMLImageElement, align: ImageAlign) => void;
  onClose: () => void;
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const imgRect = target.getBoundingClientRect();
    setPos({
      top: imgRect.top - wrapperRect.top + wrapper.scrollTop - 4,
      left: imgRect.left - wrapperRect.left + imgRect.width / 2,
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        e.target !== target
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [target, wrapperRef, onClose]);

  const currentWidth = target.getAttribute('width');
  const currentAlign = getAlignFromClass(target);

  if (!pos) return null;

  return (
    <div
      ref={toolbarRef}
      className="rte-image-size-toolbar"
      style={{ top: pos.top, left: pos.left }}
    >
      {IMAGE_SIZES.map((size) => (
        <button
          key={size.label}
          type="button"
          className={clsx(
            'rte-image-size-btn',
            (size.width === 0 && !currentWidth) ||
            currentWidth === String(size.width)
              ? 'rte-image-size-btn--active'
              : undefined,
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onResize(target, size.width);
          }}
        >
          {size.label}
        </button>
      ))}
      <span
        className="rte-image-toolbar-sep"
      />
      {IMAGE_ALIGNMENTS.map((align) => (
        <button
          key={align.value}
          type="button"
          title={align.label}
          className={clsx(
            'rte-image-size-btn',
            currentAlign === align.value && 'rte-image-size-btn--active',
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onAlign(target, align.value);
          }}
        >
          {align.icon}
        </button>
      ))}
    </div>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  onImageUpload,
  placeholder = 'Enter content...',
  disabled = false,
  error = false,
  className,
}: RichTextEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<ReactQuillType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [sourceView, setSourceView] = useState(false);

  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const uploadingRef = useRef(new Set<string>());

  const uploadBase64Images = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const imgs = quill.root.querySelectorAll('img[src^="data:"]');
    imgs.forEach(async (img) => {
      const imgEl = img as HTMLImageElement;
      const src = imgEl.src;
      if (uploadingRef.current.has(src)) return;
      uploadingRef.current.add(src);
      imgEl.style.opacity = '0.5';

      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const ext = blob.type.split('/')[1]?.replace('+xml', '') || 'png';
        const file = new File([blob], `pasted-image.${ext}`, { type: blob.type });

        const uploadFn = onImageUploadRef.current;
        if (!uploadFn) return;
        const url = await uploadFn(file);

        if (url && imgEl.parentNode) {
          imgEl.src = url;
        } else if (imgEl.parentNode) {
          imgEl.remove();
        }
      } catch {
        if (imgEl.parentNode) imgEl.remove();
      } finally {
        imgEl.style.opacity = '';
        uploadingRef.current.delete(src);
        if (quill.root) {
          onChangeRef.current(quill.root.innerHTML);
        }
      }
    });
  }, []);

  const handleChange = useCallback((content: string) => {
    onChange(content);
    uploadBase64Images();
  }, [onChange, uploadBase64Images]);

  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url);
    quill.setSelection(range.index + 1, 0);
  }, []);

  const imageHandler = useCallback(() => {
    if (onImageUpload) {
      fileInputRef.current?.click();
    } else {
      const url = prompt('Enter image URL:');
      if (url) insertImage(url);
    }
  }, [onImageUpload, insertImage]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    e.target.value = '';

    const url = await onImageUpload(file);
    if (url) insertImage(url);
  }, [onImageUpload, insertImage]);

  const syncQuill = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    // Tell Quill to re-read the DOM so its delta matches our changes
    quill.update('user');
    onChange(quill.root.innerHTML);
  }, [onChange]);

  const handleImageResize = useCallback((img: HTMLImageElement, width: number) => {
    if (width === 0) {
      img.removeAttribute('width');
      img.style.width = '';
    } else {
      img.setAttribute('width', String(width));
      img.style.width = `${width}px`;
    }
    syncQuill();
  }, [syncQuill]);

  const handleImageAlign = useCallback((img: HTMLImageElement, align: ImageAlign) => {
    Object.values(ALIGN_CLASSES).forEach((cls) => img.classList.remove(cls));
    img.classList.add(ALIGN_CLASSES[align]);
    syncQuill();
  }, [syncQuill]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setSelectedImage(target as HTMLImageElement);
    } else {
      setSelectedImage(null);
    }
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: TOOLBAR_OPTIONS,
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]);

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        'rich-text-editor',
        error && 'rich-text-editor--error',
        sourceView && 'rich-text-editor--source',
        className,
      )}
      onClick={sourceView ? undefined : handleEditorClick}
    >
      {sourceView ? (
        <textarea
          className="rte-source-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
        />
      ) : (
        <>
          <ReactQuill
            forwardedRef={quillRef}
            id={id}
            theme="snow"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={disabled}
            modules={modules}
            formats={[
              'bold',
              'italic',
              'underline',
              'header',
              'link',
              'image',
              'list',
              'blockquote',
            ]}
          />
          {selectedImage && (
            <ImageSizeToolbar
              target={selectedImage}
              wrapperRef={wrapperRef}
              onResize={handleImageResize}
              onAlign={handleImageAlign}
              onClose={() => setSelectedImage(null)}
            />
          )}
        </>
      )}
      <button
        type="button"
        className="rte-source-toggle"
        onClick={() => {
          setSelectedImage(null);
          if (!sourceView) {
            const cleaned = value
              .replace(/&nbsp;/g, ' ')
              .replace(/(<\/(?:p|h[1-6]|ul|ol|li|blockquote|div|hr)>)/gi, '$1\n')
              .replace(/^\n+|\n+$/g, '');
            onChange(cleaned);
          }
          setSourceView((v) => !v);
        }}
        title={sourceView ? 'Visual editor' : 'HTML source'}
      >
        {sourceView ? '✎' : '</>'}
      </button>
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}
    </div>
  );
}

export { isEmptyContent };
export default RichTextEditor;
