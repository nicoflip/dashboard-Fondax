'use client'

import React, { useState } from 'react'
import { useTaskThermostat, PAUSE_REASON_LABELS, PauseReason } from '@/lib/task-thermostat'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Flame, Snowflake, Play, Pause, Clock } from 'lucide-react'
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
    resume
  } = useTaskThermostat()
  
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

  const renderDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900">
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600">
            <Pause className="w-5 h-5" />
          </div>
          <span>Badger un départ (Mise en pause)</span>
        </DialogTitle>
      </DialogHeader>

      <div className="p-4 space-y-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          Gèle l&apos;indice thermique de toutes vos tâches. Le temps passé en pause ne sera pas décompté de leur inactivité.
        </p>

        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-slate-800 block">
            Motif de l&apos;absence :
          </label>

          <div className="grid grid-cols-1 gap-2">
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
                      ? "bg-sky-50 border-sky-500 ring-2 ring-sky-200 text-sky-950 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <button
          type="button"
          onClick={() => setDialogOpen(false)}
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirmPause}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Geler les températures</span>
        </button>
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
            title="Réchauffement actif. Cliquez pour mettre en pause."
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer",
              className
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>En poste</span>
          </button>
        )}

        {renderDialog()}
      </>
    )
  }

  // 2. Sidebar variant (styled card in desktop sidebar)
  return (
    <>
      <div className={cn("px-3 py-2", className)}>
        {isPaused ? (
          /* PAUSED CARD */
          <div className="bg-sky-950/70 border border-sky-600/50 rounded-xl p-3 text-sky-100 shadow-inner">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-300">
                <Snowflake className="w-4 h-4 text-sky-400 animate-spin-slow" />
                <span>Réchauffement en Pause</span>
              </div>
              <span className="text-base">{activeReasonInfo?.icon || '❄️'}</span>
            </div>

            <div className="text-[11px] text-sky-200/90 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Figé depuis {pausedSinceText}</span>
            </div>

            <button
              type="button"
              onClick={handleQuickResume}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-xs shadow-sm transition-all duration-150 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Badger l&apos;Arrivée (Reprendre)</span>
            </button>
          </div>
        ) : (
          /* ACTIVE CARD */
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>En poste • Thermostat actif</span>
              </div>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
              Évolution thermique selon l&apos;inactivité.
            </p>

            <button
              type="button"
              onClick={handleOpenPauseDialog}
              className="w-full group flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-650 active:bg-slate-600 text-white border border-slate-600 hover:border-sky-500/50 shadow-xs transition-all duration-150 cursor-pointer font-medium text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-sky-500/15 text-sky-400 group-hover:bg-sky-500/25 transition-colors">
                <Pause className="w-3.5 h-3.5" />
              </span>
              <span className="text-slate-100 group-hover:text-white font-semibold">Badger un départ (Pause)</span>
            </button>
          </div>
        )}
      </div>

      {renderDialog()}
    </>
  )
}
