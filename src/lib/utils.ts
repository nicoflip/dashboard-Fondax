import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Vérifie si une chaîne de date contient une heure spécifique (non nulle / non 00:00:00Z / non toute la journée).
 */
export function hasSpecificTime(dateStr?: string | null): boolean {
  if (!dateStr) return false
  if (!dateStr.includes('T') && !dateStr.includes(' ')) return false
  // Si le format se termine par T00:00:00 ou T00:00:00+00:00 ou T00:00:00Z -> pas d'heure spécifique
  if (/T00:00:00(\.000)?(\+00:00|Z)?$/i.test(dateStr)) return false
  if (/ 00:00:00$/i.test(dateStr)) return false
  
  const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1]
  if (!timePart) return false
  const [hh, mm] = timePart.split(':')
  return hh !== '00' || (mm !== undefined && mm !== '00' && !mm.startsWith('00'))
}

/**
 * Extrait l'heure sous format HH:mm d'une chaîne de date (si présente et spécifique).
 */
export function extractTimeFromDate(dateStr?: string | null): string {
  if (!dateStr || !hasSpecificTime(dateStr)) return ''
  const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1]
  if (!timePart) return ''
  const parts = timePart.split(':')
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0')
    const mm = parts[1].slice(0, 2).padStart(2, '0')
    return `${hh}:${mm}`
  }
  return ''
}

/**
 * Combine une date (YYYY-MM-DD) et une heure optionnelle (HH:mm) en format compatible SQL/Supabase.
 */
export function combineDateAndTime(dateStr: string, timeStr?: string | null): string {
  if (!dateStr) return ''
  const baseDate = dateStr.split('T')[0]
  if (!timeStr || !timeStr.trim()) {
    return baseDate
  }
  const cleanTime = timeStr.trim()
  return `${baseDate}T${cleanTime.length === 5 ? cleanTime + ':00' : cleanTime}`
}

/**
 * Formate une heure au format convivial français (ex: 14h30 ou 09h00).
 */
export function formatTimeDisplay(timeStrOrDate: string | Date): string {
  if (typeof timeStrOrDate === 'string' && timeStrOrDate.includes(':') && !timeStrOrDate.includes('-') && !timeStrOrDate.includes('T')) {
    const [h, m] = timeStrOrDate.split(':')
    return `${parseInt(h, 10)}h${m || '00'}`
  }
  const d = new Date(timeStrOrDate)
  if (isNaN(d.getTime())) return ''
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}h${minutes}`
}

/**
 * Formate un événement pour afficher sa date et éventuellement son heure si renseignée.
 */
export function formatEventDateTime(dateStr: string, endDateStr?: string | null): string {
  if (!dateStr) return ''
  const dateFormatted = formatDate(dateStr)
  const time = extractTimeFromDate(dateStr)
  if (time) {
    const [h, m] = time.split(':')
    const timeFormatted = `${parseInt(h, 10)}h${m}`
    const endTime = extractTimeFromDate(endDateStr)
    if (endTime && endDateStr?.split('T')[0] === dateStr.split('T')[0]) {
      const [endH, endM] = endTime.split(':')
      return `${dateFormatted} de ${timeFormatted} à ${parseInt(endH, 10)}h${endM}`
    }
    return `${dateFormatted} à ${timeFormatted}`
  }
  return dateFormatted
}

export const TASK_CATEGORIES = [
  'Sécurité',
  'Réseau',
  'Stockage-SharePoint',
  'Cahier des charges',
  'Prestataires',
  'Matériel',
  'Bureautique',
  'Support Utilisateur',
  'Autre',
] as const

export const TASK_STATUSES = [
  'à faire',
  'en cours',
  'en attente de retour externe',
  'fait',
] as const

export const TASK_PRIORITIES = ['haute', 'moyenne', 'basse'] as const

export const EVENT_TYPES = ['rdv', 'appel', 'échéance', 'étape chantier'] as const

export const EVENT_STATUSES = ['à venir', 'en attente', 'clos', 'passé'] as const

export const PRIORITY_COLORS: Record<string, string> = {
  haute: 'bg-red-100 text-red-800 border-red-200',
  moyenne: 'bg-amber-100 text-amber-800 border-amber-200',
  basse: 'bg-blue-100 text-blue-800 border-blue-200',
}

export const STATUS_COLORS: Record<string, string> = {
  'à faire': 'bg-slate-100 text-slate-700 border-slate-200',
  'en cours': 'bg-blue-100 text-blue-800 border-blue-200',
  'en attente de retour externe': 'bg-amber-100 text-amber-800 border-amber-200',
  fait: 'bg-green-100 text-green-800 border-green-200',
}

export const VENDOR_ISSUE_STATUS_COLORS: Record<string, string> = {
  'en attente': 'bg-amber-100 text-amber-800 border-amber-200',
  résolu: 'bg-green-100 text-green-800 border-green-200',
  'non résolu': 'bg-red-100 text-red-800 border-red-200',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  'À FAIRE': 'bg-slate-100 text-slate-700 border-slate-200',
  'EN COURS': 'bg-blue-100 text-blue-800 border-blue-200',
  'EN ATTENTE': 'bg-amber-100 text-amber-800 border-amber-200',
  TERMINÉ: 'bg-green-100 text-green-800 border-green-200',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  rdv: 'Rendez-vous',
  appel: 'Appel',
  échéance: 'Échéance',
  'étape chantier': 'Étape chantier',
}

export const TASK_CATEGORY_COLORS: Record<string, string> = {
  'Sécurité': 'bg-red-50 text-red-700 border-red-200',
  'Réseau': 'bg-blue-50 text-blue-700 border-blue-200',
  'Stockage-SharePoint': 'bg-sky-50 text-sky-700 border-sky-200',
  'Cahier des charges': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Prestataires': 'bg-amber-50 text-amber-700 border-amber-200',
  'Matériel': 'bg-orange-50 text-orange-700 border-orange-200',
  'Bureautique': 'bg-teal-50 text-teal-700 border-teal-200',
  'Support Utilisateur': 'bg-violet-50 text-violet-700 border-violet-200',
  'Autre': 'bg-slate-50 text-slate-700 border-slate-200',
}

