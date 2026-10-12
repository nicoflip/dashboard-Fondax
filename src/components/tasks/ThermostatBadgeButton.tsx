'use client'

import React, { useState } from 'react'
import { useTaskThermostat, PAUSE_REASON_LABELS, PauseReason } from '@/lib/task-thermostat'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Flame, Snowflake, Play, Pause, Clock, RotateCcw, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThermostatBadgeButtonProps {
  variant?: 'sidebar' | 'compact' | 'header'
  className?: string
}

export function ThermostatBadgeButton({ variant = 'sidebar', className }: ThermostatBadgeButtonProps) {
  const { 
    isPaused, 
    currentPauseStart, 
    currentPauseReason, 
    pause, 
    resume, 
    rollbackDays, 
    removeCatchup,
    hasCatchup15d 
  } = useTaskThermostat()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<PauseReason>('weekend')
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg)
    setTimeout(() => setFeedbackMsg(null), 3500)
  }

  // Format start time if paused
  const pausedSinceText = currentPauseStart ? (() => {
    const d = new Date(currentPauseStart)
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${day}. à ${time}`
  })() : ''

  const activeReasonInfo = currentPauseReason ? PAUSE_REASON_LABELS[currentPauseReason] : null

  const handleOpenPauseDialog = () => {
    setDialogOpen(true)
  }

  const handleConfirmPause = () => {
    pause(selectedReason)
    setDialogOpen(false)
  }

  const handleQuickResume = () => {
    resume()
  }

  const handleApplyExtraRollback = () => {
    rollbackDays(15, 'Rattrapage manuel 15 jours supplémentaires')
    showFeedback('✓ 15 jours supplémentaires décomptés avec succès !')
  }

  const handleResetRollback = () => {
    removeCatchup()
    showFeedback('Rattrapage réinitialisé.')
  }

  const renderDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900">
          <Snowflake className="w-5 h-5 text-sky-600" />
          Thermostat &amp; Suivi d&apos;absence
        </DialogTitle>
      </DialogHeader>

      <div className="p-4 space-y-4">
        {feedbackMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {feedbackMsg}
          </div>
        )}

        {/* Section 1 : Rattrapage d'absence appliqué */}
        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Rattrapage des températures (-15j)
            </span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-semibold",
              hasCatchup15d ? "bg-blue-200 text-blue-900" : "bg-slate-200 text-slate-700"
            )}>
              {hasCatchup15d ? "Actif (-15 jours)" : "Standard"}
            </span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            {hasCatchup15d 
              ? "Toutes vos tâches ont reculé de 15 jours en inactivité. Leurs valeurs de température sont allégées comme avant votre absence."
              : "Aucun décalage d'inactivité supplémentaire n'est actuellement appliqué."}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyExtraRollback}
              className="text-xs h-7 border-blue-300 text-blue-900 hover:bg-blue-100 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reculer encore de 15j</span>
            </Button>
            {hasCatchup15d && (
              <button
                type="button"
                onClick={handleResetRollback}
                className="text-[11px] text-blue-600 hover:text-blue-900 underline ml-auto cursor-pointer"
              >
                Annuler rattrapage
              </button>
            )}
          </div>
        </div>

        {/* Section 2 : Geler pour une nouvelle absence */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-slate-800 block">
            Badger une absence (Mettre en pause) :
          </label>
          <p className="text-xs text-slate-600 leading-relaxed">
            Gèle l&apos;indice thermique de toutes vos tâches. Le temps passé en pause ne sera pas décompté.
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {(Object.keys(PAUSE_REASON_LABELS) as PauseReason[]).map(key => {
              const item = PAUSE_REASON_LABELS[key]
              const isSel = selectedReason === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedReason(key)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    isSel
                      ? "bg-sky-50 border-sky-500 ring-2 ring-sky-200 text-sky-950"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setDialogOpen(false)}>
          Fermer
        </Button>
        <Button
          onClick={handleConfirmPause}
          className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2"
        >
          <Pause className="w-4 h-4" />
          <span>Geler les températures</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )

  // 1. Compact / Header variant (for mobile header or compact navbars)
  if (variant === 'compact' || variant === 'header') {
    return (
      <>
        {isPaused ? (
          <button
            type="button"
            onClick={handleQuickResume}
            title={`Réchauffement figé depuis ${pausedSinceText} (${activeReasonInfo?.label || 'Pause'}). Cliquez pour badger l'arrivée et reprendre.`}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40 hover:bg-sky-500/30 transition-all cursor-pointer animate-pulse",
              className
            )}
          >
            <Snowflake className="w-3.5 h-3.5 text-sky-300" />
            <span>{activeReasonInfo?.icon || '❄️'} En pause</span>
            <span className="hidden sm:inline text-[10px] text-sky-300 font-normal">({pausedSinceText})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenPauseDialog}
            title="Réchauffement actif. Cliquez pour mettre en pause ou gérer le rattrapage thermique."
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer",
              className
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>En poste</span>
            {hasCatchup15d && <span className="text-[10px] text-sky-300 font-normal">(-15j)</span>}
          </button>
        )}

        {renderDialog()}
      </>
    )
  }

  // 2. Sidebar variant (styled card in the desktop sidebar)
  return (
    <>
      <div className={cn("px-3 py-2", className)}>
        {isPaused ? (
          /* PAUSED CARD */
          <div className="bg-sky-950/70 border border-sky-600/40 rounded-xl p-3 text-sky-100 shadow-inner">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-300">
                <Snowflake className="w-4 h-4 text-sky-400 animate-spin-slow" />
                <span>Réchauffement en Pause</span>
              </div>
              <span className="text-base">{activeReasonInfo?.icon || '❄️'}</span>
            </div>

            <div className="text-[11px] text-sky-200/80 mb-2.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Figé depuis {pausedSinceText}</span>
            </div>

            <Button
              size="sm"
              onClick={handleQuickResume}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs h-8 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Badger Arrivée (Reprendre)</span>
            </Button>
          </div>
        ) : (
          /* ACTIVE CARD */
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-slate-200">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>En poste • Réchauffement actif</span>
              </div>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="text-[10px] text-slate-400">
                Évolution thermique selon l&apos;inactivité.
              </p>
              {hasCatchup15d && (
                <span className="text-[10px] font-semibold text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
                  ❄️ -15j
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPauseDialog}
              className="w-full border-slate-600 hover:bg-slate-700 text-slate-200 text-xs h-7.5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3 h-3 text-sky-400" />
              <span>Badger Départ / Thermostat</span>
            </Button>
          </div>
        )}
      </div>

      {renderDialog()}
    </>
  )
}
