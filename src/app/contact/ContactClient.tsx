'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import { socialLinks } from '@/config/socials';

import CheckSVG from 'public/icons/check.svg';
import DiscordSVG from 'public/icons/discord.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

const socialIconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
});

type ContactFormData = z.infer<typeof contactSchema>;

function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }

      setIsSuccess(true);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PageContainer
        className="items-center justify-center"
        innerClassName="max-w-xl"
      >
        <PageHeading
          title="Message sent"
          description="Thank you for reaching out! We'll get back to you as soon as possible."
        />
        <Container
          padding="lg"
          className="mx-auto max-w-md text-center"
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10"
          >
            <CheckSVG
              className="h-8 w-8 fill-green-500"
            />
          </div>
          <Button
            onClick={() => setIsSuccess(false)}
            variant="secondary"
            className="mt-6"
          >
            Send another message
          </Button>
        </Container>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      innerClassName="max-w-xl"
    >
      <PageHeading
        title="Contact us"
        description="Have a question or want to get in touch? Fill out the form below and we'll respond as soon as we can."
      />

      <Container variant="form" className="flex flex-col gap-6 sm:gap-8">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              {...register('name')}
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
              htmlFor="email"
              className="text-sm font-medium"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="subject"
              className="text-sm font-medium"
            >
              Subject
            </label>
            <Input
              id="subject"
              type="text"
              placeholder="What is this about?"
              {...register('subject')}
            />
            {errors.subject && (
              <p
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.subject.message}
              </p>
            )}
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="message"
              className="text-sm font-medium"
            >
              Message
            </label>
            <Textarea
              id="message"
              placeholder="Your message..."
              rows={6}
              {...register('message')}
            />
            {errors.message && (
              <p
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.message.message}
              </p>
            )}
          </div>

          {submitError && (
            <ErrorMessage
              variant="compact"
            >
              {submitError}
            </ErrorMessage>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="mt-2"
          >
            {isSubmitting ? 'Sending...' : 'Send message'}
          </Button>
        </form>

        <div className="border-t border-border-color" role="presentation" />

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Connect with us
            </h2>
            <p className="mt-1 text-sm text-foreground/80">
              For community chat, updates, and meetup info, join us on Discord, Instagram, or WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social) => {
              const Icon = socialIconMap[social.name];
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-border-color-strong bg-background px-4 py-1.5 text-sm font-medium font-(family-name:--font-geist-mono) text-foreground transition-colors hover:bg-(--hover-bg) hover:border-(--hover-color) hover:text-(--hover-color)"
                  style={{
                    '--hover-color': social.color,
                    '--hover-bg': `${social.color}15`,
                  } as React.CSSProperties}
                >
                  <Icon
                    className="size-6 shrink-0 transition-colors group-hover:fill-(--hover-color)"
                  />
                  <span>
                    {social.name}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </Container>
    </PageContainer>
  );
}

export default function ContactClient() {
  return <ContactForm />;
}
