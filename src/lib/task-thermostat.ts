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

export const CATCHUP_15D_INTERVAL_ID = 'pause_rattrapage_15j'

export const DEFAULT_CATCHUP_INTERVAL: PauseInterval = {
  id: CATCHUP_15D_INTERVAL_ID,
  start: '2026-09-27T08:00:00.000Z',
  end: '2026-10-12T08:00:00.000Z',
  reason: 'autre',
  customReason: 'Rattrapage pause 15 jours (recul des températures)'
}

/**
 * Récupère l'état actuel du thermostat depuis le localStorage.
 * Intègre automatiquement l'intervalle de rattrapage de 15 jours pour compenser l'absence.
 */
export function getThermostatState(): ThermostatState {
  if (typeof window === 'undefined') {
    return { isPaused: false, intervals: [DEFAULT_CATCHUP_INTERVAL] }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial: ThermostatState = { isPaused: false, intervals: [DEFAULT_CATCHUP_INTERVAL] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      } catch (err) {}
      return initial
    }

    const parsed = JSON.parse(raw) as ThermostatState
    const intervals = Array.isArray(parsed.intervals) ? [...parsed.intervals] : []

    // Si le rattrapage des 15 jours n'est pas encore présent, l'ajouter automatiquement
    if (!intervals.some(i => i.id === CATCHUP_15D_INTERVAL_ID)) {
      intervals.push(DEFAULT_CATCHUP_INTERVAL)
      const updated: ThermostatState = {
        isPaused: Boolean(parsed.isPaused),
        currentPauseStart: parsed.currentPauseStart,
        currentPauseReason: parsed.currentPauseReason,
        currentCustomReason: parsed.currentCustomReason,
        intervals
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (err) {}
      return updated
    }

    return {
      isPaused: Boolean(parsed.isPaused),
      currentPauseStart: parsed.currentPauseStart,
      currentPauseReason: parsed.currentPauseReason,
      currentCustomReason: parsed.currentCustomReason,
      intervals
    }
  } catch (err) {
    console.error('Erreur lecture thermostat localStorage:', err)
    return { isPaused: false, intervals: [DEFAULT_CATCHUP_INTERVAL] }
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
 * Décale manuellement les températures de N jours en arrière (ajoute un intervalle de pause de N jours).
 */
export function rollbackThermostatDays(days: number = 15, customReason?: string): ThermostatState {
  const current = getThermostatState()
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const newInterval: PauseInterval = {
    id: `rollback_${days}d_${Date.now()}`,
    start: start.toISOString(),
    end: now.toISOString(),
    reason: 'autre',
    customReason: customReason || `Rattrapage -${days} jours`
  }

  const next: ThermostatState = {
    ...current,
    intervals: [...current.intervals, newInterval]
  }

  saveThermostatState(next)
  return next
}

/**
 * Supprime l'intervalle de rattrapage de 15 jours si l'utilisateur souhaite le retirer.
 */
export function removeCatchupInterval(): ThermostatState {
  const current = getThermostatState()
  const next: ThermostatState = {
    ...current,
    intervals: current.intervals.filter(i => i.id !== CATCHUP_15D_INTERVAL_ID && !i.id.startsWith('rollback_'))
  }
  saveThermostatState(next)
  return next
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
    // 1. Synchronisation immédiate dès le montage côté client pour éviter tout décalage d'hydratation SSR
    refresh()

    // 2. Synchronisation sur le même onglet
    window.addEventListener(CHANGE_EVENT, refresh)
    // 3. Synchronisation entre onglets différents
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

  const handleRollbackDays = useCallback((days: number = 15, customReason?: string) => {
    const updated = rollbackThermostatDays(days, customReason)
    setState(updated)
  }, [])

  const handleRemoveCatchup = useCallback(() => {
    const updated = removeCatchupInterval()
    setState(updated)
  }, [])

  const hasCatchup15d = state.intervals.some(i => i.id === CATCHUP_15D_INTERVAL_ID || i.id.startsWith('rollback_'))

  return {
    ...state,
    hasCatchup15d,
    pause: handlePause,
    resume: handleResume,
    rollbackDays: handleRollbackDays,
    removeCatchup: handleRemoveCatchup,
    refresh
  }
}
