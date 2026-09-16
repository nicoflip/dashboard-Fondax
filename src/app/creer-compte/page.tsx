'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Shield,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  Info,
} from 'lucide-react'

function CreerCompteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // État de chargement initial de la session
  const [checkingSession, setCheckingSession] = useState(true)
  
  // Si l'utilisateur arrive via un lien d'invitation Supabase, il a une session active
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  
  // Champs formulaire
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Feedback
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        // 1. Échanger le code PKCE s'il est présent dans l'URL (?code=...)
        const code = searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }

        // 2. Vérifier si une session existe (ex: via hash #access_token ou cookie ou code)
        const { data: { session } } = await supabase.auth.getSession()

        if (isMounted) {
          if (session?.user?.email) {
            setCurrentUserEmail(session.user.email)
            setEmail(session.user.email)
          }
          setCheckingSession(false)
        }
      } catch (err) {
        console.error('Erreur initialisation session:', err)
        if (isMounted) setCheckingSession(false)
      }
    }

    initAuth()

    // Écouter les changements d'état Supabase (ex: hash fragment résolu en session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email && isMounted) {
          setCurrentUserEmail(session.user.email)
          setEmail(session.user.email)
          setCheckingSession(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [searchParams, supabase])

  // Validation commune du mot de passe
  const validatePassword = () => {
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return false
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return false
    }
    return true
  }

  // CAS 1 : Définir le mot de passe pour un utilisateur déjà invité / connecté
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!validatePassword()) return

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('Votre mot de passe a été défini avec succès ! Accès en cours...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la définition du mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  // CAS 2 : Inscription directe (Email + Mot de passe)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email || !email.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.')
      return
    }

    if (!validatePassword()) return

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/creer-compte` : undefined,
        },
      })

      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        if (msg.includes('user already registered')) {
          setError('Un compte existe déjà avec cette adresse email.')
        } else if (msg.includes('signup requires a valid password')) {
          setError('Le mot de passe doit contenir au moins 6 caractères.')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Si Supabase a directement créé une session (confirmation email désactivée)
      if (data.session) {
        setSuccessMessage('Compte créé avec succès ! Redirection en cours...')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1500)
        return
      }

      // Si confirmation email requise par Supabase
      setSuccessMessage(
        `Votre compte a bien été initié. Un email de confirmation a été envoyé à ${email}. Veuillez cliquer sur le lien reçu pour l'activer.`
      )
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOutAndReset = async () => {
    await supabase.auth.signOut()
    setCurrentUserEmail(null)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccessMessage(null)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Chargement de la page de création...</p>
        </div>
      </div>
    )
  }

  const isInvitedSession = Boolean(currentUserEmail)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl mb-3 shadow-sm">
            {isInvitedSession ? (
              <KeyRound className="w-7 h-7 text-emerald-400" />
            ) : (
              <Shield className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isInvitedSession ? 'Finaliser votre accès IT' : 'Création de compte'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isInvitedSession
              ? 'Définissez votre mot de passe pour activer votre compte'
              : 'Plateforme informatique interne — Fondax SARL'}
          </p>
        </div>

        {/* Message de succès */}
        {successMessage ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full text-emerald-600 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Succès</h2>
              <p className="text-sm text-slate-600">{successMessage}</p>
            </div>
            {!isInvitedSession && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setSuccessMessage(null)
                  setPassword('')
                  setConfirmPassword('')
                }}
              >
                Créer un autre compte
              </Button>
            )}
          </div>
        ) : (
          /* Formulaire principal */
          <form
            onSubmit={isInvitedSession ? handleUpdatePassword : handleSignUp}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4"
          >
            {/* Bannière d'invitation si l'utilisateur arrive via le lien Supabase */}
            {isInvitedSession && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Invitation validée pour :</span>
                </div>
                <div className="font-mono text-xs bg-white/80 px-2 py-1 rounded border border-blue-200/60 font-bold text-slate-900 break-all">
                  {currentUserEmail}
                </div>
                <p className="text-[11px] text-blue-700 pt-1">
                  Veuillez choisir votre mot de passe pour valider l&apos;accès à votre espace.
                </p>
              </div>
            )}

            {/* Saisie Email (uniquement si inscription libre / pas encore de session) */}
            {!isInvitedSession && (
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="prenom.nom@fondax-sarl.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="pl-9"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {/* Saisie Mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="password">
                {isInvitedSession ? 'Choisissez votre mot de passe' : 'Mot de passe'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus={isInvitedSession}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmation Mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmez votre mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Alerte d'erreur */}
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isInvitedSession ? 'Enregistrement du mot de passe...' : 'Création du compte...'}
                </>
              ) : isInvitedSession ? (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Enregistrer et accéder au tableau de bord
                  <ArrowRight className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Créer mon compte
                </span>
              )}
            </Button>

            {/* Option pour changer de compte si une session existait déjà */}
            {isInvitedSession && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSignOutAndReset}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Ce n&apos;est pas votre adresse email ? Cliquez ici
                </button>
              </div>
            )}
          </form>
        )}

        {/* Note d'information */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>Accès réservé au personnel et partenaires habilités Fondax</span>
        </div>
      </div>
    </div>
  )
}

export default function CreerComptePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CreerCompteContent />
    </Suspense>
  )
}
