'use client'

import Header from './Header'
import Footer from './Footer'

export default function Layout({ children }: { children: React.ReactNode }) {
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

