'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/shared/Button'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import { routes } from '@/config/routes'
import ErrorMessage from '@/components/shared/ErrorMessage'

import DiscordSVG from 'public/icons/discord2.svg'
import CheckSVG from 'public/icons/check.svg'

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle, signInWithDiscord } = useAuth()

  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const generateNickname = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleFullNameChange = (value: string) => {
    setFullName(value)
    if (!nickname) {
      setNickname(generateNickname(value))
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await signUpWithEmail(email, password, { full_name: fullName, nickname: nickname.toLowerCase() })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleDiscordSignIn = async () => {
    setIsLoading(true)
    setError(null)
    const { error } = await signInWithDiscord()
    if (error) {
      setError(error.message)
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
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Click the link in the email to activate your account.
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
        <h1 className="mb-2 text-center text-3xl font-bold">Create an account</h1>
        <p className="mb-8 text-center text-sm text-foreground/70">
          Join the Creative Photography Group community
        </p>

        {/* Social Login Buttons */}
        <div className="mb-6 flex flex-col gap-3">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            variant="secondary"
            fullWidth
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <Button
            onClick={handleDiscordSignIn}
            disabled={isLoading}
            variant="custom"
            fullWidth
            icon={<DiscordSVG className="h-5 w-6 fill-white" />}
            className="bg-[#5865F2] text-white hover:bg-[#4752C4] hover:text-white border-[#5865F2] hover:border-[#4752C4]"
          >
            Continue with Discord
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-color" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background-light px-4 text-foreground/50">or sign up with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              placeholder="John Doe"
              required
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nickname" className="text-sm font-medium">
              Nickname (username)
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(generateNickname(e.target.value))}
              placeholder="johndoe"
              required
              pattern="[a-z0-9-]{3,30}"
              minLength={3}
              maxLength={30}
              className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-foreground/50">
              Your unique username for the community. Used in your gallery URLs.
            </p>
          </div>

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

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
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
            <p className="text-xs text-foreground/50">Must be at least 6 characters</p>
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
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/70">
          Already have an account?{' '}
          <Link href={routes.login.url} className="font-medium text-primary hover:text-primary-alt">
            {routes.login.label}
          </Link>
        </p>
      </Container>
    </PageContainer>
  )
}
