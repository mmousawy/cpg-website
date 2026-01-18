'use client';

import clsx from 'clsx';
import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';

interface OnboardingProfileSectionProps {
  register: any;
  errors: any;
  displayAvatarUrl: string | null | undefined;
  displayName: string | null | undefined;
  avatarFile: File | null;
  avatarError: string | null;
  isSaving: boolean;
  isOAuthUser: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  profileAvatarUrl: string | null | undefined;
  removeAvatar: boolean;
}

export default function OnboardingProfileSection({
  register,
  errors,
  displayAvatarUrl,
  displayName,
  avatarFile,
  avatarError,
  isSaving,
  isOAuthUser,
  fileInputRef,
  handleAvatarUpload,
  handleRemoveAvatar,
  profileAvatarUrl,
  removeAvatar,
}: OnboardingProfileSectionProps) {
  return (
    <>
      {/* Profile Picture */}
      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
        >
          Profile picture
        </label>
        <div
          className="flex items-center gap-4"
        >
          <div
            className={clsx(
              'rounded-full border-2 transition-colors flex-shrink-0',
              avatarFile ? 'border-primary' : 'border-border-color',
            )}
          >
            <Avatar
              avatarUrl={displayAvatarUrl}
              fullName={displayName}
              size="xl"
            />
          </div>
          <div
            className="flex-1 flex flex-col gap-2"
          >
            <div
              className="flex flex-wrap gap-2"
            >
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                variant="secondary"
                type="button"
                size="sm"
              >
                {avatarFile ? 'Change picture' : 'Upload picture'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isSaving}
              />
              {(avatarFile || (profileAvatarUrl && !removeAvatar)) && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleRemoveAvatar}
                  disabled={isSaving}
                  size="sm"
                >
                  Remove
                </Button>
              )}
            </div>
            {avatarError && <p
              className="text-sm text-red-500"
            >
              {avatarError}
            </p>}
          </div>
        </div>
      </div>

      {/* Email Field - Only for OAuth users */}
      {isOAuthUser && (
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="email"
            className="text-sm font-medium"
          >
            Email
            {' '}
            <span
              className="text-red-500"
            >
              *
            </span>
          </label>
          <Input
            id="email"
            type="email"
            {...register('email', { required: isOAuthUser ? 'Email is required' : false })}
            placeholder="you@example.com"
          />
          {errors.email && <p
            className="text-sm text-red-500"
          >
            {errors.email.message}
          </p>}
          <p
            className="text-xs text-foreground/70"
          >
            This email will be used for notifications and account communications.
          </p>
        </div>
      )}

      {/* Full Name Field */}
      <div
        className="flex flex-col gap-2"
      >
        <label
          htmlFor="fullName"
          className="text-sm font-medium"
        >
          Full name
        </label>
        <Input
          id="fullName"
          type="text"
          {...register('fullName')}
          placeholder="Your full name"
        />
      </div>

      {/* Bio Field */}
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
    </>
  );
}
