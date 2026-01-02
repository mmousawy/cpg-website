'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import ErrorMessage from '@/components/shared/ErrorMessage'

import CheckSVG from 'public/icons/check.svg'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { updatePassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  }

  if (success) {
    return (
      <PageContainer className="items-center justify-center">
        <Container padding="lg" className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckSVG className="h-8 w-8 fill-green-500" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Password updated!</h1>
          <p className="text-foreground/70">
            Your password has been successfully updated. Redirecting you to the homepage...
          </p>
        </Container>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="items-center justify-center">
      <Container padding="lg" className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-3xl font-bold">Set new password</h1>
        <p className="mb-8 text-center text-sm text-foreground/70">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <ErrorMessage variant="compact">{error}</ErrorMessage>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            className="mt-2"
          >
            {isLoading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Container>
    </PageContainer>
  )
}
