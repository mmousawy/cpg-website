'use client'

import Header from './Header'
import Footer from './Footer'
import type { ServerAuth } from '@/utils/supabase/getServerAuth'

type LayoutProps = {
  children: React.ReactNode
  serverAuth?: ServerAuth
}

export default function Layout({ children, serverAuth }: LayoutProps) {
  return (
    <div className="flex min-h-full flex-col">
      <Header serverAuth={serverAuth} />
      <main className="flex grow flex-col">
        {children}
      </main>
      <Footer />
    </div>
  )
}

