import { ReactNode } from 'react'

type PageContainerProps = {
  children: ReactNode
  className?: string
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`flex grow justify-center px-4 pb-8 pt-6 sm:px-12 sm:pb-14 sm:pt-8 ${className}`}>
      <div className="w-full max-w-screen-md">
        {children}
      </div>
    </div>
  )
}
