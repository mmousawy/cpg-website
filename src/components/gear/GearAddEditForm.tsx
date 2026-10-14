'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { ModalContext } from '@/app/providers/ModalProvider';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import {
  userGearItemFormSchema,
  type UserGearItemFormValues,
} from '@/lib/gear/gearProfileSchema';
import {
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
  type GearCategory,
  type UserGearItem,
} from '@/lib/gear/types';

export const GEAR_ADD_EDIT_FORM_ID = 'gear-add-edit-form';

type GearAddEditFormProps = {
  initial?: UserGearItem | null;
  defaultCategory?: GearCategory;
  onSave: (item: UserGearItem) => void;
};

export default function GearAddEditForm({ initial, defaultCategory, onSave }: GearAddEditFormProps) {
  const modalContext = useContext(ModalContext);
  const isEditing = Boolean(initial);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserGearItemFormValues>({
    resolver: zodResolver(userGearItemFormSchema),
    defaultValues: {
      category: initial?.category ?? defaultCategory ?? 'camera_body',
      name: initial?.name ?? '',
      catalogId: initial?.catalogId ?? null,
      note: initial?.note ?? '',
    },
  });

  const category = useWatch({ control, name: 'category' });
  const name = useWatch({ control, name: 'name' });
  const catalogId = useWatch({ control, name: 'catalogId' });
  const note = useWatch({ control, name: 'note' });

  const { results, loading } = useGearCatalogSearch(name, category);
  const suggestions = useMemo(() => results.map((r) => r.name), [results]);
  const categoryOptions = useMemo(
    () => GEAR_CATEGORIES.map((c) => ({ value: c, label: GEAR_CATEGORY_LABELS[c] })),
    [],
  );

  const onSubmit = handleSubmit((data) => {
    const match = results.find((r) => r.name.toLowerCase() === data.name.toLowerCase());
    onSaveRef.current({
      id: initial?.id ?? crypto.randomUUID(),
      catalogId: match?.id ?? data.catalogId ?? catalogId,
      name: match?.name ?? data.name,
      category: data.category,
      note: data.note.trim(),
      addedAt: initial?.addedAt ?? Date.now(),
    });
  });

  const handleClose = useCallback(() => {
    modalContext.setIsOpen(false);
  }, [modalContext]);

  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end gap-2"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleCloseRef.current()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form={GEAR_ADD_EDIT_FORM_ID}
        >
          {isEditing ? 'Save' : 'Add item'}
        </Button>
      </div>
    ),
    [isEditing],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
    return () => {
      modalContext.setFooter(null);
    };
  }, [modalContext, footerContent]);

  return (
    <form
      id={GEAR_ADD_EDIT_FORM_ID}
      className="space-y-4"
      onSubmit={onSubmit}
    >
      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
          htmlFor="gear-category"
        >
          Type
        </label>
        <Select
          value={category}
          onValueChange={(v) => setValue('category', v as GearCategory, { shouldValidate: true })}
          options={categoryOptions}
          placeholder="Select type"
        />
      </div>

      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
          htmlFor="gear-name"
        >
          Name
        </label>
        <AutocompleteInput
          id="gear-name"
          value={name}
          error={!!errors.name}
          onChange={(v) => {
            setValue('name', v, { shouldValidate: true });
            setValue('catalogId', null);
          }}
          suggestions={suggestions}
          disableFilter
          loading={loading}
          placeholder="Search or type gear name"
          onSelect={(s) => {
            const hit = results.find((r) => r.name === s);
            setValue('name', s, { shouldValidate: true });
            setValue('catalogId', hit?.id ?? null);
          }}
        />
        {errors.name && (
          <p
            className="text-sm text-red-600 dark:text-red-400"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
          htmlFor="gear-note"
        >
          Note
          <span
            className="text-foreground/50 font-normal"
          >
            {' '}
            (optional)
          </span>
        </label>
        <Input
          id="gear-note"
          value={note}
          onChange={(e) => setValue('note', e.target.value)}
          placeholder="e.g. travel kit, borrowed"
        />
      </div>
    </form>
  );
}
