'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BotIdClient } from 'botid/client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';

import CheckSVG from 'public/icons/check.svg';

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
      >
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
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Message sent
          </h1>
          <p
            className="text-foreground/70"
          >
            Thank you for reaching out! We&apos;ll get back to you as soon as possible.
          </p>
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
      <div
        className="mb-8"
      >
        <h1
          className="text-3xl font-bold"
        >
          Contact us
        </h1>
        <p
          className="mt-2 max-w-md text-foreground/70"
        >
          Have a question or want to get in touch? Fill out the form below and we&apos;ll respond as soon as we can.
        </p>
      </div>

      <Container
        variant="form"
      >
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
      </Container>
    </PageContainer>
  );
}

export default function ContactClient() {
  // BotIdClient only works when deployed on Vercel
  const isVercel = process.env.NEXT_PUBLIC_VERCEL === '1';

  return (
    <>
      {isVercel && (
        <BotIdClient
          protect={[
            { path: '/api/contact', method: 'POST' },
          ]}
        />
      )}
      <ContactForm />
    </>
  );
}
