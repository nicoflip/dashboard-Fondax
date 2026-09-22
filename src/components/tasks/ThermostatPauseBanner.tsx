'use client'

import React from 'react'
import { useTaskThermostat, PAUSE_REASON_LABELS } from '@/lib/task-thermostat'
import { Button } from '@/components/ui/button'
import { Snowflake, Play } from 'lucide-react'

export function ThermostatPauseBanner() {
  const { isPaused, currentPauseStart, currentPauseReason, resume } = useTaskThermostat()

  if (!isPaused) return null

  const reasonInfo = currentPauseReason ? PAUSE_REASON_LABELS[currentPauseReason] : null

  const pausedDateText = currentPauseStart ? (() => {
    const d = new Date(currentPauseStart)
    const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${day} à ${time}`
  })() : ''

  return (
    <div className="bg-sky-50 border border-sky-300/80 rounded-xl p-3 sm:p-4 text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-sky-500 text-white rounded-lg shrink-0 shadow-xs">
          <Snowflake className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-sky-950">
              Réchauffement climatique en pause {reasonInfo?.icon}
            </span>
            <span className="text-xs bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-full font-semibold">
              {reasonInfo?.label || 'Pause'}
            </span>
          </div>
          <p className="text-xs text-sky-800 mt-0.5">
            Températures des tâches figées depuis le <strong>{pausedDateText}</strong>. Le temps passé en pause n'est pas décompté.
          </p>
        </div>
      </div>

      <Button
        onClick={resume}
        className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 px-3.5 shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Badger l'Arrivée (Reprendre)</span>
      </Button>
    </div>
  )
}
