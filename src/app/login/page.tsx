'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2, UserPlus, LogIn, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    const supabase = createClient()

    if (mode === 'login') {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        const msg = signInError.message.toLowerCase()
        if (msg.includes('invalid login credentials') || signInError.status === 400) {
          setError('Email ou mot de passe incorrect. Si votre compte n\'a pas encore été créé, utilisez l\'onglet "Créer un compte".')
        } else if (msg.includes('email not confirmed') || (signInError as any).code === 'email_not_confirmed') {
          setError('Ce compte n\'a pas encore été confirmé. Dans la console Supabase (Authentication > Users), cliquez sur les options de l\'utilisateur puis "Confirm user", ou désactivez "Confirm email" dans Authentication > Providers > Email.')
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
    } else {
      // Sign Up Mode
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // If Supabase has email auto-confirm or session already created
      if (data?.session) {
        setSuccessMessage('Compte créé avec succès ! Connexion en cours...')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1000)
        return
      }

      // If Supabase requires email confirmation
      setSuccessMessage('Compte créé ! Si la connexion échoue ensuite avec "Email not confirmed", confirmez l\'utilisateur dans Supabase (Authentication > Users > Confirm user) ou désactivez "Confirm email".')
      setMode('login')
      setLoading(false)
    }
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

        {/* Mode Switch Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Créer un compte
          </button>
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
              minLength={6}
            />
            {mode === 'signup' && (
              <p className="text-[11px] text-slate-500">6 caractères minimum.</p>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'login' ? 'Connexion en cours...' : 'Création du compte...'}
              </>
            ) : mode === 'login' ? (
              'Se connecter'
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </form>

        {/* Quick troubleshooting help toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showHelp ? 'Masquer l\'aide' : 'Problème de connexion depuis un autre poste ?'}
          </button>
        </div>

        {showHelp && (
          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2 animate-in fade-in duration-200 shadow-xs">
            <div className="font-semibold text-slate-800">Guide de validation d'accès :</div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>
                <strong>Fichier de configuration</strong> : Sur le poste cloné, vérifiez la présence du fichier <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env.local</code>. S'il n'est pas présent, créez-le à partir de <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env.example</code>.
              </li>
              <li>
                <strong>Création directe</strong> : Utilisez l'onglet <em>"Créer un compte"</em> ci-dessus avec votre email et mot de passe.
              </li>
              <li>
                <strong>Confirmation email Supabase</strong> : Dans la console <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline">Supabase</a> $\to$ <em>Authentication $\to$ Users</em>, vérifiez que l'utilisateur est confirmé. Vous pouvez exécuter dans le <em>SQL Editor</em> :
                <pre className="bg-slate-900 text-slate-100 p-2 rounded text-[11px] mt-1 overflow-x-auto">
                  UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
                </pre>
              </li>
            </ol>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-5">
          Accès réservé — Référent IT Fondax SARL
        </p>
      </div>
    </div>
  )
}
