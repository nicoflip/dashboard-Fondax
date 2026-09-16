import { Task } from './types'

export interface WaitingConfig {
  waitingOn: string // Qui / Quoi (ex: "Prestataire SFR", "Directeur", "Validation devis")
  followUpDate?: string // YYYY-MM-DD
  sinceDate?: string // YYYY-MM-DD
  followUpCount?: number // Nombre de relances déjà effectuées
}

export interface WaitingInfo {
  isConfigured: boolean // True si une balise [waiting:...] explicite est présente
  waitingOn: string
  followUpDate: string | null
  sinceDate: string
  followUpCount: number
  cleanDescription: string
}

export type FollowUpStatus = 'overdue' | 'today' | 'upcoming' | 'none'

export interface WaitingMetrics {
  daysWaiting: number
  isDragging: boolean // >= 7 jours sans retour
  isWarning: boolean // 4 à 6 jours
  followUpStatus: FollowUpStatus
  daysDiffFollowUp: number | null // négatif = en retard, 0 = aujourd'hui, positif = dans X jours
  formattedFollowUpDate: string | null
  formattedSinceDate: string
}

/**
 * Regex pour capturer la balise [waiting:...] n'importe où dans la description
 * Format: [waiting:who=...;followup=...;since=...;count=...]
 */
const WAITING_REGEX = /\[waiting:([^\]]+)\]/i

/**
 * Extrait les informations d'attente d'une tâche à partir de sa description et de ses dates.
 */
export function parseWaitingInfo(
  desc?: string | null,
  updatedAt?: string,
  createdAt?: string
): WaitingInfo {
  const fallbackSince = (updatedAt || createdAt || new Date().toISOString()).split('T')[0]

  if (!desc) {
    return {
      isConfigured: false,
      waitingOn: '',
      followUpDate: null,
      sinceDate: fallbackSince,
      followUpCount: 0,
      cleanDescription: '',
    }
  }

  const match = desc.match(WAITING_REGEX)
  if (!match) {
    return {
      isConfigured: false,
      waitingOn: '',
      followUpDate: null,
      sinceDate: fallbackSince,
      followUpCount: 0,
      cleanDescription: desc,
    }
  }

  const rawParams = match[1]
  const cleanDescription = desc.replace(match[0], '').trim()

  const params: Record<string, string> = {}
  rawParams.split(';').forEach((part) => {
    const eqIdx = part.indexOf('=')
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim().toLowerCase()
      const val = part.slice(eqIdx + 1).trim()
      params[key] = val
    }
  })

  return {
    isConfigured: true,
    waitingOn: params.who || '',
    followUpDate: params.followup || null,
    sinceDate: params.since || fallbackSince,
    followUpCount: params.count ? parseInt(params.count, 10) || 0 : 0,
    cleanDescription,
  }
}

/**
 * Formate la description en y intégrant ou mettant à jour la balise [waiting:...]
 */
export function formatTaskDescriptionWithWaiting(
  currentDesc: string | null | undefined,
  config: WaitingConfig
): string {
  // Retirer l'éventuelle balise existante
  const baseDesc = (currentDesc || '').replace(WAITING_REGEX, '').trim()

  const who = (config.waitingOn || '').trim().replace(/;/g, ',')
  const followup = (config.followUpDate || '').trim()
  const since = (config.sinceDate || new Date().toISOString().split('T')[0]).trim()
  const count = config.followUpCount || 0

  if (!who && !followup) {
    return baseDesc
  }

  const parts = [
    `who=${who}`,
    followup ? `followup=${followup}` : null,
    `since=${since}`,
    count > 0 ? `count=${count}` : null,
  ].filter(Boolean)

  const waitingTag = `[waiting:${parts.join(';')}]`

  return baseDesc ? `${waitingTag}\n${baseDesc}` : waitingTag
}

/**
 * Retire la balise [waiting:...] de la description (par exemple si la tâche repasse en cours)
 */
export function removeWaitingTag(desc?: string | null): string {
  if (!desc) return ''
  return desc.replace(WAITING_REGEX, '').trim()
}

/**
 * Calcule les indicateurs temporels de l'attente (ce qui traîne, quand relancer).
 */
export function getWaitingMetrics(
  info: WaitingInfo,
  now: Date = new Date()
): WaitingMetrics {
  const todayStr = now.toISOString().split('T')[0]
  const today = new Date(todayStr + 'T00:00:00')

  // Calcul du nombre de jours passés en attente
  const sinceDateObj = new Date(info.sinceDate + 'T00:00:00')
  const timeDiffSince = today.getTime() - sinceDateObj.getTime()
  const daysWaiting = Math.max(0, Math.floor(timeDiffSince / (1000 * 60 * 60 * 24)))

  const isDragging = daysWaiting >= 7 // Traîne depuis 7 jours ou plus
  const isWarning = daysWaiting >= 4 && daysWaiting < 7

  // Calcul de l'état de la relance
  let followUpStatus: FollowUpStatus = 'none'
  let daysDiffFollowUp: number | null = null
  let formattedFollowUpDate: string | null = null

  if (info.followUpDate) {
    const followUpDateObj = new Date(info.followUpDate + 'T00:00:00')
    const timeDiffFollowUp = followUpDateObj.getTime() - today.getTime()
    daysDiffFollowUp = Math.round(timeDiffFollowUp / (1000 * 60 * 60 * 24))

    formattedFollowUpDate = followUpDateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })

    if (daysDiffFollowUp < 0) {
      followUpStatus = 'overdue'
    } else if (daysDiffFollowUp === 0) {
      followUpStatus = 'today'
    } else {
      followUpStatus = 'upcoming'
    }
  }

  const sinceDateFormatted = sinceDateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return {
    daysWaiting,
    isDragging,
    isWarning,
    followUpStatus,
    daysDiffFollowUp,
    formattedFollowUpDate,
    formattedSinceDate: sinceDateFormatted,
  }
}

/**
 * Helper rapide pour obtenir l'info et les métriques d'une tâche
 */
export function getTaskWaitingDetails(task: Task) {
  const info = parseWaitingInfo(task.description, task.updated_at, task.created_at)
  const metrics = getWaitingMetrics(info)
  return { info, metrics }
}
