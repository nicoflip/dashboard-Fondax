'use client'

import { useState, useEffect, useCallback } from 'react'

export type PauseReason = 'weekend' | 'cours' | 'conges' | 'autre'

export interface PauseInterval {
  id: string
  start: string // ISO string
  end?: string  // ISO string (undefined if currently in pause)
  reason: PauseReason
  customReason?: string
}

export interface ThermostatState {
  isPaused: boolean
  currentPauseStart?: string
  currentPauseReason?: PauseReason
  currentCustomReason?: string
  intervals: PauseInterval[]
}

const STORAGE_KEY = 'fondax_task_thermostat'
const CHANGE_EVENT = 'fondax_thermostat_change'

export const PAUSE_REASON_LABELS: Record<PauseReason, { label: string; icon: string; description: string }> = {
  weekend: {
    label: 'Week-end / Repos',
    icon: '🌴',
    description: 'Pause du jeudi/vendredi soir au lundi matin'
  },
  cours: {
    label: 'En cours / Formation',
    icon: '🎓',
    description: 'Journée en centre de formation / alternance'
  },
  conges: {
    label: 'Congés / RTT',
    icon: '🏖️',
    description: 'Période de congés payés ou absence autorisée'
  },
  autre: {
    label: 'Autre pause',
    icon: '⏸️',
    description: 'Interruption temporaire du suivi'
  }
}

/**
 * Récupère l'état actuel du thermostat depuis le localStorage.
 */
export function getThermostatState(): ThermostatState {
  if (typeof window === 'undefined') {
    return { isPaused: false, intervals: [] }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isPaused: false, intervals: [] }
    const parsed = JSON.parse(raw) as ThermostatState
    return {
      isPaused: Boolean(parsed.isPaused),
      currentPauseStart: parsed.currentPauseStart,
      currentPauseReason: parsed.currentPauseReason,
      currentCustomReason: parsed.currentCustomReason,
      intervals: Array.isArray(parsed.intervals) ? parsed.intervals : []
    }
  } catch (err) {
    console.error('Erreur lecture thermostat localStorage:', err)
    return { isPaused: false, intervals: [] }
  }
}

/**
 * Sauvegarde l'état du thermostat et notifie l'application.
 */
function saveThermostatState(state: ThermostatState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch (err) {
    console.error('Erreur sauvegarde thermostat localStorage:', err)
  }
}

/**
 * Met en pause le réchauffement des tâches (Badger Départ).
 */
export function pauseThermostat(reason: PauseReason = 'weekend', customReason?: string): ThermostatState {
  const current = getThermostatState()
  if (current.isPaused) return current

  const nowIso = new Date().toISOString()
  const next: ThermostatState = {
    ...current,
    isPaused: true,
    currentPauseStart: nowIso,
    currentPauseReason: reason,
    currentCustomReason: customReason
  }

  saveThermostatState(next)
  return next
}

/**
 * Reprend le réchauffement des tâches (Badger Arrivée).
 * Clôture l'intervalle de pause courant et l'ajoute à l'historique pour déduire la durée écoulée.
 */
export function resumeThermostat(): ThermostatState {
  const current = getThermostatState()
  if (!current.isPaused || !current.currentPauseStart) {
    return current
  }

  const nowIso = new Date().toISOString()
  const completedInterval: PauseInterval = {
    id: `pause_${Date.now()}`,
    start: current.currentPauseStart,
    end: nowIso,
    reason: current.currentPauseReason || 'autre',
    customReason: current.currentCustomReason
  }

  const next: ThermostatState = {
    isPaused: false,
    currentPauseStart: undefined,
    currentPauseReason: undefined,
    currentCustomReason: undefined,
    intervals: [...current.intervals, completedInterval]
  }

  saveThermostatState(next)
  return next
}

/**
 * Calcule la durée totale en millisecondes pendant laquelle le thermostat était en pause
 * entre deux dates données (ex: entre la date de mise à jour d'une tâche et maintenant).
 */
export function getPausedDurationBetween(
  intervals: PauseInterval[],
  currentPauseStart: string | undefined,
  startDate: Date,
  endDate: Date
): number {
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()
  if (endMs <= startMs) return 0

  let totalPausedMs = 0

  // 1. Intervalles archivés terminés
  for (const interval of intervals) {
    const intStart = new Date(interval.start).getTime()
    const intEnd = interval.end ? new Date(interval.end).getTime() : endMs

    const overlapStart = Math.max(startMs, intStart)
    const overlapEnd = Math.min(endMs, intEnd)

    if (overlapEnd > overlapStart) {
      totalPausedMs += (overlapEnd - overlapStart)
    }
  }

  // 2. Pause en cours si active
  if (currentPauseStart) {
    const intStart = new Date(currentPauseStart).getTime()
    const overlapStart = Math.max(startMs, intStart)
    const overlapEnd = Math.min(endMs, endMs) // Jusqu'à endDate (souvent `now`)

    if (overlapEnd > overlapStart) {
      totalPausedMs += (overlapEnd - overlapStart)
    }
  }

  return totalPausedMs
}

/**
 * Hook React pour écouter en direct l'état du thermostat dans n'importe quel composant.
 */
export function useTaskThermostat() {
  const [state, setState] = useState<ThermostatState>(() => getThermostatState())

  const refresh = useCallback(() => {
    setState(getThermostatState())
  }, [])

  useEffect(() => {
    // Synchronisation sur le même onglet
    window.addEventListener(CHANGE_EVENT, refresh)
    // Synchronisation entre onglets différents
    window.addEventListener('storage', refresh)

    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  const handlePause = useCallback((reason: PauseReason = 'weekend', customReason?: string) => {
    const updated = pauseThermostat(reason, customReason)
    setState(updated)
  }, [])

  const handleResume = useCallback(() => {
    const updated = resumeThermostat()
    setState(updated)
  }, [])

  return {
    ...state,
    pause: handlePause,
    resume: handleResume,
    refresh
  }
}
