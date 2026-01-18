'use client';

import Input from '@/components/shared/Input';

interface OnboardingNicknameSectionProps {
  register: any;
  errors: any;
  watchedNickname: string;
  isCheckingNickname: boolean;
  nicknameAvailable: boolean | null;
  onNicknameChange: (nickname: string) => void;
}

export default function OnboardingNicknameSection({
  register,
  errors,
  watchedNickname,
  isCheckingNickname,
  nicknameAvailable,
  onNicknameChange,
}: OnboardingNicknameSectionProps) {
  return (
    <div
      className="flex flex-col gap-2"
    >
      <label
        htmlFor="nickname"
        className="text-sm font-medium"
      >
        Choose a nickname
        {' '}
        <span
          className="text-red-500"
        >
          *
        </span>
      </label>
      <Input
        id="nickname"
        type="text"
        {...register('nickname', {
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            e.target.value = value;
            onNicknameChange(value);
          },
        })}
        placeholder="your-nickname"
        autoComplete="off"
        leftAddon="@"
        rightAddon={
          <>
            {isCheckingNickname && (
              <svg
                className="size-4 animate-spin text-foreground/70"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {!isCheckingNickname && nicknameAvailable === true && watchedNickname.length >= 3 && (
              <svg
                className="size-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {!isCheckingNickname && nicknameAvailable === false && (
              <svg
                className="size-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </>
        }
      />
      {errors.nickname && <p
        className="text-sm text-red-500"
      >
        {errors.nickname.message}
      </p>}
      {!errors.nickname && nicknameAvailable === false && (
        <p
          className="text-sm text-red-500"
        >
          This nickname is already taken
        </p>
      )}
      {!errors.nickname && nicknameAvailable === true && watchedNickname.length >= 3 && (
        <p
          className="text-sm text-primary"
        >
          Nickname is available!
        </p>
      )}
      <p
        className="text-xs text-foreground/70"
      >
        Your profile URL will be:
        <br />
        <span
          className="break-words"
        >
          {(() => {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://creativephotography.group';
            const url = `${baseUrl}/@${watchedNickname || 'your-nickname'}`;
            return url.replace(/^https?:\/\//, '');
          })()}
        </span>
      </p>
    </div>
  );
}
