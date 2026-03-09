'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Avatar from '@/components/auth/Avatar';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import Textarea from '@/components/shared/Textarea';
import { useAuth } from '@/context/AuthContext';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';
import { validateImage } from '@/utils/imageValidation';
import { BotIdClient } from 'botid/client';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const MAX_SCREENSHOTS = 3;

type FeedbackModalProps = {
  onSuccess?: () => void;
};

export default function FeedbackModal({ onSuccess }: FeedbackModalProps) {
  const { user, profile } = useAuth();
  const modalContext = useContext(ModalContext);
  const isAuthenticated = !!user;

  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const handleCloseRef = useRef<(() => void) | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleSubmit = useCallback(async () => {
    // Validate anonymous fields
    if (!isAuthenticated) {
      if (!name.trim()) {
        setError('Please provide your name');
        return;
      }
      // Email is optional for anonymous
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Please provide a valid email address');
          return;
        }
      }
    }

    if (!subject) {
      setError('Please select a subject');
      return;
    }

    const validSubjects = FEEDBACK_SUBJECTS.map((s) => s.value);
    if (!validSubjects.includes(subject as (typeof FEEDBACK_SUBJECTS)[number]['value'])) {
      setError('Please select a valid subject');
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    if (message.length > 5000) {
      setError('Message is too long (max 5000 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resolvedName = isAuthenticated && profile
        ? (profile.full_name || profile.nickname || 'User')
        : name.trim();

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: resolvedName,
          email: isAuthenticated ? null : (email.trim() || null),
          subject,
          message: message.trim(),
          screenshots: screenshots.length ? screenshots : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Failed to submit feedback');
      }

      modalContext.setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, subject, message, screenshots, isAuthenticated, profile, modalContext, onSuccess]);

  const handleScreenshotSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || screenshots.length >= MAX_SCREENSHOTS) return;

      const validationError = await validateImage(file, {
        maxSizeBytes: 2 * 1024 * 1024,
      });
      if (validationError) {
        setError(validationError.message);
        return;
      }

      setIsUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.set('file', file);
        const res = await fetch('/api/feedback/upload-screenshot', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }
        const { url } = await res.json();
        setScreenshots((prev) => [...prev, url].slice(0, MAX_SCREENSHOTS));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload screenshot');
      } finally {
        setIsUploading(false);
      }
    },
    [screenshots.length],
  );

  const removeScreenshot = useCallback((url: string) => {
    setScreenshots((prev) => prev.filter((u) => u !== url));
  }, []);

  const selectOptions = useMemo(
    () =>
      FEEDBACK_SUBJECTS.map((s) => ({
        value: s.value,
        label: s.label,
      })),
    [],
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
    handleCloseRef.current = () => modalContext.setIsOpen(false);
  }, [handleSubmit, modalContext]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end gap-2"
      >
        <Button
          variant="secondary"
          onClick={() => handleCloseRef.current?.()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmitRef.current?.()}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Submit feedback
        </Button>
      </div>
    ),
    [isSubmitting],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [modalContext, footerContent]);

  const isVercel = process.env.NEXT_PUBLIC_VERCEL === '1';

  return (
    <>
      {!isAuthenticated && isVercel && (
        <BotIdClient
          protect={[
            { path: '/api/feedback', method: 'POST' },
            { path: '/api/feedback/upload-screenshot', method: 'POST' },
          ]}
        />
      )}
      <div
        className="space-y-4"
      >
        <p
          className="text-sm text-foreground/70"
        >
          Share your thoughts, report bugs, or suggest improvements.
        </p>

        {error && <ErrorMessage
          variant="compact"
        >
          {error}
        </ErrorMessage>}

        {/* Authenticated: show avatar + username. Anonymous: name + email */}
        {isAuthenticated && profile ? (
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
            >
              Submitting as
            </label>
            <div
              className="flex items-center gap-3 rounded-lg border border-border-color bg-background-light px-4 py-3"
            >
              <Avatar
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                nickname={profile.nickname}
                size="sm"
              />
              <div>
                <p
                  className="text-sm font-medium"
                >
                  {profile.full_name || 'You'}
                </p>
                {profile.nickname && (
                  <p
                    className="text-xs text-foreground/60"
                  >
                    @
                    {profile.nickname}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
              >
                Your name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>
            {/* Email - anonymous users only, optional */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
              >
                Your email
                {' '}
                <span
                  className="text-foreground/60 text-xs"
                >
                  (optional)
                </span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                maxLength={255}
              />
            </div>
          </>
        )}

        {/* Subject dropdown */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
          >
            Subject
          </label>
          <Select
            value={subject}
            onValueChange={setSubject}
            options={selectOptions}
            placeholder="Select a subject..."
            disabled={isSubmitting}
          />
        </div>

        {/* Message */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
          >
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your feedback..."
            rows={5}
            disabled={isSubmitting}
            maxLength={5000}
          />
          <p
            className="mt-1 text-xs text-foreground/50"
          >
            {message.length}
            /5000
          </p>
        </div>

        {/* Screenshots (up to 3) */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
          >
            Screenshots
            {' '}
            <span
              className="text-foreground/60 text-xs"
            >
              (optional, up to 3)
            </span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleScreenshotSelect}
          />
          <div
            className="flex flex-wrap gap-2"
          >
            {screenshots.map((url) => (
              <div
                key={url}
                className="relative rounded-lg border border-border-color overflow-hidden bg-background"
              >
                <Image
                  src={url}
                  alt="Screenshot"
                  width={80}
                  height={80}
                  className="object-cover w-20 h-20"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(url)}
                  disabled={isSubmitting}
                  className="absolute top-1 right-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-background shadow-sm disabled:opacity-50"
                  aria-label="Remove screenshot"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M2 2l8 8M10 2L2 10"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {screenshots.length < MAX_SCREENSHOTS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isUploading}
                className="flex items-center justify-center w-20 h-20 rounded-lg border border-dashed border-border-color text-foreground/60 hover:bg-background-light hover:text-foreground disabled:opacity-50"
              >
                {isUploading ? (
                  <span
                    className="text-xs"
                  >
                    Uploading…
                  </span>
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
