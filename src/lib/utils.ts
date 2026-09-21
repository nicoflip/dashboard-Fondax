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

export interface TaskCategoryTheme {
  bg: string
  border: string
  badge: string
  pillBg: string
  pillSelected: string
  iconBg: string
  accentColor: string
  emoji: string
  pillStyle: {
    backgroundColor: string
    borderColor: string
    color: string
  }
  pillSelectedStyle: {
    backgroundColor: string
    borderColor: string
    color: string
  }
  counterStyle: {
    backgroundColor: string
    color: string
  }
  counterSelectedStyle: {
    backgroundColor: string
    color: string
  }
  cardStyle: {
    backgroundColor: string
    borderColor: string
    borderLeftColor: string
  }
  badgeStyle: {
    backgroundColor: string
    borderColor: string
    color: string
  }
}

export const TASK_CATEGORY_THEMES: Record<string, TaskCategoryTheme> = {
  'Sécurité': {
    bg: 'bg-rose-100/90',
    border: 'border-l-[6px] border-l-rose-600 border-rose-300 shadow-xs hover:shadow-md hover:border-rose-400',
    badge: 'bg-rose-600 text-white font-bold border-rose-700 shadow-2xs',
    pillBg: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
    pillSelected: 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/50',
    iconBg: 'bg-rose-600 text-white',
    accentColor: 'text-rose-900',
    emoji: '🛡️',
    pillStyle: {
      backgroundColor: '#ffe4e6',
      borderColor: '#fda4af',
      color: '#9f1239',
    },
    pillSelectedStyle: {
      backgroundColor: '#e11d48',
      borderColor: '#be123c',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#fecdd3',
      color: '#881337',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#ffe4e6',
      borderColor: '#fda4af',
      borderLeftColor: '#e11d48',
    },
    badgeStyle: {
      backgroundColor: '#e11d48',
      borderColor: '#be123c',
      color: '#ffffff',
    },
  },
  'Réseau': {
    bg: 'bg-sky-100/90',
    border: 'border-l-[6px] border-l-sky-600 border-sky-300 shadow-xs hover:shadow-md hover:border-sky-400',
    badge: 'bg-sky-600 text-white font-bold border-sky-700 shadow-2xs',
    pillBg: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
    pillSelected: 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-400/50',
    iconBg: 'bg-sky-600 text-white',
    accentColor: 'text-sky-900',
    emoji: '🌐',
    pillStyle: {
      backgroundColor: '#e0f2fe',
      borderColor: '#7dd3fc',
      color: '#0369a1',
    },
    pillSelectedStyle: {
      backgroundColor: '#0284c7',
      borderColor: '#0369a1',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#bae6fd',
      color: '#0c4a6e',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#e0f2fe',
      borderColor: '#7dd3fc',
      borderLeftColor: '#0284c7',
    },
    badgeStyle: {
      backgroundColor: '#0284c7',
      borderColor: '#0369a1',
      color: '#ffffff',
    },
  },
  'Stockage-SharePoint': {
    bg: 'bg-emerald-100/90',
    border: 'border-l-[6px] border-l-emerald-600 border-emerald-300 shadow-xs hover:shadow-md hover:border-emerald-400',
    badge: 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs',
    pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
    pillSelected: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/50',
    iconBg: 'bg-emerald-600 text-white',
    accentColor: 'text-emerald-900',
    emoji: '📂',
    pillStyle: {
      backgroundColor: '#d1fae5',
      borderColor: '#6ee7b7',
      color: '#047857',
    },
    pillSelectedStyle: {
      backgroundColor: '#059669',
      borderColor: '#047857',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#a7f3d0',
      color: '#064e3b',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#d1fae5',
      borderColor: '#6ee7b7',
      borderLeftColor: '#059669',
    },
    badgeStyle: {
      backgroundColor: '#059669',
      borderColor: '#047857',
      color: '#ffffff',
    },
  },
  'Cahier des charges': {
    bg: 'bg-indigo-100/90',
    border: 'border-l-[6px] border-l-indigo-600 border-indigo-300 shadow-xs hover:shadow-md hover:border-indigo-400',
    badge: 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-2xs',
    pillBg: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200',
    pillSelected: 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400/50',
    iconBg: 'bg-indigo-600 text-white',
    accentColor: 'text-indigo-900',
    emoji: '📋',
    pillStyle: {
      backgroundColor: '#e0e7ff',
      borderColor: '#a5b4fc',
      color: '#4338ca',
    },
    pillSelectedStyle: {
      backgroundColor: '#4f46e5',
      borderColor: '#4338ca',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#c7d2fe',
      color: '#312e81',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#e0e7ff',
      borderColor: '#a5b4fc',
      borderLeftColor: '#4f46e5',
    },
    badgeStyle: {
      backgroundColor: '#4f46e5',
      borderColor: '#4338ca',
      color: '#ffffff',
    },
  },
  'Prestataires': {
    bg: 'bg-amber-100/90',
    border: 'border-l-[6px] border-l-amber-600 border-amber-300 shadow-xs hover:shadow-md hover:border-amber-400',
    badge: 'bg-amber-600 text-white font-bold border-amber-700 shadow-2xs',
    pillBg: 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200',
    pillSelected: 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/50',
    iconBg: 'bg-amber-600 text-white',
    accentColor: 'text-amber-950',
    emoji: '🤝',
    pillStyle: {
      backgroundColor: '#fef3c7',
      borderColor: '#fcd34d',
      color: '#b45309',
    },
    pillSelectedStyle: {
      backgroundColor: '#d97706',
      borderColor: '#b45309',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#fde68a',
      color: '#78350f',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#fef3c7',
      borderColor: '#fcd34d',
      borderLeftColor: '#d97706',
    },
    badgeStyle: {
      backgroundColor: '#d97706',
      borderColor: '#b45309',
      color: '#ffffff',
    },
  },
  'Matériel': {
    bg: 'bg-orange-100/90',
    border: 'border-l-[6px] border-l-orange-600 border-orange-300 shadow-xs hover:shadow-md hover:border-orange-400',
    badge: 'bg-orange-600 text-white font-bold border-orange-700 shadow-2xs',
    pillBg: 'bg-orange-100 text-orange-950 border-orange-300 hover:bg-orange-200',
    pillSelected: 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-400/50',
    iconBg: 'bg-orange-600 text-white',
    accentColor: 'text-orange-950',
    emoji: '🖥️',
    pillStyle: {
      backgroundColor: '#ffedd5',
      borderColor: '#fdba74',
      color: '#c2410c',
    },
    pillSelectedStyle: {
      backgroundColor: '#ea580c',
      borderColor: '#c2410c',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#fed7aa',
      color: '#7c2d12',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#ffedd5',
      borderColor: '#fdba74',
      borderLeftColor: '#ea580c',
    },
    badgeStyle: {
      backgroundColor: '#ea580c',
      borderColor: '#c2410c',
      color: '#ffffff',
    },
  },
  'Bureautique': {
    bg: 'bg-teal-100/90',
    border: 'border-l-[6px] border-l-teal-600 border-teal-300 shadow-xs hover:shadow-md hover:border-teal-400',
    badge: 'bg-teal-600 text-white font-bold border-teal-700 shadow-2xs',
    pillBg: 'bg-teal-100 text-teal-950 border-teal-300 hover:bg-teal-200',
    pillSelected: 'bg-teal-600 text-white border-teal-700 ring-2 ring-teal-400/50',
    iconBg: 'bg-teal-600 text-white',
    accentColor: 'text-teal-950',
    emoji: '💼',
    pillStyle: {
      backgroundColor: '#ccfbf1',
      borderColor: '#5eead4',
      color: '#0f766e',
    },
    pillSelectedStyle: {
      backgroundColor: '#0d9488',
      borderColor: '#0f766e',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#99f6e4',
      color: '#134e4a',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#ccfbf1',
      borderColor: '#5eead4',
      borderLeftColor: '#0d9488',
    },
    badgeStyle: {
      backgroundColor: '#0d9488',
      borderColor: '#0f766e',
      color: '#ffffff',
    },
  },
  'Support Utilisateur': {
    bg: 'bg-purple-100/90',
    border: 'border-l-[6px] border-l-purple-600 border-purple-300 shadow-xs hover:shadow-md hover:border-purple-400',
    badge: 'bg-purple-600 text-white font-bold border-purple-700 shadow-2xs',
    pillBg: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
    pillSelected: 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400/50',
    iconBg: 'bg-purple-600 text-white',
    accentColor: 'text-purple-950',
    emoji: '🎧',
    pillStyle: {
      backgroundColor: '#f3e8ff',
      borderColor: '#d8b4fe',
      color: '#7e22ce',
    },
    pillSelectedStyle: {
      backgroundColor: '#9333ea',
      borderColor: '#7e22ce',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#e9d5ff',
      color: '#581c87',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#f3e8ff',
      borderColor: '#d8b4fe',
      borderLeftColor: '#9333ea',
    },
    badgeStyle: {
      backgroundColor: '#9333ea',
      borderColor: '#7e22ce',
      color: '#ffffff',
    },
  },
  'Autre': {
    bg: 'bg-fuchsia-100/90',
    border: 'border-l-[6px] border-l-fuchsia-600 border-fuchsia-300 shadow-xs hover:shadow-md hover:border-fuchsia-400',
    badge: 'bg-fuchsia-600 text-white font-bold border-fuchsia-700 shadow-2xs',
    pillBg: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300 hover:bg-fuchsia-200',
    pillSelected: 'bg-fuchsia-600 text-white border-fuchsia-700 ring-2 ring-fuchsia-400/50',
    iconBg: 'bg-fuchsia-600 text-white',
    accentColor: 'text-fuchsia-950',
    emoji: '📌',
    pillStyle: {
      backgroundColor: '#fae8ff',
      borderColor: '#f0abfc',
      color: '#a21caf',
    },
    pillSelectedStyle: {
      backgroundColor: '#c026d3',
      borderColor: '#a21caf',
      color: '#ffffff',
    },
    counterStyle: {
      backgroundColor: '#f5d0fe',
      color: '#701a75',
    },
    counterSelectedStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    cardStyle: {
      backgroundColor: '#fae8ff',
      borderColor: '#f0abfc',
      borderLeftColor: '#c026d3',
    },
    badgeStyle: {
      backgroundColor: '#c026d3',
      borderColor: '#a21caf',
      color: '#ffffff',
    },
  },
}

export function normalizeTaskCategory(category: string | null | undefined): (typeof TASK_CATEGORIES)[number] {
  if (!category) return 'Autre'
  const trimmed = category.trim()
  const clean = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (clean.includes('support') || clean.includes('utilisateur') || clean.includes('user') || clean.includes('ticket') || clean.includes('helpdesk')) {
    return 'Support Utilisateur'
  }
  if (clean.includes('securit') || clean.includes('cyber') || clean.includes('firewall') || clean.includes('antivirus')) {
    return 'Sécurité'
  }
  if (clean.includes('prestataire') || clean.includes('fournisseur') || clean.includes('vendor')) {
    return 'Prestataires'
  }
  if (clean.includes('cahier') || clean.includes('charge') || clean.includes('cdc')) {
    return 'Cahier des charges'
  }
  if (clean.includes('reseau') || clean.includes('network') || clean.includes('lan') || clean.includes('wifi') || clean.includes('switch')) {
    return 'Réseau'
  }
  if (clean.includes('stockage') || clean.includes('sharepoint') || clean.includes('onedrive') || clean.includes('nas') || clean.includes('cloud')) {
    return 'Stockage-SharePoint'
  }
  if (clean.includes('materiel') || clean.includes('hardware') || clean.includes('pc') || clean.includes('serveur') || clean.includes('imprimante')) {
    return 'Matériel'
  }
  if (clean.includes('bureautique') || clean.includes('office') || clean.includes('365') || clean.includes('excel') || clean.includes('word') || clean.includes('outlook')) {
    return 'Bureautique'
  }

  const found = TASK_CATEGORIES.find(c => {
    const cClean = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return cClean === clean
  })
  if (found) return found

  return 'Autre'
}

export const TASK_CATEGORY_COLORS: Record<string, string> = {
  'Sécurité': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  'Réseau': 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
  'Stockage-SharePoint': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  'Cahier des charges': 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
  'Prestataires': 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
  'Matériel': 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
  'Bureautique': 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
  'Support Utilisateur': 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
  'Autre': 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 font-bold',
}

