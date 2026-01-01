'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import LogoSVG from 'public/cpg-logo.svg'

import UserMenu from './UserMenu'
import Avatar from '../auth/Avatar'
import MobileMenu from './MobileMenu'
import { routes } from '@/config/routes'

// Navigation link component with active state
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={clsx(
        "relative py-1 font-medium transition-colors hover:text-primary",
        isActive ? "text-primary" : "text-foreground"
      )}
    >
      {children}
      {isActive && (
        <span className="absolute -bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  )
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-10 flex justify-center border-b-[0.0625rem] border-t-4 sm:border-t-8 border-b-border-color border-t-primary bg-background-light p-3 text-foreground shadow-md shadow-[#00000005]">
      <div className="flex w-full max-w-screen-md items-center justify-between gap-4">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Creative Photography Group Home">
            <LogoSVG className="block size-14 max-sm:size-10" />
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <NavLink href={routes.home.url}>
              {routes.home.label}
            </NavLink>
            <NavLink href={routes.galleries.url}>
              {routes.galleries.label}
            </NavLink>
            <NavLink href={routes.about.url}>
              {routes.about.label}
            </NavLink>
          </nav>
        </div>

        {/* Right: User Menu (Desktop) / Mobile Menu Button (Mobile) */}
        <div className="flex items-center gap-3">
          {/* Desktop Only: UserMenu */}
          <div className="hidden sm:block">
            <UserMenu />
          </div>

          {/* Mobile Only: Avatar + Menu Button */}
          <div className="flex items-center gap-3 sm:hidden">
            {/* Mobile Avatar - opens mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center overflow-hidden rounded-full transition-colors hover:border-primary"
              aria-label="Open menu"
            >
              <Avatar size="md" className="!size-10 border-0" />
            </button>

            {/* Mobile Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${mobileMenuOpen ? 'border-primary' : 'border-border-color hover:border-primary'
                  }`}
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5 fill-foreground" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  ) : (
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  )}
                </svg>
              </button>

              <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} mounted={mounted} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
