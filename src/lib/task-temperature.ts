import { Task, TaskPriority, TaskStatus } from './types'
import { getThermostatState, getPausedDurationBetween, ThermostatState } from './task-thermostat'

export type TemperatureLevel = 'cold' | 'warm' | 'hot' | 'boiling'

export interface TaskTemperatureInfo {
  score: number // 0 à 100
  level: TemperatureLevel
  daysInactive: number
  hoursInactive: number
  targetDays: number
  label: string
  isPaused?: boolean
  color: {
    bg: string
    text: string
    border: string
    badge: string
    progress: string
  }
}

// Durée en jours avant d'atteindre 100% selon l'enjeu
export const PRIORITY_TARGET_DAYS: Record<TaskPriority, number> = {
  haute: 3,    // Critique : 3 jours sans action = 100%
  moyenne: 10, // Standard : 10 jours sans action = 100%
  basse: 30,   // Fond : 30 jours sans action = 100%
}

/**
 * Calcule l'indice thermique (température / pourcentage d'oubli) d'une tâche.
 * Prend en compte les périodes de pause du thermostat (week-ends, cours, congés).
 * Plus le temps actif passe sans action, plus la température augmente.
 */
export function calculateTaskTemperature(
  task: Task, 
  now: Date = new Date(),
  thermostat?: ThermostatState
): TaskTemperatureInfo {
  // 1. Les tâches terminées sont éteintes
  if (task.status === 'fait') {
    return {
      score: 0,
      level: 'cold',
      daysInactive: 0,
      hoursInactive: 0,
      targetDays: PRIORITY_TARGET_DAYS[task.priority] || 10,
      label: 'Terminée',
      isPaused: false,
      color: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        progress: 'bg-emerald-500'
      }
    }
  }

  // Récupération de l'état du thermostat si non fourni
  const thermo = thermostat || getThermostatState()

  // 2. Calcul du temps brut écoulé depuis la dernière action
  const refDateStr = task.updated_at || task.created_at
  const refDate = new Date(refDateStr)
  const totalElapsedMs = Math.max(0, now.getTime() - refDate.getTime())

  // Déduction des périodes de pause survenues depuis refDate
  const pausedMs = getPausedDurationBetween(
    thermo.intervals,
    thermo.isPaused ? thermo.currentPauseStart : undefined,
    refDate,
    now
  )
  const effectiveActiveMs = Math.max(0, totalElapsedMs - pausedMs)

  const hoursInactive = Math.floor(effectiveActiveMs / (1000 * 60 * 60))
  const daysInactive = parseFloat((effectiveActiveMs / (1000 * 60 * 60 * 24)).toFixed(1))

  // 3. Durée cible selon la priorité
  const targetDays = PRIORITY_TARGET_DAYS[task.priority] || 10

  // 4. Calcul du score brut de 0 à 100%
  let rawScore = Math.min(100, Math.round((daysInactive / targetDays) * 100))

  // 5. Ajustements selon le statut
  if (task.status === 'en cours') {
    // Tâche prise en main : on tempère de 25% car elle n'est pas abandonnée
    rawScore = Math.max(10, Math.round(rawScore * 0.75))
  } else if (task.status === 'en attente de retour externe') {
    // Tâche en attente d'un tiers : mise au frais (température d'action réduite de 50%)
    rawScore = Math.max(5, Math.round(rawScore * 0.5))
  }

  const score = Math.min(100, Math.max(0, rawScore))

  // 6. Détermination du palier thermique
  let level: TemperatureLevel = 'cold'
  let label = 'Frais'
  let color = {
    bg: 'bg-blue-50/50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    progress: 'bg-blue-500'
  }

  if (score >= 90) {
    level = 'boiling'
    label = 'Ébullition'
    color = {
      bg: 'bg-red-50/80',
      text: 'text-red-700',
      border: 'border-red-300',
      badge: 'bg-red-600 text-white border-red-700 shadow-xs',
      progress: 'bg-red-600'
    }
  } else if (score >= 70) {
    level = 'hot'
    label = 'Chaud'
    color = {
      bg: 'bg-orange-50/70',
      text: 'text-orange-800',
      border: 'border-orange-300',
      badge: 'bg-orange-500 text-white border-orange-600 shadow-xs',
      progress: 'bg-orange-500'
    }
  } else if (score >= 40) {
    level = 'warm'
    label = 'Tiède'
    color = {
      bg: 'bg-amber-50/50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      progress: 'bg-amber-500'
    }
  }

  return {
    score,
    level,
    daysInactive,
    hoursInactive,
    targetDays,
    label,
    isPaused: thermo.isPaused,
    color
  }
}

/**
 * Formate le temps d'inactivité de façon lisible pour le terrain.
 */
export function formatInactiveTime(daysInactive: number, hoursInactive: number, isPaused?: boolean): string {
  const pauseSuffix = isPaused ? ' (figé)' : ''
  if (hoursInactive < 1) return `À l'instant${pauseSuffix}`
  if (hoursInactive < 24) return `Sans action depuis ${hoursInactive}h${pauseSuffix}`
  if (daysInactive === 1) return `Sans action depuis 1 jour${pauseSuffix}`
  return `Sans action depuis ${Math.floor(daysInactive)} jours${pauseSuffix}`
}

/**
 * Calcule la date `updated_at` nécessaire pour positionner une tâche à un pourcentage de température donné.
 * @param task La tâche cible
 * @param targetScore Le pourcentage souhaité (0 à 100)
 * @param now La date de référence (par défaut `new Date()`)
 * @returns La chaîne ISO de la nouvelle date `updated_at`
 */
export function calculateUpdatedAtForScore(
  task: Task, 
  targetScore: number, 
  now: Date = new Date()
): string {
  const boundedScore = Math.min(100, Math.max(0, targetScore))
  const targetDays = PRIORITY_TARGET_DAYS[task.priority] || 10

  // Si la tâche a des multiplicateurs selon son statut, inverser le multiplicateur
  let rawScore = boundedScore
  if (task.status === 'en cours') {
    // rawScore * 0.75 = score => rawScore = score / 0.75
    rawScore = Math.min(100, boundedScore / 0.75)
  } else if (task.status === 'en attente de retour externe') {
    // rawScore * 0.5 = score => rawScore = score / 0.5
    rawScore = Math.min(100, boundedScore / 0.5)
  }

  // daysInactive = (rawScore / 100) * targetDays
  const daysInactive = (rawScore / 100) * targetDays
  const msInactive = daysInactive * 24 * 60 * 60 * 1000

  const targetDate = new Date(now.getTime() - msInactive)
  return targetDate.toISOString()
}
