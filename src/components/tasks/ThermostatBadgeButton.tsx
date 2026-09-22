'use client'

import React, { useState } from 'react'
import { useTaskThermostat, PAUSE_REASON_LABELS, PauseReason } from '@/lib/task-thermostat'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Flame, Snowflake, Play, Pause, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThermostatBadgeButtonProps {
  variant?: 'sidebar' | 'compact' | 'header'
  className?: string
}

export function ThermostatBadgeButton({ variant = 'sidebar', className }: ThermostatBadgeButtonProps) {
  const { isPaused, currentPauseStart, currentPauseReason, pause, resume } = useTaskThermostat()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<PauseReason>('weekend')

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

  // 1. Compact / Header variant (for mobile header or compact navbars)
  if (variant === 'compact' || variant === 'header') {
    if (isPaused) {
      return (
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
      )
    }

    return (
      <>
        <button
          type="button"
          onClick={handleOpenPauseDialog}
          title="Réchauffement actif. Cliquez pour mettre en pause (Week-end / Cours)."
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer",
            className
          )}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>En poste</span>
        </button>

        {/* Dialog for choosing reason */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Snowflake className="w-5 h-5 text-sky-600" />
              Mettre en pause le réchauffement
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Gèle l'indice thermique de vos tâches pendant votre absence. Le temps écoulé ne sera pas décompté
              et les températures resteront parfaitement fixes jusqu'à votre retour.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2">
              {(Object.keys(PAUSE_REASON_LABELS) as PauseReason[]).map(key => {
                const item = PAUSE_REASON_LABELS[key]
                const isSel = selectedReason === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedReason(key)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSel
                        ? "bg-sky-50 border-sky-500 ring-2 ring-sky-200 text-sky-950"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
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

            <p className="text-[10px] text-slate-400 mb-2">
              Les températures évoluent au fil des jours d'inactivité.
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPauseDialog}
              className="w-full border-slate-600 hover:bg-slate-700 text-slate-200 text-xs h-7.5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3 h-3 text-sky-400" />
              <span>Badger Départ (Pause)</span>
            </Button>
          </div>
        )}
      </div>

      {/* Dialog for choosing reason */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Snowflake className="w-5 h-5 text-sky-600" />
            Mettre en pause le réchauffement
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Vous partez en week-end, en formation ou en congés ?
            Cette action <strong>gèle l'indice thermique</strong> de toutes vos tâches.
            Le temps passé en pause ne sera pas décompté et aucune tâche ne surchauffera à votre insu.
          </p>

          <div className="grid grid-cols-1 gap-2 pt-2">
            {(Object.keys(PAUSE_REASON_LABELS) as PauseReason[]).map(key => {
              const item = PAUSE_REASON_LABELS[key]
              const isSel = selectedReason === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedReason(key)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                    isSel
                      ? "bg-sky-50 border-sky-500 ring-2 ring-sky-200 text-sky-950"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Annuler
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
    </>
  )
}
