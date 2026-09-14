'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2, LogIn, AlertCircle, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('invalid login credentials') || signInError.status === 400) {
        setError('Email ou mot de passe incorrect.')
      } else if (msg.includes('email not confirmed') || (signInError as any).code === 'email_not_confirmed') {
        setError('Ce compte n\'a pas encore été confirmé dans Supabase.')
      } else if (msg.includes('fetch') || signInError.status === 0) {
        setError('Impossible de joindre le serveur Supabase. Vérifiez votre connexion Internet.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl mb-3 shadow-sm">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Fondax IT</h1>
          <p className="text-sm text-slate-500 mt-1">Dashboard de suivi informatique interne</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre.email@fondax-sarl.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Se connecter
              </span>
            )}
          </Button>
        </form>

        {/* Quick troubleshooting help toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showHelp ? 'Masquer l\'aide' : 'Besoin d\'aide ?'}
          </button>
        </div>

        {showHelp && (
          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2 animate-in fade-in duration-200 shadow-xs">
            <div className="font-semibold text-slate-800">Accès administrateur :</div>
            <p>
              La création de compte public est désactivée. Les comptes sont gérés exclusivement depuis la console d'administration Supabase.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-5">
          Accès strictement réservé — Référent IT Fondax SARL
        </p>
      </div>
    </div>
  )
}
