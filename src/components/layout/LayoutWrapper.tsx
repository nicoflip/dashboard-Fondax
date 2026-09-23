'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === '/login' || pathname.startsWith('/creer-compte') || pathname.startsWith('/auth')

  if (isPublicPage) {
    return <ConfirmProvider>{children}</ConfirmProvider>
  }

  return (
    <ConfirmProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:pl-64 pt-14 lg:pt-0 print:pl-0 print:pt-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </ConfirmProvider>
  )
}
