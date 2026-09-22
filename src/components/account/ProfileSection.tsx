'use client';

import { UseFormRegister } from 'react-hook-form';

import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import SuccessMessage from '@/components/shared/SuccessMessage';
import type { AccountFormData, Profile } from '@/hooks/useAccountForm';
import { formatNicknameCooldownDate } from '@/utils/nickname';

interface ProfileSectionProps {
  register: UseFormRegister<AccountFormData>;
  profile: Profile | null;
  userEmail: string | null | undefined;
  nickname: string;
  emailChangedFromUrl: boolean;
  nicknameChangedFromUrl: boolean;
  nicknameChangeCooldownEnd: Date | null;
  onOpenEmailModal: () => void;
  onOpenNicknameModal: () => void;
}

export default function ProfileSection({
  register,
  profile,
  userEmail,
  nickname,
  emailChangedFromUrl,
  nicknameChangedFromUrl,
  nicknameChangeCooldownEnd,
  onOpenEmailModal,
  onOpenNicknameModal,
}: ProfileSectionProps) {
  const nicknameOnCooldown = nicknameChangeCooldownEnd !== null
    && nicknameChangeCooldownEnd > new Date();

  return (
    <div>
      <h2
        className="mb-2 sm:mb-4 text-lg font-semibold font-heading opacity-70"
      >
        Basic info
      </h2>
      <Container>
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
              Screen name
            </label>
            <Input
              id="fullName"
              type="text"
              {...register('fullName')}
              placeholder="Your screen name"
            />
            <p
              className="text-foreground/50 text-xs"
            >
              This is how you appear on your profile. It doesn&apos;t have to be your real name.
            </p>
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
            {nicknameChangedFromUrl && (
              <SuccessMessage
                variant="compact"
              >
                Your nickname has been successfully changed!
              </SuccessMessage>
            )}
            <div
              className="flex gap-2"
            >
              <Input
                id="nickname"
                type="text"
                value={nickname}
                disabled
                className="flex-1"
                leftAddon="@"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onOpenNicknameModal}
                disabled={nicknameOnCooldown || !nickname}
              >
                Change
              </Button>
            </div>
            <p
              className="text-foreground/50 text-xs"
            >
              Used in your profile and gallery URLs. Confirm changes via email. You can change
              your nickname once every 60 days; old links redirect for one year.
              {nicknameOnCooldown && nicknameChangeCooldownEnd && (
                <>
                  <br />
                  You can change your nickname again on
                  {' '}
                  {formatNicknameCooldownDate(nicknameChangeCooldownEnd)}
                  .
                </>
              )}
              <br />
              URL:
              {' '}
              <span
                className="wrap-break-word"
              >
                {(() => {
                  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
                  const url = `${baseUrl}/@${nickname || 'your-nickname'}`;
                  return url;
                })()}
              </span>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
