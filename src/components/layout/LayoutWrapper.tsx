'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0 print:pl-0 print:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
          {children}
        </div>
      </main>
    </div>
  )
}
