'use client';

import { Control, Controller, UseFormRegister } from 'react-hook-form';

import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import InterestInput from '@/components/shared/InterestInput';
import Textarea from '@/components/shared/Textarea';
import type { AccountFormData } from '@/hooks/useAccountForm';
import CloseSVG from 'public/icons/close.svg';
import PlusIconSVG from 'public/icons/plus.svg';

interface PublicProfileSectionProps {
  register: UseFormRegister<AccountFormData>;
  control: Control<AccountFormData>;
  socialLinksFieldArray: {
    fields: Array<{ id: string }>;
    append: (value: { label: string; url: string }) => void;
    remove: (index: number) => void;
  };
  isSaving: boolean;
}

export default function PublicProfileSection({
  register,
  control,
  socialLinksFieldArray,
  isSaving,
}: PublicProfileSectionProps) {
  const { fields, append, remove } = socialLinksFieldArray;

  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70"
      >
        Your public profile
      </h2>
      <Container>
        <p
          className="text-foreground/60 mb-4 text-sm"
        >
          This information will be visible on your public profile page.
        </p>
        <div
          className="space-y-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="bio"
              className="text-sm font-medium"
            >
              Bio
            </label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="website"
              className="text-sm font-medium"
            >
              Website
            </label>
            <Input
              id="website"
              type="url"
              {...register('website')}
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Social Links */}
          <div
            className="flex flex-col gap-2"
          >
            <div
              className="flex items-center justify-between"
            >
              <label
                className="text-sm font-medium"
              >
                Social links
              </label>
              <span
                className="text-foreground/50 text-xs"
              >
                {fields.length}
                /3
              </span>
            </div>
            <p
              className="text-foreground/50 mb-2 text-xs"
            >
              Add up to 3 links to your social profiles
            </p>

            <div
              className="space-y-4"
            >
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border-border-color bg-background-light flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <Input
                    type="text"
                    {...register(`socialLinks.${index}.label`)}
                    placeholder="Label (e.g., Instagram)"
                    fullWidth={false}
                    className="w-full sm:w-1/3"
                  />
                  <Input
                    type="url"
                    {...register(`socialLinks.${index}.url`)}
                    placeholder="https://..."
                    fullWidth={false}
                    className="w-full sm:flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="danger"
                    aria-label="Remove link"
                    icon={<CloseSVG
                      className="size-4"
                    />}
                    className="w-full !px-2 !py-2 sm:w-auto"
                  >
                    <span
                      className="sm:hidden"
                    >
                      Remove
                    </span>
                  </Button>
                </div>
              ))}

              {fields.length < 3 && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<PlusIconSVG
                    className="size-4"
                  />}
                  onClick={() => append({ label: '', url: '' })}
                >
                  Add social link
                </Button>
              )}
            </div>
          </div>

          {/* Interests */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Interests
            </label>
            <Controller
              name="interests"
              control={control}
              render={({ field }) => (
                <InterestInput
                  id="interests"
                  interests={field.value || []}
                  onAddInterest={(interest) => {
                    const current = field.value || [];
                    if (!current.includes(interest) && current.length < 10) {
                      field.onChange([...current, interest]);
                    }
                  }}
                  onRemoveInterest={(interest) => {
                    const current = field.value || [];
                    field.onChange(current.filter((i) => i !== interest));
                  }}
                  maxInterests={10}
                  helperText="Add up to 10 interests to help others discover you. Click the input to see popular interests."
                  disabled={isSaving}
                />
              )}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
