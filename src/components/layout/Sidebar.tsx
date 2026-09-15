'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  Network,
  Calendar,
  Monitor,
  Users,
  Handshake,
  ClipboardList,
  FileText,
  FileBarChart,
  Menu,
  X,
  LogOut,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/taches', label: 'Tâches', icon: CheckSquare },
  { href: '/reseau', label: 'Plan réseau', icon: Network },
  { href: '/calendrier', label: 'Calendrier', icon: Calendar },
  { href: '/parc', label: 'Parc informatique', icon: Monitor },
  { href: '/organigramme', label: 'Organigramme', icon: Users },
  { href: '/prestataires', label: 'Prestataires', icon: Handshake },
  { href: '/chantiers', label: 'Chantiers', icon: ClipboardList },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/rapports', label: 'Rapports', icon: FileBarChart },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleGoHome = (e: React.MouseEvent) => {
    setMobileOpen(false)
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      router.push('/')
    }
  }

  const renderNavContent = () => (
    <>
      {/* Logo / Header cliquable */}
      <Link 
        href="/" 
        onClick={handleGoHome}
        className="flex items-center gap-3 px-4 py-5 border-b border-slate-700 hover:bg-slate-800/80 transition-colors group cursor-pointer select-none"
        title="Retourner à l'accueil / menu"
      >
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-xs">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">Fondax IT</h1>
          <p className="text-xs text-slate-400">Dashboard</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'sidebar-link',
                active ? 'sidebar-link-active' : 'sidebar-link-inactive'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 z-30 print:hidden">
        {renderNavContent()}
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 flex items-center justify-between px-4 h-14 border-b border-slate-800 print:hidden">
        <Link 
          href="/" 
          onClick={handleGoHome}
          className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity select-none"
          title="Retourner à l'accueil / menu"
        >
          <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Fondax IT</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 print:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col z-50">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  )
}
