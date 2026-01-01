'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useTheme } from 'next-themes'

import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import Avatar from '../auth/Avatar'
import { routes } from '@/config/routes'

export default function UserMenu() {
  const { user, isLoading, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Helper to check if a route is active
  // exact=true means only match the exact path (for parent routes that have sub-routes)
  const isActive = (href: string, exact = false) => 
    exact ? pathname === href : pathname.startsWith(href)

  // Base styles for menu links
  const menuLinkClass = (href: string, exact = false) => clsx(
    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
    isActive(href, exact)
      ? "bg-primary/10 dark:bg-foreground/5 text-primary shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c]"
      : "hover:bg-background"
  )

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-border-color" />
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-center overflow-hidden rounded-full border-2 transition-colors",
          isOpen ? "border-primary" : "border-border-color hover:border-primary"
        )}
        aria-label="User menu"
      >
        <Avatar size="md" className="!size-10 border-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-color bg-background-light shadow-lg">
          {user ? (
            <>
              <div className="border-b border-border-color p-4">
                <p className="font-semibold truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-sm text-foreground/60 truncate">{user.email}</p>
              </div>

              <div className="p-2">
                <Link
                  href="/account/events"
                  onClick={() => setIsOpen(false)}
                  className={menuLinkClass('/account/events')}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  My events
                </Link>
                <Link
                  href="/account/galleries"
                  onClick={() => setIsOpen(false)}
                  className={menuLinkClass('/account/galleries')}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  My galleries
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className={menuLinkClass('/account', true)}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                {isAdmin && (
                  <Link
                    href={routes.admin.url}
                    onClick={() => setIsOpen(false)}
                    className={menuLinkClass(routes.admin.url)}
                  >
                    <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {routes.admin.label}
                  </Link>
                )}
              </div>

              <div className="border-t border-border-color p-2">
                <button
                  onClick={() => {
                    setTheme(theme === 'dark' ? 'light' : 'dark')
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-background"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mounted && theme === 'dark' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                  {mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>

                <button
                  onClick={async () => {
                    setIsOpen(false)
                    try {
                      await signOut()
                      // Only redirect to home if on a protected route
                      const isProtectedRoute = pathname.startsWith('/account') || pathname.startsWith('/admin')
                      if (isProtectedRoute) {
                        window.location.href = '/'
                      } else {
                        // Stay on current page, just refresh to update UI
                        window.location.reload()
                      }
                    } catch (error) {
                      console.error('Error signing out:', error)
                    }
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="p-2">
              <Link
                href={`${routes.login.url}?redirectTo=${encodeURIComponent(pathname)}`}
                onClick={() => setIsOpen(false)}
                className={menuLinkClass(routes.login.url)}
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {routes.login.label}
              </Link>
              <Link
                href={`${routes.signup.url}?redirectTo=${encodeURIComponent(pathname)}`}
                onClick={() => setIsOpen(false)}
                className={menuLinkClass(routes.signup.url)}
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                {routes.signup.label}
              </Link>

              <div className="border-t border-border-color mt-2 pt-2">
                <button
                  onClick={() => {
                    setTheme(theme === 'dark' ? 'light' : 'dark')
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-background"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mounted && theme === 'dark' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                  {mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
