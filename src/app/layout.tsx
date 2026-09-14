import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'

export const metadata: Metadata = {
  title: 'Dashboard IT — Fondax',
  description: 'Tableau de bord de suivi IT pour Fondax SARL',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
