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

export const EVENT_STATUSES = ['passé', 'à venir', 'en attente'] as const

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

