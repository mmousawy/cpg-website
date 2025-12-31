'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import { routes } from '@/config/routes'

import CheckSVG from 'public/icons/check.svg'
import ArrowLeftSVG from 'public/icons/arrow-left.svg';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckSVG className="h-8 w-8 fill-green-500" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Check your email</h1>
          <p className="text-foreground/70">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
            Click the link in the email to reset your password.
          </p>
          <Link
            href={routes.login.url}
            className="mt-6 inline-block text-primary hover:text-primary-alt"
          >
            Back to login
          </Link>
        </Container>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-3xl font-bold">Forgot password?</h1>
        <p className="mb-8 text-center text-sm text-foreground/70">
          No worries, we&apos;ll send you reset instructions.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            className="mt-2"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/70">
          <Link href={routes.login.url} className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-">
            <ArrowLeftSVG className="fill-current" />
            Back to login
          </Link>
        </p>
      </Container>
    </PageContainer>
  )
}
