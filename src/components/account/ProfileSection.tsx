'use client';

import clsx from 'clsx';
import { UseFormRegister } from 'react-hook-form';

import Avatar from '@/components/auth/Avatar';
import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import SuccessMessage from '@/components/shared/SuccessMessage';
import type { AccountFormData, Profile } from '@/hooks/useAccountForm';

interface ProfileSectionProps {
  register: UseFormRegister<AccountFormData>;
  profile: Profile | null;
  userEmail: string | null | undefined;
  nickname: string;
  displayAvatarUrl: string | null;
  hasAvatarChanges: boolean;
  avatarError: string | null;
  isSaving: boolean;
  emailChangedFromUrl: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  handleCancelAvatarChange: () => void;
  onOpenEmailModal: () => void;
  fullName: string;
  savedAvatarUrl: string | null;
  pendingAvatarFile: File | null;
  pendingAvatarRemove: boolean;
}

export default function ProfileSection({
  register,
  profile,
  userEmail,
  nickname,
  displayAvatarUrl,
  hasAvatarChanges,
  avatarError,
  isSaving,
  emailChangedFromUrl,
  fileInputRef,
  handleAvatarUpload,
  handleRemoveAvatar,
  handleCancelAvatarChange,
  onOpenEmailModal,
  fullName,
  savedAvatarUrl,
  pendingAvatarFile,
  pendingAvatarRemove,
}: ProfileSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70"
      >
        Basic info
      </h2>
      <Container>
        {/* Profile Picture */}
        <div
          className="border-border-color mb-6 flex items-center gap-6 border-b pb-6"
        >
          <div
            className={clsx(
              'rounded-full border-2',
              hasAvatarChanges ? 'border-primary' : 'border-border-color',
            )}
          >
            <Avatar
              avatarUrl={displayAvatarUrl}
              fullName={fullName || userEmail}
              size="xl"
            />
          </div>
          <div
            className="flex-1"
          >
            <div
              className="flex flex-wrap gap-2"
            >
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                variant="secondary"
                type="button"
              >
                {pendingAvatarFile ? 'Choose different' : 'Upload new'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isSaving}
              />
              {/* Show Remove button if there's a saved avatar or pending upload (and not already marked for removal) */}
              {(savedAvatarUrl || pendingAvatarFile) && !pendingAvatarRemove && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleRemoveAvatar}
                  disabled={isSaving}
                >
                  Remove
                </Button>
              )}
              {/* Show Cancel button if there are pending avatar changes */}
              {hasAvatarChanges && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelAvatarChange}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              )}
            </div>
            {avatarError && <p
              className="mt-2 text-sm text-red-500"
            >
              {avatarError}
            </p>}
          </div>
        </div>

        {/* Form Fields */}
        <div
          className="space-y-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="email"
              className="text-sm font-medium"
            >
              Email
            </label>
            {emailChangedFromUrl && (
              <SuccessMessage
                variant="compact"
              >
                Your email has been successfully changed!
              </SuccessMessage>
            )}
            <div
              className="flex gap-2"
            >
              <Input
                id="email"
                type="email"
                value={profile?.email || userEmail || ''}
                disabled
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onOpenEmailModal}
              >
                Change
              </Button>
            </div>
          </div>

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

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="nickname"
              className="text-sm font-medium"
            >
              Nickname (username)
            </label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              disabled
            />
            <p
              className="text-foreground/50 text-xs"
            >
              Your nickname is used in your profile andgallery URLs and cannot be changed.
              <br />
              URL:
              {' '}
              <span
                className="wrap-break-word"
              >
                {(() => {
                  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
                  const url = `${baseUrl}/@${nickname || 'your-nickname'}`;
                  return url.replace(/^https?:\/\//, '');
                })()}
              </span>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
