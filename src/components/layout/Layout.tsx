'use client'

import Header from './Header'
import Footer from './Footer'

type LayoutProps = {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex grow flex-col">
        {children}
      </main>
      <Footer />
    </div>
  )
}

