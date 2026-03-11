'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useRouter } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import { routes } from '@/config/routes';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useFormChanges } from '@/hooks/useFormChanges';
import { useSubmitSceneEvent } from '@/hooks/useSceneEvents';
import type { SceneEventCategory, SceneEventFormData } from '@/types/scene';
import { SCENE_EVENT_CATEGORIES } from '@/types/scene';

import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import { confirmUnsavedChanges } from '@/utils/confirmHelpers';

import { RichTextDescriptionField } from '@/components/shared/RichTextDescriptionField';
import CheckCircleSVG from 'public/icons/check-circle.svg';

const STEPS = ['Event', 'Date & location'] as const;
type Step = 0 | 1;

const CATEGORY_OPTIONS = SCENE_EVENT_CATEGORIES.map(({ value, label }) => ({
  value,
  label,
  icon: (
    <SceneCategoryIcon
      category={value}
      className="size-5 fill-current"
    />
  ),
}));

export default function AddSceneEventModal() {
  const router = useRouter();
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const submitMutation = useSubmitSceneEvent();
  const [step, setStep] = useState<Step>(0);
  const initialValues: Partial<SceneEventFormData> = useMemo(
    () => ({
      title: '',
      category: 'exhibition',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      location_name: '',
      location_city: '',
      location_address: '',
      url: '',
      description: '',
      organizer: '',
      price_info: '',
    }),
    [],
  );

  const [formData, setFormData] = useState<Partial<SceneEventFormData>>(initialValues);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const skipCloseCheckRef = useRef(false);

  const { hasChanges } = useFormChanges(formData, initialValues, {
    richTextFields: ['description'],
    skipSync: submitSuccess,
  });

  const handleNextRef = useRef<(() => void) | null>(null);
  const handleBackRef = useRef<(() => void) | null>(null);
  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const canAdvanceFrom = useCallback((s: Step): boolean => {
    if (s === 0) {
      return !!(
        formData.title?.trim() &&
        formData.category &&
        formData.url?.trim()
      );
    }
    if (s === 1) {
      return !!(
        formData.start_date &&
        formData.location_name?.trim() &&
        formData.location_city?.trim()
      );
    }
    return true;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (step < 1 && canAdvanceFrom(step)) setStep((step + 1) as Step);
  }, [step, canAdvanceFrom]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((step - 1) as Step);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    const required = ['title', 'category', 'start_date', 'location_name', 'location_city', 'url'];
    for (const field of required) {
      const val = formData[field as keyof SceneEventFormData];
      if (!val || (typeof val === 'string' && !val.trim())) {
        submitMutation.reset();
        return;
      }
    }

    const data: SceneEventFormData = {
      title: formData.title!.trim(),
      category: formData.category as SceneEventCategory,
      start_date: formData.start_date!,
      end_date: formData.end_date?.trim() || undefined,
      start_time: formData.start_time?.trim() || undefined,
      end_time: formData.end_time?.trim() || undefined,
      location_name: formData.location_name!.trim(),
      location_city: formData.location_city!.trim(),
      location_address: formData.location_address?.trim() || undefined,
      url: formData.url!.trim(),
      description: formData.description?.trim() || undefined,
      organizer: formData.organizer?.trim() || undefined,
      price_info: formData.price_info?.trim() || undefined,
    };

    try {
      const result = await submitMutation.mutateAsync(data);
      skipCloseCheckRef.current = true;
      setSubmitSuccess(true);
      setHasUnsavedChanges(false);
      modalContext.setIsOpen(false);
      router.push(`${routes.scene.url}/${result.event.slug}`);
    } catch {
      // Error is shown via submitMutation.error
    }
  }, [formData, submitMutation, modalContext, router, setHasUnsavedChanges]);

  const isSubmitting = submitMutation.isPending;

  useEffect(() => {
    handleNextRef.current = handleNext;
    handleBackRef.current = handleBack;
    handleSubmitRef.current = handleSubmit;
  }, [handleNext, handleBack, handleSubmit]);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(async () => {
      if (skipCloseCheckRef.current) {
        skipCloseCheckRef.current = false;
        return true;
      }
      if (!hasChanges) return true;
      const confirmed = await confirm(confirmUnsavedChanges());
      if (confirmed) setHasUnsavedChanges(false);
      return confirmed;
    });
    return () => modalContext.setBeforeCloseCheck(null);
  }, [modalContext, hasChanges, confirm, setHasUnsavedChanges]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex items-center justify-between"
      >
        <div>
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => handleBackRef.current?.()}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
        </div>
        <div
          className="flex gap-2"
        >
          {step < 1 ? (
            <Button
              variant="primary"
              onClick={() => handleNextRef.current?.()}
              disabled={!canAdvanceFrom(step)}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmitRef.current?.()}
              loading={isSubmitting}
              disabled={isSubmitting}
              icon={<CheckCircleSVG
                className="h-5 w-5"
              />}
            >
              Add event
            </Button>
          )}
        </div>
      </div>
    ),
    [step, isSubmitting, canAdvanceFrom],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [modalContext, footerContent]);

  return (
    <div>
      {/* Step indicators — sticky so they stay visible while content scrolls */}
      <div
        className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-3 bg-background-light border-b border-border-color-strong"
      >
        <div
          className="absolute -bottom-[17px] left-0 right-0 h-4 bg-linear-to-b from-background-light to-transparent pointer-events-none"
        />
        <div
          className="flex items-center gap-1"
        >
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
              if (i < step || (i > step && canAdvanceFrom(step))) {
                setStep(i as Step);
              }
              }}
              className="flex items-center gap-1 group"
            >
              <span
                className={`flex items-center justify-center size-6 rounded-full text-xs font-semibold transition-colors ${
                i === step
                  ? 'bg-primary text-white'
                  : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-foreground/10 text-foreground/40'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span
                className={`text-sm font-medium transition-colors ${
                i === step
                  ? 'text-foreground'
                  : i < step
                    ? 'text-foreground/60'
                    : 'text-foreground/40'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className="mx-1.5 h-px w-5 bg-border-color"
                />
            )}
            </button>
        ))}
        </div>
      </div>

      <div
        className="pt-3"
      >
        {submitMutation.isError && (
          <ErrorMessage>
            {submitMutation.error?.message}
          </ErrorMessage>
      )}

        {/* Step 0: Event */}
        {step === 0 && (
          <div
            className="space-y-4"
          >
            <div
              className="flex flex-col gap-1"
            >
              <label
                htmlFor="scene-title"
                className="text-sm font-medium"
              >
                Title
                {' '}
                <span
                  className="text-red-500"
                >
                  *
                </span>
              </label>
              <Input
                id="scene-title"
                name="title"
                type="text"
                maxLength={200}
                value={formData.title ?? ''}
                onChange={handleChange}
                placeholder="e.g. World Press Photo 2026"
              />
            </div>

            <div
              className="flex flex-col gap-1"
            >
              <label
                htmlFor="scene-url"
                className="text-sm font-medium"
              >
                Event page URL
                {' '}
                <span
                  className="text-red-500"
                >
                  *
                </span>
              </label>
              <Input
                id="scene-url"
                name="url"
                type="url"
                value={formData.url ?? ''}
                onChange={handleChange}
                placeholder="https://..."
              />
              <p
                className="text-xs text-foreground/50"
              >
                Link to the official event page, ticket site, or listing
              </p>
            </div>

            <div
              className="flex flex-col gap-1"
            >
              <label
                className="text-sm font-medium"
              >
                Category
                {' '}
                <span
                  className="text-red-500"
                >
                  *
                </span>
              </label>
              <Select
                value={formData.category ?? 'exhibition'}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, category: val as SceneEventCategory }))}
                options={CATEGORY_OPTIONS}
              />
            </div>

            <RichTextDescriptionField
              label="Description"
              id="scene-description"
              value={formData.description ?? ''}
              onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              placeholder="What can people expect?"
              minimalToolbar
              className="[&_.ql-editor]:min-h-20"
            />

            <div
              className="grid grid-cols-2 gap-3"
            >
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-organizer"
                  className="text-sm font-medium"
                >
                  Organizer
                  {' '}
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                </label>
                <Input
                  id="scene-organizer"
                  name="organizer"
                  type="text"
                  value={formData.organizer ?? ''}
                  onChange={handleChange}
                />
              </div>
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-price"
                  className="text-sm font-medium"
                >
                  Price
                  {' '}
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                </label>
                <Input
                  id="scene-price"
                  name="price_info"
                  type="text"
                  value={formData.price_info ?? ''}
                  onChange={handleChange}
                  placeholder="Free"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Date & location */}
        {step === 1 && (
          <div
            className="space-y-4"
          >
            <div
              className="grid grid-cols-2 gap-3"
            >
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-start-date"
                  className="text-sm font-medium"
                >
                  Start date
                  {' '}
                  <span
                    className="text-red-500"
                  >
                    *
                  </span>
                </label>
                <Input
                  id="scene-start-date"
                  name="start_date"
                  type="date"
                  value={formData.start_date ?? ''}
                  onChange={handleChange}
                />
              </div>
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-start-time"
                  className="text-sm font-medium"
                >
                  Start time
                  {' '}
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                </label>
                <Input
                  id="scene-start-time"
                  name="start_time"
                  type="time"
                  value={formData.start_time ?? ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div
              className="grid grid-cols-2 gap-3"
            >
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-end-date"
                  className="text-sm font-medium"
                >
                  End date
                  {' '}
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                </label>
                <Input
                  id="scene-end-date"
                  name="end_date"
                  type="date"
                  value={formData.end_date ?? ''}
                  onChange={handleChange}
                />
              </div>
              <div
                className="flex flex-col gap-1"
              >
                <label
                  htmlFor="scene-end-time"
                  className="text-sm font-medium"
                >
                  End time
                  {' '}
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                </label>
                <Input
                  id="scene-end-time"
                  name="end_time"
                  type="time"
                  value={formData.end_time ?? ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div
              className="flex flex-col gap-1"
            >
              <label
                htmlFor="scene-location-name"
                className="text-sm font-medium"
              >
                Venue name
                {' '}
                <span
                  className="text-red-500"
                >
                  *
                </span>
              </label>
              <Input
                id="scene-location-name"
                name="location_name"
                type="text"
                value={formData.location_name ?? ''}
                onChange={handleChange}
                placeholder="e.g. Foam Museum"
              />
            </div>

            <div
              className="flex flex-col gap-1"
            >
              <label
                htmlFor="scene-location-city"
                className="text-sm font-medium"
              >
                City
                {' '}
                <span
                  className="text-red-500"
                >
                  *
                </span>
              </label>
              <Input
                id="scene-location-city"
                name="location_city"
                type="text"
                value={formData.location_city ?? ''}
                onChange={handleChange}
                placeholder="e.g. Amsterdam"
              />
            </div>

            <div
              className="flex flex-col gap-1"
            >
              <label
                htmlFor="scene-location-address"
                className="text-sm font-medium"
              >
                Street address
                {' '}
                <span
                  className="ml-1.5 text-xs font-normal text-foreground/50"
                >
                  (optional)
                </span>
              </label>
              <Input
                id="scene-location-address"
                name="location_address"
                type="text"
                value={formData.location_address ?? ''}
                onChange={handleChange}
                placeholder="e.g. Keizersgracht 609"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
